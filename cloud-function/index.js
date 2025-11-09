const { google } = require('googleapis');
const cors = require('cors')({origin: true});
const { GoogleAuth } = require('google-auth-library');

// --- Configuration ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SECRET_API_KEY = process.env.SECRET_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL;
const KEY_FILE_PATH = process.env.KEY_FILE_PATH;
// --- End Configuration ---

const auth = new GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// Main router function (Unchanged)
exports.shoppingListApi = (req, res) => {
    cors(req, res, async () => {
        if (!SPREADSHEET_ID || !SECRET_API_KEY || !GEMINI_API_KEY || !GEMINI_MODEL || !KEY_FILE_PATH) {
            console.error("One or more required environment variables are not set.");
            return res.status(500).send({ error: "Server configuration error." });
        }
        if (req.headers['x-api-key'] !== SECRET_API_KEY) {
            return res.status(401).send({ error: "Unauthorized" });
        }
        if (req.method === 'GET') {
            const listType = req.query.list || 'items';
            if (listType === 'menu') {
                await getMenuAndIngredients(req, res);
            } else {
                await getShoppingListItems(req, res);
            }
        } else if (req.method === 'POST') {
            await addOrUpdateShoppingListItem(req, res);
        } else {
            res.status(405).send('Method Not Allowed');
        }
    });
};

// --- Menu & Ingredients Function (with Ingredient Source Tracking) ---
async function getMenuAndIngredients(req, res) {
    try {
        const sheets = await getSheetsClient();
        const [menuResponse, shoppingListResponse, recipesResponse] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Menu!A2:C9' }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Groceries!A3:B' }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Recipes!A2:B' })
        ]);

        const menuRows = menuResponse.data.values || [];
        const menu = menuRows.map(row => ({ day: row[0], main: row[1] || '', side: row[2] || '' }));
        const dishes = menu.flatMap(day => [day.main, day.side]).filter(dish => dish);
        const recipeRows = recipesResponse.data.values || [];
        const recipeMap = new Map(recipeRows.map(([name, ingredients]) => [name.toLowerCase(), ingredients]));
        
        const ingredientToDishesMap = new Map();
        let dishesForAI = [];

        // 1. Check for recipes first and populate the map
        dishes.forEach(dish => {
            const recipeIngredients = recipeMap.get(dish.toLowerCase());
            if (recipeIngredients) {
                recipeIngredients.split(',').forEach(ingName => {
                    const trimmedName = ingName.trim();
                    if (!ingredientToDishesMap.has(trimmedName)) {
                        ingredientToDishesMap.set(trimmedName, new Set());
                    }
                    ingredientToDishesMap.get(trimmedName).add(dish);
                });
            } else {
                dishesForAI.push(dish);
            }
        });

        // 2. If any dishes weren't in our recipe book, ask the AI for structured data
        if (dishesForAI.length > 0) {
            const prompt = `For each of the following meals, generate a list of grocery ingredients. Respond ONLY with a valid JSON object where each key is a meal name and the value is an array of its ingredients. Do not include salt, pepper, water, or oil. Meals: ${dishesForAI.join(', ')}`;
            const geminiUrl = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
            const requestBody = { "contents": [{ "parts": [{ "text": prompt }] }] };

            const geminiResponse = await fetch(geminiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });

            if (geminiResponse.ok) {
                const aiData = await geminiResponse.json();
                const aiTextResponse = aiData.candidates[0]?.content?.parts[0]?.text || '{}';
                
                // Clean the response to ensure it's valid JSON
                const jsonString = aiTextResponse.replace(/```json/g, '').replace(/```/g, '').trim();
                const aiIngredientsByDish = JSON.parse(jsonString);

                for (const [dish, ingredients] of Object.entries(aiIngredientsByDish)) {
                    ingredients.forEach(ingName => {
                        const trimmedName = ingName.trim();
                        if (!ingredientToDishesMap.has(trimmedName)) {
                            ingredientToDishesMap.set(trimmedName, new Set());
                        }
                        ingredientToDishesMap.get(trimmedName).add(dish);
                    });
                }
            } else {
                console.error("Gemini API Error:", await geminiResponse.json());
            }
        }

        // 3. Cross-reference the final combined list with our shopping list
        const shoppingListItems = shoppingListResponse.data.values || [];
        const shoppingListStatusMap = new Map(shoppingListItems.map(([name, status]) => [name.toLowerCase(), status]));
        const finalIngredients = [];
        for (const [name, sourcesSet] of ingredientToDishesMap.entries()) {
            if (!name) continue;
            const nameLower = name.toLowerCase();
            let foundStatus = shoppingListStatusMap.get(nameLower);
            if (!foundStatus) {
                foundStatus = nameLower.endsWith('s')
                    ? shoppingListStatusMap.get(nameLower.slice(0, -1))
                    : shoppingListStatusMap.get(nameLower + 's');
            }
            finalIngredients.push({
                name: name,
                status: foundStatus || 'Unknown',
                sources: Array.from(sourcesSet) // Convert Set to Array for JSON
            });
        }

        res.status(200).json({ menu, ingredients: finalIngredients });
    } catch (error) {
        console.error('ERROR fetching menu and ingredients:', error.message, error.stack);
        res.status(500).send({ error: 'Failed to fetch menu data.' });
    }
}

async function getShoppingListItems(req, res) {
    try {
        const sheets = await getSheetsClient();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Groceries!A3:E',
        });
        const rows = response.data.values || [];
        const items = rows.map(row => ({
            itemName: row[0] || '', status: row[1] || 'Need',
            lastModified: row[2] || '', addCount: parseInt(row[3], 10) || 1,
            preferredStore: row[4] || 'Any',
        }));
        res.status(200).json(items);
    } catch (error) {
        console.error('ERROR fetching shopping list:', error);
        res.status(500).send({ error: 'Failed to fetch shopping list.' });
    }
}
