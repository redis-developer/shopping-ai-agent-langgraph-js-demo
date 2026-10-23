# AGENTS.md

Guidance for AI agents (and people) working on this project. If you are asked to review code, follow "Reviewing code" below.

## About the project

This is an agentic-ai based shopping assistant app. It is a **demo** and a teaching project, for developers who are new to Redis, LangGraph or AI agents.

### What this project aims to demonstrate

The goal is to give them a working, readable example of how to build an AI application well, and why it is built that way. It aims to show:

- **AI application structure:** a layout that keeps routes, business logic and data access apart, so the AI parts are easy to find, test and change.
- **A fast data layer for AI apps:** how one data store can serve an AI app's memory, caching, retrieval and search, and how that cuts cost and latency (implemented with Redis Iris).
- **Agent workflows:** tool calling, and how a workflow is put together (state, nodes, routing, streaming).
- **Agent memory:** how short-term (working) memory and long-term memory differ, what each one holds, when it is read and written, and how it reaches the prompt. (implemented using Redis Agent Memory).
- **RAG and agentic RAG:** retrieving by meaning, by filters or by both, and letting the agent decide when and what to retrieve through its tools, including tools generated from the underlying data model (using Redis Context Retriever).
- **Semantic caching:** what is safe to cache and what is not (anything personal or live), and the cost and latency it saves (using Redis LangCache).
- **Integration and portability:** how a framework, a model provider and a data store are wired into one app, and how the same patterns apply with a different provider or framework.

It does not aim to demonstrate complete business logic (real order systems, inventory management, payment processing) or production-ready authentication and authorisation. Those stay simple on purpose.

## Design principles

The more complicated the codebase gets, the harder it is to follow, and a tutorial that can't be followed teaches nothing. Balance three things:

- **Simplicity:** a reader only needs to know what the lesson needs. Use the fewest tools, libraries and concepts, and do not pick one that readers would have to learn first. For example, the front end is plain HTML, CSS and JavaScript, not React, because React would assume the reader knows it.
- **Longevity:** it is easy to test, and to move to another provider or framework.
- **Solid foundations:** the way the code is structured and organised is a pattern that would hold up if it were applied in production. It stays robust, is easy to extend, and can scale. This is about the architecture and the patterns, not about making the app's own features production-grade. The features stay as simple as the lesson needs.

Choose a structure that would carry over to production when it is cheap and keeps the code easy to read, such as separating layers, validating config, handling errors, and not hard-coding settings. Leave out anything that only matters for a production version of the features themselves, or that would bury the lesson under extra code, extra layers or extra files.

When something is left out on purpose, say so in a comment or the README, so readers know it is a choice. A new abstraction, helper or file has to earn its place: if only one thing uses it, it is probably too much.

The rules for writing code (style, architecture, front end, and the decisions to keep) are in [CONTRIBUTING.md](./CONTRIBUTING.md). They apply to every change.

## Reviewing code

Read "About the project", "Design principles" and [CONTRIBUTING.md](./CONTRIBUTING.md) first. A review checks the code against them and asks one question: **would a reader learn the right lesson from this code?** Write plain observations, with no scores, rankings or counts.

These criteria are the review. Do not replace them with a general search for bugs out of context.

### What to look for during a review:

Check the code against the patterns in [Organizing AI Applications: Lessons from traditional software architecture](https://dev.to/redis/organizing-ai-applications-lessons-from-traditional-software-architecture-mpe) and these concepts:

- Separation of concerns
- Three-tier architecture (API, domain, data)
- Repository pattern
- Modules by business domain (bounded contexts)
- Co-location: code that changes together lives together
- High cohesion, loose coupling
- Single responsibility
- Dependency inversion
- Ports and adapters (tools, routes and providers are thin adapters over domain logic)
- DRY
- KISS
- YAGNI
- Explicit over implicit
- Testability
- Twelve-factor config (settings from the environment, none hard-coded)
- Fail fast, and degrade gracefully
- Separation of persistent data from agent memory
- Least surprise (names, folders and behaviour are what a reader expects)

These concepts are guidance and not rigid law. Raise a departure only when it would teach the wrong thing or make the code harder to follow.

Also check that the change follows the design principles above (is it simple enough for a reader who knows only what the lesson needs?), that the app works on the normal path, that the README and the diagrams in `docs/` match the code, that the change does not add model tokens, calls or latency without a reason, and that `npm run typecheck` passes.

### What to leave out during a review:

Heavy production concerns are not goals of this project, and adding them would make the code harder to follow:

- Concurrent updates and race conditions
- Production-system order processing, payments and stock
- Data privacy, personal data handling, authentication and authorisation
- Rate limiting, abuse, hostile input and other hardening
- Scaling, retries, failover, monitoring and other operations work

If one of these is truly worth knowing, say so in one line at the end, as a note and not as a finding.
