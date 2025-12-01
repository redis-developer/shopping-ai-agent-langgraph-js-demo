# 🛒 Shopping AI Agent with LangGraph.js and AWS Bedrock

**Setup instructions for the AWS Bedrock-powered version of Redish.**

This enhanced version demonstrates building shopping AI agents using AWS Bedrock's Claude 3.5 Sonnet for conversational AI, Titan Text Embeddings V2 for vector search, and includes additional database services and AI guardrails.

> 📖 **For complete project information**, see the [main README](../README.md)

---

## Prerequisites

- **Redis**:
  - Use [Redis Cloud](https://redis.io) (no installation required)
- **Redis LangCache API**: [Get LangCache credentials](https://redis.io/langcache/)
- **AWS Bedrock Access**: [Set up AWS credentials](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html)
  - AWS Access Key ID and Secret Access Key
  - Bedrock model access (Claude 3.5 Sonnet, Titan Text Embeddings V2)
- **Node.js (v18 or higher)**: [Download & Install Node.js](https://nodejs.org/). Alternatively, use a docker-based setup.

## Getting Started

### 1. AWS Bedrock Model Access

Ensure you have access to these models in your AWS region:

- `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `amazon.titan-embed-text-v2:0`

Request model access in the AWS Bedrock console if needed.

### 2. Configure environment variables

Create a `.env` file in this directory (`aws-bedrock-version/.env`):

```bash
APP_NAME="Redish"
SERVER_PORT=3000

# AWS Bedrock Configuration (required for LLM and embeddings)
BEDROCK_AWS_ACCESS_KEY_ID=your_aws_access_key_id
BEDROCK_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
BEDROCK_AWS_REGION=us-east-1
BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"

# Bedrock Guardrails Configuration (optional - for content safety)
BEDROCK_CONVERSATION_GUARDRAIL_ID=guardrail-id
BEDROCK_CACHE_GUARDRAIL_ID=guardrail-id
BEDROCK_GUARDRAIL_VERSION=1

# Redis Configuration
REDIS_URL=your_redis_connection_string

# Redis LangCache Configuration (for semantic caching)
LANGCACHE_API_KEY="your_langcache_api_key"
LANGCACHE_API_BASE_URL="your_langcache_api_base_url"
LANGCACHE_CACHE_ID="your_langcache_cache_id"

# For tracing with Langsmith (optional)
LANGSMITH_TRACING="true"
LANGSMITH_ENDPOINT="your_langsmith_endpoint"
LANGSMITH_API_KEY="your_langsmith_api_key"
LANGSMITH_PROJECT="your_langsmith_project"
```

📝 Make sure to replace these placeholders with your real values before running the app.

### 2. Installation & Setup

#### Option A: Manual Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Load sample grocery data:

   ```bash
   # Load products
   npm run load-products

   # Fresh start (drops existing index and data)
   npm run load-products -- --drop

   # Custom parameters with fresh start
   npm run load-products -- --drop products.csv 100 2000
   ```

3. Start the server:

   ```bash
   npm start
   ```

#### Option B: 🐳 Docker Compose

Skip manual setup and run everything using Docker:

```bash
docker compose up
```

To stop the containers:

```bash
docker compose down -v
```

### 3. Access the app

Visit http://localhost:3000 in your browser (or use the port specified in `.env`).

---

## Tech Stack (This Version)

- **Node.js** + **Express** (Backend API)
- **Redis** (Product store, conversational history, and semantic caching)
- **LangGraph** (AI workflow orchestration)
- **AWS Bedrock** (Claude 3.5 Sonnet + Titan Text Embeddings V2)
- **HTML + CSS + Vanilla JS** (Frontend UI)

---

## AWS Bedrock Features

- **Claude 3.5 Sonnet**: Advanced conversational AI with better reasoning
- **Titan Text Embeddings V2**: High-quality vector embeddings for search
- **Guardrails**: Content safety and filtering (see [docs/guardrails.md](docs/guardrails.md))

---

## Architecture Diagrams

![Technical architecture](./docs/technical-diagrams/architecture-overview.png)

![Technical architecture - expanded](./docs/technical-diagrams/mermaid-flowchart.svg)
