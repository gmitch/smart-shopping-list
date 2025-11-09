# Smart Shopping List - Cloud Function Backend

This folder contains the serverless Node.js backend for the Smart Shopping List application. It is designed to be deployed as a Google Cloud Function and uses a Google Sheet as its database. It also uses the Gemini API to generate a list of ingredients based on a weekly menu.

## Setup Instructions

### Part 1: Google Sheet Setup

1.  **Create a Google Sheet:**
    * Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
    * Rename the first sheet tab to **`Groceries`**.
    * In the **second row (row 2)**, add the headers: `itemName`, `status`, `lastModified`, `addCount`, `preferredStore`.
    * Create a **second sheet tab** and rename it to **`Menu`**.
    * In the first row of the `Menu` sheet, add the headers: `Day`, `Main Dish`, `Side Dish`.
    * Populate the `Menu` sheet with up to 8 days of data (the function reads rows `A2:C9`).

2.  **Get the Spreadsheet ID:**
    * From the sheet's URL, copy the long string of characters between `/d/` and `/edit`. This is your **Spreadsheet ID**, which you'll need for the `index.js` file.

### Part 2: Google Cloud & API Key Setup

1.  **Create a Google Cloud Project:**
    * In the [Google Cloud Console](https://console.cloud.google.com/), create a new project and **enable billing**. The project should fall within the free tier.

2.  **Enable APIs:**
    * In your new project, go to **APIs & Services > Library**.
    * Search for and **Enable** both of these APIs:
        1.  **Google Sheets API**
        2.  **Generative Language API**

3.  **Create a Service Account:**
    * Go to **IAM & Admin > Service Accounts**.
    * Click **Create Service Account**, give it a name (e.g., `sheets-editor`), and grant it the **Editor** role.

4.  **Generate a JSON Key:**
    * Find your new service account, click the "Actions" menu (three dots), and select **Manage keys**.
    * Click **Add Key > Create new key**, choose **JSON**, and click **Create**.
    * A JSON key file will be downloaded. Place this file inside this `cloud-function` directory.

5.  **Share the Google Sheet:**
    * Open the downloaded JSON key file and copy the `client_email` address.
    * In your Google Sheet, click **Share** and paste this email address, giving it **Editor** access.

6.  **Get a Gemini API Key:**
    * Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create and copy a new API key. You will need this for the deployment command.

### Part 3: Deploying the Function

1.  **Configure the Code:**
    * Open the `index.js` file and replace the `YOUR_SPREADSHEET_ID_HERE` placeholder with the ID from Part 1.
    * Make sure the `KEY_FILE_PATH` constant matches the name of your downloaded JSON key file.

2.  **Install Dependencies:**
    * Open your terminal in this `cloud-function` directory.
    * Run the command `npm install` to download the required packages listed in `package.json`.

3.  **Deploy from the Command Line:**
    * Make sure you have the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and initialized (`gcloud init`).
    * Run the following command, replacing the two placeholder values:

    ```bash
    gcloud functions deploy shoppingListApi \
    --runtime nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point shoppingListApi \
    --set-env-vars SECRET_API_KEY="CHOOSE_YOUR_OWN_SECRET_PASSWORD",GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    ```

4.  **Get Your API URL:**
    * After deployment, the command will output an `https_trigger` URL. This is your **API URL**, which you will need to configure the frontend.
