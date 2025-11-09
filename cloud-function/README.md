# Smart Shopping List - Cloud Function Backend

This folder contains the serverless Node.js backend for the Smart Shopping List application. It is designed to be deployed as a Google Cloud Function.

## Setup Instructions

### Part 1: Google Sheet Setup

1.  **Create a Google Sheet:**
    * Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
    * Rename the first sheet tab to **`Groceries`**.
    * In the **second row (row 2)**, add the headers: `itemName`, `status`, `lastModified`, `addCount`, `preferredStore`.
    * **Create a second sheet tab** and rename it to **`Menu`**.
    * In the **first row (row 1)** of the `Menu` sheet, add the headers: `Day`, `Main Dish`, `Side Dish`.
    * Populate the `Menu` sheet with 8 days of data (e.g., "Tonight", "Monday", "Tuesday", etc.). The function is configured to read rows 2 through 9 (`A2:C9`).

2.  **Get the Spreadsheet ID:**
    * From the sheet's URL, copy the long string of characters between `/d/` and `/edit`.

### Part 2: Google Cloud & API Key Setup

1.  **Google Cloud Project:**
    * Follow the original instructions to create a project, enable the **Google Sheets API**, create a **Service Account**, and download its **JSON key file**.
    * Share your Google Sheet with the service account's `client_email` as an **Editor**.

2.  **Get a Gemini API Key:**
    * This function uses the Gemini API to generate ingredients.
    * Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create a new API key.
    * Copy this key. You will need it for deployment.

### Part 3: Deploying the Function

1.  **Update `package.json`:**
    * Your `package.json` file must include the new dependencies. Make sure it looks like this:

    ```json
    {
      "dependencies": {
        "@google-ai/generativelanguage": "^0.3.1",
        "@google-cloud/functions-framework": "^3.0.0",
        "cors": "^2.8.5",
        "google-auth-library": "^9.2.0",
        "googleapis": "^128.0.0"
      }
    }
    ```
    * Run `npm install` in this directory to update your `node_modules` and `package-lock.json`.

2.  **Deploy from the Command Line:**
    * Open your terminal and navigate into this `cloud-function` directory.
    * Run the following command, replacing **all three** placeholder values:

    ```bash
    gcloud functions deploy shoppingListApi \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point shoppingListApi \
    --set-env-vars SECRET_API_KEY="YOUR_CHOSEN_SECRET_PASSWORD",GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

3.  **Get Your API URL:**
    * After deployment, the command will output an `https_trigger` URL. This is your API URL for the frontend.
