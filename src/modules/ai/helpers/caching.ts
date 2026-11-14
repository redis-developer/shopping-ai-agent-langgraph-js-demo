/**
 * Grocery workflow caching utilities
 */

import { log } from "#lib/log";

// Our own tools whose results are personal or dynamic, or that change something
const NON_CACHEABLE_TOOLS = [
    'add_to_cart',
    'view_cart',
    'clear_cart',
    'save_memory',              // Memory write operation - never cache
    'view_recent_conversation', // Conversation changes every turn - never cache
    'search_my_memories'        // Memory searches should always be fresh - never cache
];

// Context Retriever names its tools after the entity they read, like search_product_by_text or get_cart_by_id.
// A reply can be cached only if each of its Context Retriever tools matches one of these patterns.
// The patterns have to match the entity names, so update them when the entities change.
const CACHEABLE_TOOL_PATTERNS = [/product/i];

// A tool from Context Retriever that matches none of the patterns reads live or personal data, like a shopper's cart.
// A tool for a new entity is not cached until its entity is added to CACHEABLE_TOOL_PATTERNS.
const isNeverCached = ({ toolName, source }: { toolName: string; source?: string }) =>
    NON_CACHEABLE_TOOLS.includes(toolName)
    || (source === "context-retriever" && !CACHEABLE_TOOL_PATTERNS.some((pattern) => pattern.test(toolName)));

/**
 * Determine cache TTL based on tool execution results
 * @param toolResults - Structured tool execution results, with the source of each tool when it has one
 * @returns TTL in milliseconds (0 = don't cache)
 */
export function determineToolBasedCacheTTL(toolResults: { toolName: string; success: boolean; source?: string; error?: string; result?: unknown }[] = []) {
    // Check if any tool execution failed
    for (const toolResult of toolResults) {
        if (toolResult.success === false) {
            log(`caching: ${toolResult.toolName} failed, so not cached`);
            return 0; // Don't cache failures
        }
    }

    // Extract tool names for TTL logic
    const toolNames = toolResults.map(tr => tr.toolName);

    // Don't cache personal/dynamic operations, memory operations and live data
    if (toolResults.some(isNeverCached)) {
        return 0; // Don't cache
    }

    // Long TTL for recipe/ingredient content (changes rarely)
    const recipeTools = [
        'get_recipe_ingredients'  // Recipe ingredients don't change often
    ];

    if (recipeTools.some(tool => toolNames.includes(tool))) {
        log(`caching: recipe content (${toolNames.filter((toolName) => recipeTools.includes(toolName)).join(', ')}), 24h`);
        return 24 * 60 * 60 * 1000; // 24 hours
    }

    // Short TTL for product searches (prices/availability change), through our own tool or through Context Retriever
    const searchResults = toolResults.filter(({ toolName, source }) =>
        toolName === 'search_products'
        || (source === "context-retriever" && CACHEABLE_TOOL_PATTERNS.some((pattern) => pattern.test(toolName)))
    );

    if (searchResults.length > 0) {
        log(`caching: product search (${searchResults.map(({ toolName }) => toolName).join(', ')}), 2h`);
        return 2 * 60 * 60 * 1000; // 2 hours
    }

    // Default for direct responses or unknown tools
    log(`caching: default for the tools used (${toolNames.join(', ') || 'none'}), 6h`);
    return 6 * 60 * 60 * 1000; // 6 hours default
}
