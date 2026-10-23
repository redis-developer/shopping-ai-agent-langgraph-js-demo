# Contributing

How to write code for this project. Read the [design principles](./AGENTS.md#design-principles) and the aims of the project in [AGENTS.md](./AGENTS.md) first, since they decide how much to build and what to leave out.

## Before you start developing

### Update the packages

Update the packages first, every time.

1. Run `npm outdated --workspaces --include-workspace-root`. The two provider packages under `src/modules/ai/providers/*` have their own `package.json`, so check them too.
2. Update everything to its latest version, including major versions.
3. Run `npm run typecheck`, then start the app and use it to check that it still works.
4. If a package cannot move to its latest version, leave it and say why in the commit message.

### Install and use the official agent skills

When something you are building is covered by an official skill, load it and follow it instead of working from memory. These libraries change often, and the skills carry the current APIs and patterns.

- **LangChain and LangGraph:** [langchain-ai/langchain-skills](https://github.com/langchain-ai/langchain-skills). Use `langgraph-fundamentals` for the workflow (state, nodes, edges, streaming), `langchain-fundamentals` for tools, `langchain-rag` for retrieval, `langgraph-persistence` for memory and checkpointing, and `langchain-dependencies` for package versions.
- **Redis:** [redis/agent-skills](https://github.com/redis/agent-skills). Use `redis-search` for indexes, vector search and hybrid retrieval, `redis-semantic-cache` for LangCache, `iris-development` for Agent Memory, `redis-core` for data structures and key naming, and `redis-connections` for the client.
- **Trying the UI in a browser:** `playwright-cli` for checking the pages you changed.

## Architecture

Structure the code following the patterns in [Organizing AI Applications: Lessons from traditional software architecture](https://dev.to/redis/organizing-ai-applications-lessons-from-traditional-software-architecture-mpe). Read it before adding a module, a tool, a provider or a workflow node.

## Code style

- Use whole words for names, with no abbreviations and no single letters (except iterators, counters etc). Name a variable meaningfully for what it holds.
- Write `else if` chains with braces on every branch.
- Do not add logs that are not needed.
- Fix a problem at its source, not where it shows up.
- Both AI providers (`openai` and `aws-bedrock`) must keep working. A change to one is made to both, or noted.

## Front end

Keep three things apart: HTML holds the content and structure (which elements exist, their order and text), CSS holds the look, and JavaScript holds the behaviour. The look means how things are presented: colours, fonts, sizes, spacing, borders, shadows, layout and animation.

**HTML**
- Use semantic elements, with page landmarks (`header`, `main`, `nav`, `aside`, `footer`), a sensible heading order, lists for lists, and `button` and `a` for what each is meant for. Use a `div` or `span` only when no semantic element fits.
- Give every form input a `label`.
- Build repeated markup from a `<template>` in the view, not with `createElement` calls.

**Accessibility**
- Use native elements before ARIA, and keep keyboard use and visible focus working.
- Give images alt text, keep contrast readable, and respect reduced motion.

**CSS and themes**
- A theme is a folder in `src/client/themes/<theme-name>/` with a shared `theme.css` and one stylesheet for each page. The views link to it and put `<theme-name>-theme` on `<body>`.
- A new look is a new theme, written in CSS only. Apart from pointing the views at the theme (its `<link>` tags and the class on `<body>`), changing the look needs no change to the templates in `src/views/` or to the JavaScript. Edit those only when the content, structure or behaviour changes, for example for a new feature.
- Put colours, shadows, borders and spacing in CSS variables in `theme.css`, so a theme can change them in one place.
- Name classes for what a thing is, not how it looks. No inline styles and no `!important`. The layout has to work on a phone.

**JavaScript**
- JavaScript decides what to show, never how it looks. Do not set `element.style`, `style.cssText` or inline `style` attributes. Switch a class or an attribute (`classList`, `hidden`, `data-*`) and let the CSS do the rest.
- One component owns one piece of the page. Network calls live in `services/`, and components do not call `fetch`.
- State lives in data, not in the page. No globals.
- Text from the model or the user is escaped before it goes into `innerHTML`.
