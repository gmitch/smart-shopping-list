# Smart Shopping List - Cloud Function Backend

This folder contains the serverless Node.js backend for the Smart Shopping List application. It is designed to be deployed as a Google Cloud Function. It uses a Google Sheet as its database.

## Setup Instructions

### Part 1: Google Sheet Setup

1.  **Create a Google Sheet:**
    * Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
    * Rename the first sheet tab to **`Groceries`**.
    * In the **second row (row 2)**, add the following headers: `itemName`, `status`, `lastModified`, `addCount`, `preferredStore`.
    * Freeze the top two rows for visibility (`View > Freeze > 2 rows`).

2.  **Get the Spreadsheet ID:**
    * From the sheet's URL, copy the long string of characters between `/d/` and `/edit`. This is your **Spreadsheet ID**.

### Part 2: Google Cloud Project & Authentication

This process creates a secure "service account" that allows your code to edit the Google Sheet.

1.  **Create a Google Cloud Project:**
    * In the [Google Cloud Console](https://console.cloud.google.com/), create a new project and **enable billing**. The project should fall within the free tier.

2.  **Enable APIs:**
    * In your new project, go to **APIs & Services > Library**.
    * Enable the **Google Sheets API** and the **Cloud Functions API**.

3.  **Create a Service Account:**
    * Go to **IAM & Admin > Service Accounts**.
    * Click **Create Service Account**, give it a name (e.g., `sheets-editor`), and grant it the **Editor** role.

4.  **Generate a JSON Key:**
    * Find your new service account, click the "Actions" menu (three dots), and select **Manage keys**.
    * Click **Add Key > Create new key**, choose **JSON**, and click **Create**.
    * A JSON key file will be downloaded. Rename it to `crane-groceries-4f34f257c033.json` (or your preferred name, but make sure it matches the code) and place it in this `cloud-function` directory.

5.  **Share the Google Sheet:**
    * Open the downloaded JSON key file and copy the `client_email` address.
    * In your Google Sheet, click **Share** and paste this email address, giving it **Editor** access.

### Part 3: Deploying the Function

1.  **Prerequisites:**
    * Make sure you have the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and initialized (`gcloud init`).

2.  **Deploy from the Command Line:**
    * Open your terminal and navigate into this `cloud-function` directory.
    * Run the following command, replacing the placeholder values:

    ```bash
    gcloud functions deploy shoppingListApi \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point shoppingListApi \
    --set-env-vars SECRET_API_KEY="CHOOSE_YOUR_OWN_SECRET_PASSWORD"
    ```

3.  **Get Your API URL:**
    * After deployment, the command will output an `https_trigger` URL. **This is your API URL.** You will need it to configure the frontend.
