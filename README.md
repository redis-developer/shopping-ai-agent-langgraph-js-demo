# 🛒 Shopping AI Agent with LangGraph.js

**Redis-powered grocery shopping e-commerce app with AI shopping assistance.**

Redish is an AI-powered grocery shopping platform that combines Redis's speed with LangGraph's intelligent workflow orchestration. Get personalized recipe recommendations, smart product suggestions, and lightning-fast responses through semantic caching.

## App screenshots

![App home page](./screenshots/home-screen.png)

---

## Product Features

- **Vibe Shopping**: Describe a mood or occasion in everyday words, like "cozy movie night snacks" or "a light summer lunch", and get products that fit, using semantic search
- **Recipe Ingredients**: Ask for ingredients for any recipe and get suggested products
- **Product Search**: Find products by name, category, or description
- **Smart Recommendations**: AI suggests alternatives and complementary items
- **Cart Management**: Add, remove, and view cart items through natural conversation

## Technical features

- **Vector Search**: Find products using AI-powered similarity search
- **Agent Memory**: For storing conversations, summarizing long ones, and remembering shopper preferences across sessions, using Redis Agent Memory
- **Semantic Cache**: Similar queries return instantly using Redis LangCache
- **Multi-tool Agentic workflow**: AI agent routing and tool calling

---

## Setup


### Step 1: Redis Agent Memory

Both versions store conversations and shopper preferences in [Redis Agent Memory](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/). Create a service in the Redis Cloud console (see the [TypeScript SDK quickstart](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/typescript-sdk-quickstart/) for the steps), then add its connection details to the `.env` file of the version you run:

```bash
AGENT_MEMORY_URL="your_agent_memory_endpoint"
AGENT_MEMORY_STORE_ID="your_store_id"
AGENT_MEMORY_API_KEY="your_agent_memory_api_key"
#AGENT_MEMORY_NAMESPACE_ID="your_namespace_id"  # Optional: scope memories to a namespace
```

The app expects one custom memory type, `shopper_preference`, in the service (Redis Cloud console, **Memory types & extraction**, **Add type**). The memory tools in the code use these names, so keep them in step if you change them.

| Setting | Value |
|---|---|
| Name | `shopper_preference` |
| Description | Structured shopping preferences and dietary constraints for a shopper |
| Extraction prompt | Extract a shopper preference only when the user explicitly states a lasting dietary restriction, allergy, food preference or dislike, or standing instruction. Ignore one-off requests and items for the current order. Include allergies and intolerances under dietary_restrictions, and include both likes and dislikes under food_preferences. |

**Custom fields:**

| Field | Type | Description |
|---|---|---|
| `dietary_restrictions` | `list[str]` | Diets, allergies and intolerances, such as vegetarian, gluten-free or nut allergy |
| `food_preferences` | `list[str]` | Cuisines, brands, organic or budget leanings, and flavors the user likes or dislikes |
| `standing_instructions` | `list[str]` | Rules the user wants applied every time, such as "always suggest the cheaper option", "prefer family-size packs", or "keep answers short" |


Other memory settings (suggested starting points):

| Setting | Suggested value |
|---|---|
| Short-term TTL | About 1 day |
| Long-term TTL | 365 days |
| Extraction cadence | 1 minute while testing, 5 to 15 minutes in production |
| Automatic summarization | On, after about 12 to 20 messages |

### Step 2

Choose one of the following:

- **OpenAI Version Setup**: See [openai-version/README.md](openai-version/README.md)
- **AWS Bedrock Version Setup**: See [aws-bedrock-version/README.md](aws-bedrock-version/README.md)

---

## 📁 Repository Structure

This repository contains two versions of the demo:

```
│ 
├── openai-version/       # OpenAI-powered version
│   ├── package.json
│   ├── index.js
│   ├── modules/
│   └── ...
│   └── README.md         # Setup instructions
│
├── aws-bedrock-version/  # AWS Bedrock version
│   ├── package.json
│   ├── index.js
│   ├── modules/
│   └── ...
│   └── README.md         # Setup instructions
└── README.md             # This file
```

