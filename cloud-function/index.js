const { google } = require('googleapis');
const cors = require('cors')({origin: true}); // Import and configure cors middleware

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

/**
 * Main HTTP Cloud Function.
 * This structure uses the cors middleware to automatically handle preflight requests.
 */
exports.shoppingListApi = (req, res) => {
    cors(req, res, async () => {
        // --- Security Check ---
        if (req.headers['x-api-key'] !== SECRET_API_KEY) {
            return res.status(401).send({ error: "Unauthorized" });
        }

        // --- Routing Logic ---
        if (req.method === 'GET') {
            await getShoppingListItems(req, res);
        } else if (req.method === 'POST') {
            await addShoppingListItem(req, res);
        } else {
            // The OPTIONS method is handled by the cors middleware
            res.status(405).send('Method Not Allowed');
        }
    });
};

// ... THE REST OF YOUR FILE (getShoppingListItems and addShoppingListItem functions) REMAINS EXACTLY THE SAME ...
async function getShoppingListItems(req, res) {
  try {
    const sheets = await getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Groceries!A3:E',
    });

    const rows = response.data.values || [];
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

    if (itemIndex !== -1) {
      const rowIndexToUpdate = itemIndex + 3;
      const currentAddCount = parseInt(rows[itemIndex][3], 10) || 0;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Groceries!B${rowIndexToUpdate}:D${rowIndexToUpdate}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [['Need', now, currentAddCount + 1]] },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Groceries!A:E',
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[normalizedItemName, 'Need', now, 1]] },
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

    res.status(200).send({ success: true, message: `"${normalizedItemName}" was added/updated.` });

  } catch (error) {
    console.error('ERROR adding item:', error);
    res.status(500).send({ error: 'An internal error occurred.' });
  }
}
