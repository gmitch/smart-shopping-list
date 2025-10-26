const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

// --- Configuration ---
const SPREADSHEET_ID = '1S_HTpPJ3AaHdPZ9aiydzVUw7B21mTRR1_mutRg_g_pg';
const KEY_FILE_PATH = './crane-groceries-4f34f257c033.json';
const SECRET_API_KEY = process.env.SECRET_API_KEY; // Read from environment variables
// --- End Configuration ---

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}

// This single Cloud Function will now handle both GET (read) and POST (write) requests.
functions.http('shoppingListApi', async (req, res) => {
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  // --- Security Check ---
  if (req.headers['x-api-key'] !== SECRET_API_KEY) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  // --- ROUTING LOGIC ---
  if (req.method === 'GET') {
    await getShoppingListItems(req, res);
  } else if (req.method === 'POST') {
    await addShoppingListItem(req, res);
  } else {
    res.status(405).send('Method Not Allowed');
  }
});


/**
 * Handles GET requests to fetch and return all shopping list items.
 */
async function getShoppingListItems(req, res) {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      // Reads all data from A3 to the last column (E for PreferredStore)
      range: 'Groceries!A3:E',
    });

    const rows = response.data.values || [];
    // Convert array of arrays to array of objects for easier use in the frontend
    const items = rows.map(row => ({
      itemName: row[0] || '',
      status: row[1] || 'Need',
      lastModified: row[2] || '',
      addCount: parseInt(row[3], 10) || 1,
      preferredStore: row[4] || 'Any',
    }));

    res.status(200).json(items);
  } catch (error) {
    console.error('ERROR fetching list:', error);
    res.status(500).send({ error: 'Failed to fetch shopping list.' });
  }
}

/**
 * Handles POST requests to add or update a shopping list item.
 */
async function addShoppingListItem(req, res) {
  const itemName = req.body.itemName;
  if (!itemName || itemName.trim() === '') {
    return res.status(400).send({ error: 'Item name cannot be empty.' });
  }

  const normalizedItemName = itemName.trim();
  
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

    const now = new Date().toISOString();

    if (itemIndex !== -1) { // Item Found (Update)
      const rowIndexToUpdate = itemIndex + 3; // +3 for 1-based index and 2 header rows
      const currentAddCount = parseInt(rows[itemIndex][3], 10) || 0;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Groceries!B${rowIndexToUpdate}:D${rowIndexToUpdate}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [['Need', now, currentAddCount + 1]] },
      });
    } else { // Item Not Found (Append)
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
          range: { sheetId: 0, startRowIndex: 2 }, // Sorts starting from row 3
          sortSpecs: [
            { dimensionIndex: 1, sortOrder: 'DESCENDING' }, // Col B (Status)
            { dimensionIndex: 0, sortOrder: 'ASCENDING' },  // Col A (ItemName)
          ],
        }}]},
    });

    res.status(200).send({ success: true, message: `"${normalizedItemName}" was added/updated.` });

  } catch (error) {
    console.error('ERROR adding item:', error);
    res.status(500).send({ error: 'An internal error occurred.' });
  }
}
