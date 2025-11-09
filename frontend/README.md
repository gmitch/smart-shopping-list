# Smart Shopping List - Frontend

This folder contains the frontend for the Smart Shopping List application. It's a simple, self-contained web page made with HTML, CSS, and vanilla JavaScript.

## How to Run

There is no build step or server required. You can run this application by simply opening the `index.html` file in any modern web browser.

## Configuration

Before the application can work, you must connect it to your deployed backend API.

1.  **Deploy the Backend:**
    * Follow the instructions in the `cloud-function/README.md` file to deploy your Google Cloud Function. When you are finished, you should have two pieces of information:
        1.  Your **API URL** (the `https_trigger` from the deployment).
        2.  The **Secret API Key** you created.

2.  **Configure the Frontend:**
    * Open `index.html` in your browser. You will see a settings page.
    * **API URL:** Paste the `https_trigger` URL from your backend deployment.
    * **API Key:** Enter the secret password you chose when deploying the backend.
    * Click **Save and Load List**.

The application will save these settings in your browser's local storage, so you will only need to enter them once.