## Quick Start

Choose your preferred AI provider:

### Option 1: OpenAI Version

```bash
cd openai-version
# Follow setup instructions in openai-version/README.md
```

### Option 2: AWS Bedrock Version

```bash
cd aws-bedrock-version
# Follow setup instructions in aws-bedrock-version/README.md
```

## 📋 Version Comparison

| Feature | OpenAI Version | AWS Bedrock Version |
|---------|----------------------|-------------------|
| **AI Provider** | OpenAI GPT-4 | AWS Bedrock Claude 3.5 Sonnet |
| **Embeddings** | OpenAI Embeddings | AWS Bedrock Titan Text Embeddings V2 |
| **AI Guardrails** | Basic content filtering | ✅ AWS Bedrock Guardrails |

---

## Tech Stack

### Core Technologies
- **Node.js** + **Express** (Backend API)
- **Redis** (Product store, agentic AI memory, conversational history, and semantic caching with Redis LangCache)
- **LangGraph** (AI workflow orchestration)
- **HTML + CSS + Vanilla JS** (Frontend)

### AI Providers
- **OpenAI Version**: OpenAI API (GPT-4 for intelligent responses)
- **AWS Bedrock Version**: AWS Bedrock (Claude 3.5 Sonnet + Titan Text Embeddings V2)

---

## Architecture

The grocery agent uses a LangGraph-powered AI agent that routes requests through specialized tools.

1. **Cache Check**: First checks Redis semantic cache for similar queries
2. **AI Agent**: Routes to appropriate tools based on request type
3. **Specialized Tools**: Recipe ingredients, product search, cart operations, direct answers
4. **Modules Layer**: Product, cart, and chat modules
5. **Redis Storage**: Vector embeddings, semantic cache, and session data

### Project architecture

```
modules/
  ├── products/                # Product Business Component
  │   ├── api/                    # REST API endpoints
  │   ├── domain/                 # Business logic
  │   └── data/                   # Data access layer
  ├── cart/                    # Cart Business Component
  │   ├── api/
  │   ├── domain/
  │   └── data/
  ├──chat/                     # Chat/Cache Business Component
  │   ├── api/
  │   ├── domain/
  │   └── data/
  ├── ai/agentic-shopping-workflow/     # AI Agent
  │   ├── tools/                  # API/Interface Layer
  │   │   ├── shopping-tools.js      # Products, cart and cooking-knowledge tools
  │   │   └── memory-tools.js        # Conversation and shopper-preference memory tools
  │   ├── nodes.js                # Agent Logic
  │   ├── index.js                # Orchestration
  │   └── state/                  # Data Access
```
---

## API Endpoints

- `POST /api/chat` - Main chat interface for AI shopping assistant
- `GET /api/products/search` - Search products with text/vector similarity
- `POST /api/cart/add` - Add items to shopping cart
- `GET /api/cart` - View cart contents
- `DELETE /api/cart` - Clear cart

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Maintainers

- **Ashwin Hariharan** - [@booleanhunter](https://github.com/booleanhunter)

---

## License

This project is licensed under the MIT License - see the [LICENSE](/LICENSE) file for details.

---

## 🐞 Reporting Issues

If you find a bug or have a feature request, [open an issue](https://github.com/redis-developer/shopping-ai-agent-langgraph-js-demo/issues).

---

## Motivations

This project is a learning-focused demonstration designed to help developers understand:It shows how the pieces of an AI-powered shopping assistant fit together, and it isn't meant to be a finished store. It's for developers who want to see:

- **AI building blocks**: embeddings and vector search, semantic caching, agent memory, and tool-calling workflows
- **Application structure**: a layout for AI apps that keeps routes, business logic, and data access apart
- **Integration**: Wiring AI frameworks, LLM provider (OpenAI or AWS Bedrock), Databases, and Redis Agent Memory into one working app

What this project does NOT focus on:

❌ Complete business logic (e.g., real order systems, inventory management, payment processing)
❌ Production-ready authentication/authorization

---
