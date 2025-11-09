# My Smart Shopping List (Node.js Backend)

This is a simple, self-hosted web application for managing a smart shopping list. It uses a Google Sheet as a database and a Google Cloud Function written in Node.js as the API backend.

## Architecture

* **Frontend:** A static `index.html` file that runs in any modern web browser.
* **Backend:** A serverless Node.js API hosted on Google Cloud Functions.
* **Database:** A Google Sheet, which the Cloud Function reads from and writes to.

## Setup Instructions

The setup is divided into three main parts: setting up the Google Sheet, configuring the Google Cloud project, and deploying the backend function.

### Part 1: Google Sheet Setup

1.  **Create a Google Sheet:**
    * Go to [sheets.new](https://sheets.new) to create a new, blank spreadsheet.
    * Rename the first sheet (the tab at the bottom) from "Sheet1" to **`Groceries`**. This is case-sensitive!
    * In the **second row (row 2)**, add the following headers in cells `A2` through `E2`:
        * `itemName`
        * `status`
        * `lastModified`
        * `addCount`
        * `preferredStore`
    * Freeze the top two rows for better visibility (`View > Freeze > 2 rows`).

2.  **Get the Spreadsheet ID:**
    * Look at the URL of your Google Sheet. It will look something like this:
        `https://docs.google.com/spreadsheets/d/1S_HTpPJ3AaHdPZ9aiydzVUw7B21mTRR1_mutRg_g_pg/edit`
    * The long string in the middle is your **Spreadsheet ID**. Copy it and save it for later.

### Part 2: Google Cloud Project & Authentication

This is the most critical part. We need to create a "service account," which is like a robot user that your Cloud Function will use to securely access your Google Sheet.

1.  **Create a Google Cloud Project:**
    * Go to the [Google Cloud Console](https://console.cloud.google.com/).
    * Create a new project (or use an existing one). Give it a name like `smart-shopping-list`.
    * **Important:** Make sure billing is enabled for the project. (Google Cloud has a generous free tier, and this project should not incur costs).

2.  **Enable the Google Sheets API:**
    * In your new project, navigate to the **APIs & Services > Library**.
    * Search for "Google Sheets API" and click **Enable**.

3.  **Create a Service Account:**
    * Navigate to **IAM & Admin > Service Accounts**.
    * Click **Create Service Account**.
    * Give it a name (e.g., `sheets-editor`) and click **Create and Continue**.
    * Grant it the role of **Editor** to ensure it has permission to modify your project resources. Click **Continue**, then **Done**.

4.  **Generate a JSON Key:**
    * Find the service account you just created in the list. Click the three-dot menu under "Actions" and select **Manage keys**.
    * Click **Add Key > Create new key**.
    * Choose **JSON** as the key type and click **Create**.
    * A JSON file will be downloaded to your computer. **This file is very sensitive!** Treat it like a password. Rename this file to `crane-groceries-4f34f257c033.json` (or whatever name you used in the code) and place it in the same directory as your Node.js code.

5.  **Share the Google Sheet:**
    * Open the downloaded JSON key file in a text editor. Find the `client_email` address (it will look like `sheets-editor@your-project-id.iam.gserviceaccount.com`).
    * Go back to your Google Sheet, click the **Share** button, and paste this email address. Give it **Editor** access. This allows your "robot user" to edit the sheet.

### Part 3: Deploying the Node.js Cloud Function

1.  **Organize Your Files:**
    * In a folder on your computer, make sure you have the following files from the GitHub repository:
        * `index.js` (The Node.js function code)
        * `package.json` (Lists the project dependencies)
        * The service account JSON key file you downloaded (e.g., `crane-groceries-4f34f257c033.json`)

2.  **Install `gcloud` CLI:**
    * If you don't have it, [install the Google Cloud CLI](https://cloud.google.com/sdk/docs/install).

3.  **Deploy from the Command Line:**
    * Open your terminal or command prompt and navigate to the folder containing your files.
    * Run the following command. **Replace the placeholder values!**

    ```bash
    gcloud functions deploy shoppingListApi \
    --runtime nodejs18 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point shoppingListApi \
    --set-env-vars SECRET_API_KEY="CHOOSE_YOUR_OWN_SECRET_PASSWORD"
    ```
    * `--runtime`: Specifies the Node.js version.
    * `--trigger-http`: Makes the function accessible via a URL.
    * `--allow-unauthenticated`: Allows your frontend to call it (access is still protected by your secret API key).
    * `--set-env-vars`: **This is where you set your secret API key.** Replace `CHOOSE_YOUR_OWN_SECRET_PASSWORD` with a strong, unique password.

4.  **Get Your API URL:**
    * After the deployment finishes (it may take a few minutes), the command will output a `https_trigger` URL. This is the **API URL** for your frontend.

### Part 4: Frontend Setup

1.  **Open `index.html`:**
    * Open the `frontend/index.html` file in your browser.
2.  **Configure the App:**
    * **API URL:** Paste the `https_trigger` URL you just got from the deployment.
    * **API Key:** Enter the secret password you set in the `SECRET_API_KEY` environment variable.
3.  **Save and Enjoy!**
    * Click **Save and Load List**. Your app is now fully configured and running!
