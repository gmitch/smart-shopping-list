// --- Configuration ---
// This configuration matches your sheet:
// - A1 is the Quick Add cell.
// - Row 2 contains headers (ItemName in A, Status in B, etc.).
// - Data starts on Row 3.
const QUICK_ADD_CELL = "A1";
const STATUS_COLUMN_NUMBER = 2; // Column B is the 2nd column
const DATA_START_ROW = 3;
const SHEET_NAME = "Groceries";
// --- End Configuration ---


/**
 * Runs automatically when a user edits the spreadsheet.
 * @param {object} e The event object from the edit.
 */
function onEdit(e) {
  const range = e.range;
  const editedSheet = range.getSheet();
  
  // Exit if the edit is on the wrong sheet
  if (editedSheet.getName() !== SHEET_NAME) {
    return;
  }

  const editedCellA1 = range.getA1Notation();
  const editedColumn = range.getColumn();
  const editedRow = range.getRow();

  // CASE 1: The "Quick Add" cell (A1) was used.
  if (editedCellA1 === QUICK_ADD_CELL) {
    const itemName = e.value;
    if (!itemName || itemName.trim() === "") {
      return; // Ignore if the cell was cleared
    }
    range.clearContent();
    addOrUpdateItem(itemName.trim());
  } 
  // CASE 2: The "Status" column was changed in a data row.
  else if (editedColumn === STATUS_COLUMN_NUMBER && editedRow >= DATA_START_ROW) {
    // Just sort the sheet, no other action is needed.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sortSheet(sheet);
  }
}

/**
 * Adds a new item or updates an existing one, then sorts the sheet.
 * @param {string} itemName The name of the item to add.
 */
function addOrUpdateItem(itemName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const dataRowsCount = lastRow >= DATA_START_ROW ? (lastRow - DATA_START_ROW + 1) : 0;
  const values = dataRowsCount > 0 ? sheet.getRange(DATA_START_ROW, 1, dataRowsCount, sheet.getLastColumn()).getValues() : [];

  let itemFound = false;
  const now = new Date().toISOString();

  for (let i = 0; i < values.length; i++) {
    // ItemName is in the first column (index 0) of our values array
    if (values[i][0] && values[i][0].toLowerCase() === itemName.toLowerCase()) {
      const rowIndex = i + DATA_START_ROW;
      // AddCount is in the 4th column (index 3) of our values array
      const currentAddCount = parseInt(values[i][3], 10) || 0;
      
      // Update Status (Col B), LastModified (Col C), and AddCount (Col D)
      sheet.getRange(rowIndex, 2, 1, 3).setValues([['Need', now, currentAddCount + 1]]);
      itemFound = true;
      break;
    }
  }

  if (!itemFound) {
    // Append a new row. This will leave the PreferredStore column blank.
    sheet.appendRow([itemName, 'Need', now, 1]);
  }
  
  sortSheet(sheet);
}

/**
 * Sorts the data rows by Status (DESC) and then ItemName (ASC).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet The sheet to sort.
 */
function sortSheet(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow >= DATA_START_ROW) {
    const dataRowsCount = lastRow - DATA_START_ROW + 1;
    const dataRange = sheet.getRange(DATA_START_ROW, 1, dataRowsCount, sheet.getLastColumn());
    
    dataRange.sort([
      { column: 2, ascending: false }, // Column B (Status)
      { column: 1, ascending: true }   // Column A (ItemName)
    ]);
  }
}
