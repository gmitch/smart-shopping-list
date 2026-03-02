#!/bin/bash
# Source environment variables
if [ -f ~/.zshrc ]; then
    source ~/.zshrc
elif [ -f ~/.bashrc ]; then
    source ~/.bashrc
fi

# Deploy the cloud function
/Users/mitchcrane/Downloads/google-cloud-sdk/bin/gcloud functions deploy shoppingListApi \
--project crane-groceries \
--runtime nodejs20 \
--trigger-http \
--allow-unauthenticated \
--entry-point shoppingListApi \
--set-env-vars SPREADSHEET_ID="$SPREADSHEET_ID",SECRET_API_KEY="$SECRET_API_KEY",GEMINI_API_KEY="$GEMINI_API_KEY",GEMINI_MODEL="$GEMINI_MODEL",KEY_FILE_PATH="$KEY_FILE_PATH"
