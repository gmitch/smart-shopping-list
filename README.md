# Smart Shopping List

This project creates a voice-activated, intelligent shopping list using a Google Sheet as the database. It prevents duplicates, sorts automatically, and is secured with an API key.

## Architecture

* **/cloud-function:** A Node.js Google Cloud Function that serves as the secure backend API for adding items.
* **/apps-script:** A Google Apps Script that lives inside the Google Sheet to handle manual additions and sorting when item statuses are changed.

## Setup

See the `README.md` file inside each directory for specific deployment instructions.
