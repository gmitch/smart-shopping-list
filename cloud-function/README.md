# Cloud Function Backend

This Node.js function is the secure API for the smart shopping list.

## Setup

1.  Place your Google Cloud service account key file in this directory (e.g., `crane-groceries-4f34f257c033.json`). It is ignored by `.gitignore`.
2.  Install dependencies: `npm install`
3.  Deploy the function using the gcloud CLI, ensuring you remove the `--allow-unauthenticated` flag:

```bash
gcloud functions deploy addShoppingListItem \
  --project=crane-groceries \
  --runtime=nodejs20 \
  --trigger-http \
  --entry-point=addShoppingListItem
