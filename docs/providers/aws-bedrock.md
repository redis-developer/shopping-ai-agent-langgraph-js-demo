# AWS Bedrock provider

Use AWS Bedrock for the chat model and embeddings, with Bedrock Guardrails for content safety (`AI_PROVIDER="aws-bedrock"`).

| What | Default |
|---|---|
| Chat model | Claude on Bedrock, `global.anthropic.claude-opus-4-7` (set `BEDROCK_MODEL_ID` to change it) |
| Embeddings | Titan Text Embeddings V2, `amazon.titan-embed-text-v2:0` (1024 dimensions) |
| Guardrails | Bedrock Guardrails: a front desk check on each request, and personal information cleanup before text is saved to the semantic cache. See [aws-bedrock-guardrails.md](aws-bedrock-guardrails.md). |

The code and dependencies are in [`src/modules/ai/providers/aws-bedrock/`](../../src/modules/ai/providers/aws-bedrock).

## Setup

1. **Request model access.** In the AWS Bedrock console, make sure your region has access to the model in `BEDROCK_MODEL_ID` and to `amazon.titan-embed-text-v2:0`.

2. **Create two guardrails** in the Bedrock console:
   - A **conversation guardrail** that blocks off-topic requests. The topic filters and test cases are in [aws-bedrock-guardrails.md](aws-bedrock-guardrails.md).
   - A **cache guardrail** that detects personal information (PII), used to clean text before it's saved to the semantic cache.

3. Add these to the `.env` file at the repo root (start from `.env.example`):

   ```bash
   AI_PROVIDER="aws-bedrock"

   BEDROCK_AWS_ACCESS_KEY_ID="your_aws_access_key_id"
   BEDROCK_AWS_SECRET_ACCESS_KEY="your_aws_secret_access_key"
   BEDROCK_AWS_REGION="us-east-1"
   BEDROCK_MODEL_ID="global.anthropic.claude-opus-4-7"  # Optional: this is the default

   BEDROCK_CONVERSATION_GUARDRAIL_ID="your_conversation_guardrail_id"
   BEDROCK_CACHE_GUARDRAIL_ID="your_cache_guardrail_id"
   BEDROCK_GUARDRAIL_VERSION="1"
   ```


4. Install the app and this provider:

   ```bash
   npm run install:aws-bedrock
   ```

5. Load the sample dataset, then start the server:

   ```bash
   npm run load-products
   npm start
   ```

   The product index depends on the embedding size (1024 for Titan, 1536 for OpenAI). If you used another provider before, reload with a fresh index:

   ```bash
   npm run load-products -- --drop
   # With custom parameters: npm run load-products -- --drop products.csv 100 2000
   ```

Visit http://localhost:3000 (or the port in `SERVER_PORT`).

To check that your keys and guardrail settings are picked up, run `npm run debug-config`.

## Troubleshooting

- **Access denied for a model:** request access to it in the Bedrock console, for the same region as `BEDROCK_AWS_REGION`.
- **Guardrail errors:** check `BEDROCK_CONVERSATION_GUARDRAIL_ID`, `BEDROCK_CACHE_GUARDRAIL_ID` and `BEDROCK_GUARDRAIL_VERSION` with `npm run debug-config`.
