const functions = require('@google-cloud/functions-framework');
const { google } = require('googleapis');

// --- Configuration ---
const SPREADSHEET_ID = '1S_HTpPJ3AaHdPZ9aiydzVUw7B21mTRR1_mutRg_g_pg';
const KEY_FILE_PATH = './crane-groceries-4f34f257c033.json'; // Your specific key file
const SECRET_API_KEY = process.env.SECRET_API_KEY;
// --- End Configuration ---


/**
 * Initializes the Google Sheets API client with service account credentials.
 * @returns {Promise<google.sheets_v4.Sheets>} Authenticated Sheets API client.
 */
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient });
}


/**
 * Main HTTP Cloud Function to add/update a shopping list item.
 */
functions.http('addShoppingListItem', async (req, res) => {
  // Allow CORS for testing and future web apps.
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    // Handle preflight requests for CORS.
    res.status(204).send('');
    return;
  }
  
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  // --- NEW SECURITY CHECK ---
  const providedApiKey = req.headers['x-api-key'];
  if (providedApiKey !== SECRET_API_KEY) {
    console.log("Rejected request with invalid or missing API key.");
    return res.status(401).send({ error: "Unauthorized" });
  }
  // --- END SECURITY CHECK ---

  let itemName;

  // Logic to handle different request types (direct call or Assistant Action)
  if (req.body.session && req.body.session.params && req.body.session.params.itemName) {
    console.log("Received request from Google Action");
    itemName = req.body.session.params.itemName;
  } else if (req.body.itemName) {
    console.log("Received direct API request");
    itemName = req.body.itemName;
  } else {
    return res.status(400).send({ error: 'Could not find "itemName" in request.' });
  }

  const normalizedItemName = itemName.trim();
  if (normalizedItemName === '') {
      return res.status(400).send({ error: 'Item name cannot be empty.' });
  }

  try {
    const sheets = await getSheetsClient();
    
    // Read the sheet to find if the item already exists.
    // NOTE: This logic matches the final sheet structure (data starts in A3).
    const getRowsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Groceries!A3:D',
    });
    
    const rows = getRowsResponse.data.values || [];
    const itemIndex = rows.findIndex(
      (row) => row[0] && row[0].toLowerCase() === normalizedItemName.toLowerCase()
    );

    const now = new Date().toISOString();

    if (itemIndex !== -1) {
      // --- ITEM FOUND (UPDATE) ---
      const rowIndexToUpdate = itemIndex + 3; // +3 because sheet is 1-indexed and we have 2 header rows.
      const currentAddCount = parseInt(rows[itemIndex][3], 10) || 0;
      
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Groceries!B${rowIndexToUpdate}:D${rowIndexToUpdate}`, // Update Status, LastModified, AddCount
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [['Need', now, currentAddCount + 1]],
        },
      });

    } else {
      // --- ITEM NOT FOUND (APPEND) ---
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Groceries!A:D',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[normalizedItemName, 'Need', now, 1]],
        },
      });
    }

    // --- Sort the sheet after every operation ---
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
            requests: [{
                sortRange: {
                    range: {
                        sheetId: 0, // Assumes it's the first sheet
                        startRowIndex: 2, // Start sorting from row 3
                    },
                    sortSpecs: [
                        { dimensionIndex: 1, sortOrder: 'DESCENDING' }, // Column B (Status)
                        { dimensionIndex: 0, sortOrder: 'ASCENDING' },  // Column A (ItemName)
                    ],
                },
            }],
        },
    });

    // --- Respond to the caller ---
    // If it's a Google Action, send a spoken response. Otherwise, send simple JSON.
    if (req.body.session) {
        const responseJson = {
          session: {
            id: req.body.session.id,
            params: req.body.session.params
          },
          prompt: {
            override: false,
            firstSimple: {
              speech: `Okay, I've added ${normalizedItemName} to the list.`,
              text: `Added ${normalizedItemName}.`
            }
          }
        };
        res.status(200).send(responseJson);
    } else {
        res.status(200).send({ success: true, message: `"${normalizedItemName}" added/updated.` });
    }

  } catch (error) {
    console.error('ERROR:', error);
    res.status(500).send({ error: 'An internal error occurred.' });
  }
});
