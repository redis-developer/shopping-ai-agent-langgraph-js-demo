# OpenAI provider

Use OpenAI for the chat model and embeddings. This is the default (`AI_PROVIDER="openai"`).

| What | Default |
|---|---|
| Chat model | `gpt-4o-mini` (set `MODEL_NAME` to change it) |
| Embeddings | `text-embedding-3-small` (1536 dimensions) |
| Guardrails | None, so requests go straight to the shopping agent |

The code and dependencies are in [`src/modules/ai/providers/openai/`](../../src/modules/ai/providers/openai).

## Setup

1. Get an API key from the [OpenAI platform](https://platform.openai.com/account/api-keys).

2. Add these to the `.env` file at the repo root (start from `.env.example`):

   ```bash
   AI_PROVIDER="openai"
   OPENAI_API_KEY="your_openai_api_key"
   MODEL_NAME="gpt-4o-mini"
   ```

3. Install the app and this provider:

   ```bash
   npm run install:openai
   ```

4. Load the sample dataset, then start the server:

   ```bash
   npm run load-products
   npm start
   ```

   If you used another provider before, reload with `npm run load-products -- --drop` so the product vectors match this provider.

Visit http://localhost:3000 (or the port in `SERVER_PORT`).

