const { google } = require('googleapis');
const cors = require('cors')({origin: true});
const { GoogleAuth } = require('google-auth-library');

// --- Configuration ---
const SPREADSHEET_ID = '1S_HTpPJ3AaHdPZ9aiydzVUw7B21mTRR1_mutRg_g_pg'; // 👈 Replace with your Spreadsheet ID
const KEY_FILE_PATH = './crane-groceries-4f34f257c033.json';
const SECRET_API_KEY = process.env.SECRET_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "models/gemini-2.5-flash"; // The model that works for your project
// --- End Configuration ---

const auth = new GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function getSheetsClient() {
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

// Main router function
exports.shoppingListApi = (req, res) => {
    cors(req, res, async () => {
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

// --- Menu & Ingredients Function (with smarter matching) ---
async function getMenuAndIngredients(req, res) {
    try {
        const sheets = await getSheetsClient();
        const [menuResponse, shoppingListResponse] = await Promise.all([
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Menu!A2:C9' }),
            sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: 'Groceries!A3:B' })
        ]);

        const menuRows = menuResponse.data.values || [];
        const menu = menuRows.map(row => ({ day: row[0], main: row[1] || '', side: row[2] || '' }));
        const dishes = menu.flatMap(day => [day.main, day.side]).filter(dish => dish);

        if (dishes.length === 0) {
            return res.status(200).json({ menu, ingredients: [] });
        }

        const prompt = `Generate a consolidated, de-duplicated list of grocery ingredients for the following meals: ${dishes.join(', ')}. Do not include salt, pepper, water, or cooking oil. Respond with only a comma-separated list of items.`;
        const geminiUrl = `https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
        const requestBody = { "contents": [{ "parts": [{ "text": prompt }] }] };

        const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.json();
            console.error("Full Gemini API Error Response:", JSON.stringify(errorBody, null, 2));
            throw new Error('Gemini API request failed.');
        }

        const aiData = await geminiResponse.json();
        const generatedIngredients = (aiData.candidates && aiData.candidates[0].content && aiData.candidates[0].content.parts[0])
            ? aiData.candidates[0].content.parts[0].text.split(',').map(item => item.trim()).filter(item => item)
            : [];

        // --- NEW Smart Matching Logic ---
        const shoppingListItems = shoppingListResponse.data.values || [];
        const shoppingListStatusMap = new Map(shoppingListItems.map(([name, status]) => [name.toLowerCase(), status]));

        const ingredients = generatedIngredients.map(name => {
            const nameLower = name.toLowerCase();
            let foundStatus;

            // 1. Check for exact match (case-insensitive)
            foundStatus = shoppingListStatusMap.get(nameLower);

            // 2. If not found, check for plural/singular variations
            if (!foundStatus) {
                if (nameLower.endsWith('s')) {
                    // It's plural, check for singular version
                    foundStatus = shoppingListStatusMap.get(nameLower.slice(0, -1));
                } else {
                    // It's singular, check for plural version
                    foundStatus = shoppingListStatusMap.get(nameLower + 's');
                }
            }

            return {
                name: name,
                status: foundStatus || 'Unknown' // Default to 'Unknown' if no match is found
            };
        });
        // --- End of Smart Matching Logic ---

        res.status(200).json({ menu, ingredients });
    } catch (error) {
        console.error('ERROR fetching menu and ingredients:', error.message);
        res.status(500).send({ error: 'Failed to fetch menu data.' });
    }
}

// --- Shopping List Functions (Unchanged) ---
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
async function addOrUpdateShoppingListItem(req, res) {
    const { itemName, status } = req.body;
    if (!itemName || itemName.trim() === '') {
        return res.status(400).send({ error: 'Item name cannot be empty.' });
    }
    const normalizedItemName = itemName.trim();
    const now = new Date().toISOString();
    try {
        const sheets = await getSheetsClient();
        const getRowsResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Groceries!A3:E',
        });
        const rows = getRowsResponse.data.values || [];
        const itemIndex = rows.findIndex(
            (row) => row[0] && row[0].toLowerCase() === normalizedItemName.toLowerCase()
        );
        if (itemIndex !== -1) {
            const rowIndexToUpdate = itemIndex + 3;
            if (status) {
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID, range: `Groceries!B${rowIndexToUpdate}:C${rowIndexToUpdate}`,
                    valueInputOption: 'USER_ENTERED', resource: { values: [[status, now]] },
                });
            } else {
                const currentAddCount = parseInt(rows[itemIndex][3], 10) || 0;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID, range: `Groceries!B${rowIndexToUpdate}:D${rowIndexToUpdate}`,
                    valueInputOption: 'USER_ENTERED', resource: { values: [['Need', now, currentAddCount + 1]] },
                });
            }
        } else if (!status) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'Groceries!A:E',
                valueInputOption: 'USER_ENTERED', resource: { values: [[normalizedItemName, 'Need', now, 1]] },
            });
        }
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests: [{ sortRange: {
                range: { sheetId: 0, startRowIndex: 2 },
                sortSpecs: [
                    { dimensionIndex: 1, sortOrder: 'DESCENDING' },
                    { dimensionIndex: 0, sortOrder: 'ASCENDING' },
                ],
            }}]},
        });
        res.status(200).send({ success: true });
    } catch (error) {
        console.error('ERROR updating item:', error);
        res.status(500).send({ error: 'An internal error occurred.' });
    }
}
