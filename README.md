# 🛒 Shopping AI Agent with LangGraph.js

**Redis-powered grocery shopping e-commerce app with AI shopping assistance.**

Redish is an AI-powered grocery shopping platform that combines Redis's speed with LangGraph's intelligent workflow orchestration. Get personalized recipe recommendations and smart product suggestions, with answers in a flash.

![App home page](./docs/screenshots/home-screen.png)

## Product Features

- **Vibe Shopping**: Describe a mood or occasion in everyday words, like "cozy movie night snacks" or "a light summer lunch", and get products that fit, using semantic search
- **Product Search**: Find products by name, category, or description.
- **Recipe Ingredients**: Ask for ingredients for any recipe and get suggested products.
- **Product Cards**: Products the assistant finds show up as cards in the chat, each with an Add to cart button and a product details view.
- **Smart Recommendations**: AI suggests alternatives and complementary items.
- **Cart Management**: Add, remove, and view cart items through natural conversation.

## Technical features

- **Vector Search**: Find products using AI-powered similarity search
- **Agent Memory**: For storing conversations, summarizing long ones, and remembering shopper preferences across sessions, using Redis Agent Memory
- **Semantic Cache**: Similar queries return instantly using Redis LangCache
- **Multi-tool Agentic workflow**: AI agent routing and tool calling

---

## Setup

### Step 1: Redis database

Redis stores the products, their vector embeddings and the shopping carts. It needs the JSON and Search capabilities, which Redis Cloud databases support (and Redis 8 includes).

