const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');
const cors = require('cors')({origin: true});

// --- Configuration ---
const SPREADSHEET_ID = '1S_HTpPJ3AaHdPZ9aiydzVUw7B21mTRR1_mutRg_g_pg';
const KEY_FILE_PATH = './crane-groceries-4f34f257c033.json';
const SECRET_API_KEY = process.env.SECRET_API_KEY;
// --- End Configuration ---

async function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

exports.shoppingListApi = (req, res) => {
    cors(req, res, async () => {
        if (req.headers['x-api-key'] !== SECRET_API_KEY) {
            return res.status(401).send({ error: "Unauthorized" });
        }
        if (req.method === 'GET') {
            await getShoppingListItems(req, res);
        } else if (req.method === 'POST') {
            await addOrUpdateShoppingListItem(req, res); // Renamed for clarity
        } else {
            res.status(405).send('Method Not Allowed');
        }
    });
};

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
        console.error('ERROR fetching list:', error);
        res.status(500).send({ error: 'Failed to fetch shopping list.' });
    }
}

/**
 * Handles POST requests to add a NEW item or UPDATE the status of an EXISTING item.
 */
async function addOrUpdateShoppingListItem(req, res) {
    const { itemName, status } = req.body; // Destructure both possible properties
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

        if (itemIndex !== -1) { // --- ITEM FOUND ---
            const rowIndexToUpdate = itemIndex + 3;
            
            if (status) { // --- THIS IS A STATUS UPDATE ---
                // Only update the Status and Last Modified date
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `Groceries!B${rowIndexToUpdate}:C${rowIndexToUpdate}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[status, now]] },
                });
            } else { // --- THIS IS A RE-ADDITION (like from the input box) ---
                const currentAddCount = parseInt(rows[itemIndex][3], 10) || 0;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `Groceries!B${rowIndexToUpdate}:D${rowIndexToUpdate}`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [['Need', now, currentAddCount + 1]] },
                });
            }
        } else if (!status) { // --- ITEM NOT FOUND, AND IT'S A NEW ADDITION ---
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Groceries!A:E',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[normalizedItemName, 'Need', now, 1]] },
            });
        }

        // Sort the sheet after every operation
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: SPREADSHEET_ID,
            resource: { requests: [{ sortRange: {
                range: { sheetId: 0, startRowIndex: 2 },
                sortSpecs: [
                    { dimensionIndex: 1, sortOrder: 'DESCENDING' }, // Col B (Status)
                    { dimensionIndex: 0, sortOrder: 'ASCENDING' },  // Col A (ItemName)
                ],
            }}]},
        });

        res.status(200).send({ success: true, message: `"${normalizedItemName}" was updated.` });

    } catch (error) {
        console.error('ERROR updating item:', error);
        res.status(500).send({ error: 'An internal error occurred.' });
    }
}
