# Smart Shopping List - Cloud Function Backend

This folder contains the serverless Node.js backend for the Smart Shopping List application. It is designed to be deployed as a Google Cloud Function and uses a Google Sheet as its database.

The function has an intelligent ingredient generation feature:
1.  It first checks for a user-defined recipe in a "Recipes" tab in the Google Sheet.
2.  If a personal recipe is found, it uses those ingredients for consistency.
3.  If no recipe is found, it falls back to the Gemini API to generate a suggested list of ingredients.

## Setup Instructions

### Part 1: Google Sheet Setup

1.  **Create a Google Sheet:**
    * Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
    * Create **three separate sheets** (tabs at the bottom) and name them exactly as follows:
        1.  `Groceries`
        2.  `Menu`
        3.  `Recipes`

2.  **Set Up Headers:**
    * In the **`Groceries`** sheet, add these headers in the **second row (row 2)**: `itemName`, `status`, `lastModified`, `addCount`, `preferredStore`.
    * In the **`Menu`** sheet, add these headers in the **first row**: `Day`, `Main Dish`, `Side Dish`.
    * In the **`Recipes`** sheet, add these headers in the **first row**: `Dish Name`, `Ingredients`. *The ingredients should be a comma-separated list.*

3.  **Get the Spreadsheet ID:**
    * From the sheet's URL, copy the long string of characters between `/d/` and `/edit`. This is your **`SPREADSHEET_ID`**.

### Part 2: Google Cloud Project Setup

1.  **Create a Google Cloud Project:**
    * In the [Google Cloud Console](https://console.cloud.google.com/), create a new project and **enable billing**. The project should fall within the free tier.

2.  **Enable APIs:**
    * In your new project, go to **APIs & Services > Library**.
    * Search for and **Enable** both of these APIs:
        1.  **Google Sheets API**
        2.  **Generative Language API**

3.  **Create a Service Account & JSON Key:**
    * Go to **IAM & Admin > Service Accounts** and create a service account with the **Editor** role.
    * From the "Actions" menu for the service account, select **Manage keys** and create a new **JSON** key. A file will be downloaded to your computer.

4.  **Share the Google Sheet:**
    * Open the downloaded JSON key file and copy the `client_email` address.
    * In your Google Sheet, click **Share** and paste this email address, giving it **Editor** access.

5.  **Get a Gemini API Key:**
    * Visit [Google AI Studio](https://aistudio.google.com/app/apikey) to create and copy a new API key.

### Part 3: Local Environment Setup

This project is configured to run without any personal information inside the code. All configuration is handled by environment variables.

1.  **Set Environment Variables:**
    * You need to set five environment variables in your terminal. For a permanent setup, add the following lines to your shell's configuration file (`~/.bashrc` for Bash or `~/.zshrc` for Zsh).
    * Replace all placeholder values with your actual keys and IDs.

    ```bash
    # Add these lines to your ~/.bashrc or ~/.zshrc

    export SPREADSHEET_ID="YOUR_SPREADSHEET_ID_HERE"
    export SECRET_API_KEY="CHOOSE_YOUR_OWN_SECRET_PASSWORD"
    export GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
    export GEMINI_MODEL="models/gemini-2.5-flash"
    export KEY_FILE_PATH="./crane-groceries-4f34f257c033.json"
    ```

2.  **Apply Changes:**
    * After saving the file, run `source ~/.bashrc` or `source ~/.zshrc` to make the variables available.

### Part 4: Deploying the Function

1.  **Install Dependencies:**
    * Open your terminal in this `cloud-function` directory.
    * Run the command `npm install` to download the required packages.

2.  **Deploy from the Command Line:**
    * Run the following command. It will automatically use the environment variables you set up in the previous step.

    ```bash
    gcloud functions deploy shoppingListApi \
    --runtime nodejs20 \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point shoppingListApi \
    --set-env-vars SPREADSHEET_ID="$SPREADSHEET_ID",SECRET_API_KEY="$SECRET_API_KEY",GEMINI_API_KEY="$GEMINI_API_KEY",GEMINI_MODEL="$GEMINI_MODEL",KEY_FILE_PATH="$KEY_FILE_PATH"
    ```

3.  **Get Your API URL:**
    * After deployment finishes, the command will output an `https_trigger` URL. This is your **API URL**, which you will need to configure the frontend. you will need to configure the frontend.
