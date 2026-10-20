/**
 * Grocery workflow caching utilities
 */

/**
 * Determine cache TTL based on tool execution results
 * @param toolResults - Structured tool execution results
 * @returns TTL in milliseconds (0 = don't cache)
 */
export function determineToolBasedCacheTTL(toolResults: { toolName: string; success: boolean; error?: string; result?: unknown }[] = []) {
    // Check if any tool execution failed
    for (const toolResult of toolResults) {
        if (toolResult.success === false) {
            console.log(`⚠️ Tool failure detected (${toolResult.toolName}), skipping cache`);
            return 0; // Don't cache failures
        }
    }

    // Extract tool names for TTL logic
    const toolNames = toolResults.map(tr => tr.toolName);

    // Don't cache personal/dynamic operations and memory operations
    const personalTools = [
        'add_to_cart',
        'view_cart',
        'clear_cart',
        'save_memory',              // Memory write operation - never cache
        'view_recent_conversation', // Conversation changes every turn - never cache
        'search_my_memories'        // Memory searches should always be fresh - never cache
    ];

    if (personalTools.some(tool => toolNames.includes(tool))) {
        console.log(`🚫 Personal/dynamic operation detected: ${toolNames.filter((toolName) => personalTools.includes(toolName)).join(', ')}`);
        return 0; // Don't cache
    }

    // Long TTL for recipe/ingredient content (changes rarely)
    const recipeTools = [
        'find_recipe_ingredient_products'  // Recipe ingredients don't change often
    ];

    if (recipeTools.some(tool => toolNames.includes(tool))) {
        console.log(`🍳 Recipe content detected: ${toolNames.filter((toolName) => recipeTools.includes(toolName)).join(', ')}`);
        return 24 * 60 * 60 * 1000; // 24 hours
    }

    // Medium TTL for general knowledge (static content)
    const knowledgeTools = [
        'direct_answer'            // General cooking/food knowledge is static
    ];

    if (knowledgeTools.some(tool => toolNames.includes(tool))) {
        console.log(`📚 Knowledge content detected: ${toolNames.filter((toolName) => knowledgeTools.includes(toolName)).join(', ')}`);
        return 12 * 60 * 60 * 1000; // 12 hours
    }

    // Short TTL for product searches (prices/availability change)
    const searchTools = [
        'search_products'
    ];

    if (searchTools.some(tool => toolNames.includes(tool))) {
        console.log(`🔍 Product search detected: ${toolNames.filter((toolName) => searchTools.includes(toolName)).join(', ')}`);
        return 2 * 60 * 60 * 1000; // 2 hours
    }

    // Default for direct responses or unknown tools
    console.log(`🤷 Default TTL for tools: ${toolNames.join(', ')}`);
    return 6 * 60 * 60 * 1000; // 6 hours default
}