[Create a database in Redis Cloud](https://redis.io/docs/latest/operate/rc/databases/create-database), then add its connection string to your `.env` file:

```bash
REDIS_URL="redis://default:your_password@your_redis_host:your_redis_port"
```

The Redis Agent Memory and LangCache service in Steps 2 and 3 also runs on a Redis Cloud database, and you can pick this one.

### Step 2: Redis Agent Memory

The app stores conversations and shopper preferences in [Redis Agent Memory](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/). Create a service in the Redis Cloud console (see the [TypeScript SDK quickstart](https://redis.io/docs/latest/develop/ai/context-engine/agent-memory/typescript-sdk-quickstart/) for the steps), then add its connection details to the `.env` file at the repo root:

```bash
AGENT_MEMORY_URL="your_agent_memory_endpoint"
AGENT_MEMORY_STORE_ID="your_store_id"
AGENT_MEMORY_API_KEY="your_agent_memory_api_key"
# AGENT_MEMORY_NAMESPACE_ID="your_namespace_id"  # Optional: scope memories to a namespace
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
| Short-term TTL | About a week |
| Long-term TTL | 365 days |
| Extraction cadence | 1 minute while testing, 5 to 15 minutes in production |
| Automatic summarization | After about 12 to 20 messages while testing, about 100 in production |

### Step 3: Redis LangCache

The knowledge bank, which lets similar questions reuse an earlier answer, is a semantic cache built on [Redis LangCache](https://redis.io/langcache/). Create a LangCache service in the Redis Cloud console by following [Create a LangCache service](https://redis.io/docs/latest/operate/iris/langcache/create-service/), with two things in mind:

- Select **Create custom service** and, under **Attributes settings**, add a custom attribute named `userId`. The app saves each cache entry with it.
- Copy the service key when it's shown. It's only available once, right after the service is created.

Then add the service details to your `.env` file. The API base URL and cache ID are in the **Connectivity** section of the service's **Configuration** page:

```bash
LANGCACHE_API_KEY="your_langcache_service_key"
LANGCACHE_API_BASE_URL="your_langcache_api_base_url"
LANGCACHE_CACHE_ID="your_langcache_cache_id"
```

### Step 4: Choose an AI provider

Copy `.env.example` to `.env`, set `AI_PROVIDER`, and follow the setup for the provider you picked:

| `AI_PROVIDER` | Chat model and embeddings | Guardrails | Setup |
|---|---|---|---|
| `openai` (default) | OpenAI `gpt-4o-mini` (change it with `MODEL_NAME`) and `text-embedding-3-small` | None | [docs/providers/openai.md](docs/providers/openai.md) |
| `aws-bedrock` | AWS Bedrock Claude (default `global.anthropic.claude-opus-4-7`) and Titan Text Embeddings V2 | ✅ Bedrock Guardrails | [docs/providers/aws-bedrock.md](docs/providers/aws-bedrock.md) |

### Step 5: Install dependencies and load sample dataset

```bash
cp .env.example .env       # then fill in your values
npm run install:openai     # or: npm run install:aws-bedrock
npm run load-products      # load the sample groceries (first time only)
```

`npm run install:<provider>` installs the app and the one provider you chose. A plain `npm install` installs every provider.

If you switch providers, reload the products with `npm run load-products -- --drop`, so the stored vectors match the new provider's embeddings.

### Step 6: Run and view the app

```bash
npm start # Starts the app
```

#### Prefer Docker?

1. Run `docker compose up`
2. Next, run `docker compose exec redish-app npm run load-products`.

Open [localhost:3000](http://localhost:3000) (or whatever `SERVER_PORT` you have provided)

#### Try different shoppers

Add `?name=` to the URL to act as a different shopper, for example `http://localhost:3000/?name=ashwin`. Without it, you're "User".

- Each shopper has their own cart and their own saved preferences, so a shopping preference you give as one shopper doesn't show up for another.
- The browser remembers the shopper's chat session. Changing the name starts a new conversation.

---

## Tech Stack

### Core Technologies
- **Node.js** + **Express** (Backend API)
- **Redis** (Product store, agentic AI memory, conversational history, and semantic caching with Redis LangCache)
- **LangGraph** (AI workflow orchestration)
- **HTML + CSS + Vanilla JS** (Frontend)

### AI Providers
Pick one with `AI_PROVIDER`:
- **OpenAI**: OpenAI API (`gpt-4o-mini` by default, plus `text-embedding-3-small` embeddings)
- **AWS Bedrock**: AWS Bedrock (Claude, plus Titan Text Embeddings V2 and Guardrails)

---

## Architecture

The grocery agent uses a LangGraph-powered AI agent that routes requests through specialized tools.

1. **Cache Check**: First checks Redis semantic cache for similar queries
2. **AI Agent**: Routes to appropriate tools based on request type
3. **Specialized Tools**: Recipe ingredients, product search, cart operations, direct answers
4. **Modules Layer**: Product, cart, and chat modules
5. **Redis Storage**: Vector embeddings, semantic cache, and session data

### Overview

**Default flow using OpenAI:**

![Agentic AI workflow, OpenAI](./docs/technical-diagrams/architecture-overview.png)

**Flow with AWS Bedrock as the provider** (adds a "front-desk" agent and PII guardrails):

![Agentic AI workflow, AWS Bedrock](./docs/technical-diagrams/architecture-overview-aws-bedrock.png)

### Components and request flow

![Components and request flow](./docs/technical-diagrams/component-diagram-mermaid.svg)

### Agent graph

Generated by langgraph

**Default workflow with OpenAI**

![Agent graph, OpenAI](./docs/technical-diagrams/agent-graph-openai.png)

**Workflow with AWS Bedrock**

![Agent graph, AWS Bedrock](./docs/technical-diagrams/agent-graph-aws-bedrock.png)

### Project architecture

```
docs/                             # Architecture diagrams, screenshots and provider setup guides
src/
  ├── index.ts, config.ts         # Server and configuration (AI_PROVIDER, keys)
  ├── client/                     # UI (chat, product cards)
  │   ├── javascripts/                # Page scripts, components and UI logic
  │   └── themes/                     # Stylesheets
  ├── views/                      # Handlebars pages
  ├── lib/                        # Shared helpers (errors)
  ├── scripts/                    # load-products.ts, debug-config.ts
  └── modules/
      ├── products/               # Product Business Component
      │   ├── api/                    # REST API endpoints
      │   ├── domain/                 # Business logic
      │   └── data/                   # Data access layer
      ├── cart/                   # Everything related to Cart operations
      │   ├── api/
      │   ├── domain/
      │   └── data/
      ├── chat/                   # Chat, Agent Memory and knowledge bank features
      │   ├── api/
      │   ├── domain/
      │   └── data/
      ├── db/                     # Shared Redis client
      └── ai/                     # Everything AI-related
          ├── providers/          # One package per AI provider, chosen by AI_PROVIDER
          │   ├── index.ts           # Loads the chosen provider
          │   ├── openai/            # Chat model, embeddings, sanitizing
          │   └── aws-bedrock/       # Same, plus guardrails
          ├── workflows/agent/    # The LangGraph shopping agent
          │   ├── tools/             # Interface layer
          │   │   ├── shopping-tools.ts  # Products, cart and cooking-knowledge tools
          │   │   └── memory-tools.ts    # Conversation and shopper-preference memory tools
          │   ├── nodes.ts           # Agent logic
          │   ├── state.ts           # Graph state
          │   └── index.ts           # Orchestration
          └── helpers/            # Cache rules, token usage tracking
```

---

## API Endpoints

### Home

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` (also `/app`) | The shopping page with the docked chat |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Main chat interface for AI shopping assistant |
| `GET` | `/api/ai/chat/context` | A shopper's saved preferences, session summary and earlier sessions (`userId` and `sessionId` query parameters) |
| `GET` | `/api/ai/chat/sessions/:sessionId` | The messages of a session, to continue it in the chat |

### Products

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products/:productId` | One product, as JSON |
| `GET` | `/products/:productId` | The product page (HTML) |

### Cart

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cart/add` | Add an item to a shopper's cart |
| `GET` | `/api/cart/:userId` | View a shopper's cart |
| `DELETE` | `/api/cart/:userId/:productId` | Remove one item from the cart |
| `DELETE` | `/api/cart/:userId` | Clear the cart |

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

This project is a learning-focused demonstration designed to help developers understand:

- **AI building blocks**: embeddings and vector search, semantic caching, agent memory, and tool-calling workflows
- **Application structure**: a layout for AI apps that keeps routes, business logic, and data access apart
- **Integration**: Wiring AI frameworks, LLM provider (OpenAI or AWS Bedrock), Databases, and Redis Agent Memory into one working app

**❌ What this project does NOT focus on:**

- Complete business logic (e.g., real order systems, inventory management, payment processing)
- Production-ready authentication/authorization

---
