/**
 * Grocery workflow caching utilities
 */

/**
 * Determine cache TTL based on tools used (more reliable than text parsing)
 * @param {Array} toolsUsed - Array of tool names that were executed
 * @returns {number} TTL in milliseconds (0 = don't cache)
 */
export function determineToolBasedCacheTTL(toolsUsed) {
    // Don't cache personal/dynamic operations
    const personalTools = [
        'add_to_cart',
        'view_cart',
        'clear_cart'
    ];

    if (personalTools.some(tool => toolsUsed.includes(tool))) {
        console.log(`🚫 Personal operation detected: ${toolsUsed.filter(t => personalTools.includes(t)).join(', ')}`);
        return 0; // Don't cache
    }

    // Long TTL for recipe/ingredient content (changes rarely)
    const recipeTools = [
        'fast_recipe_ingredients'  // Recipe ingredients don't change often
    ];

    if (recipeTools.some(tool => toolsUsed.includes(tool))) {
        console.log(`🍳 Recipe content detected: ${toolsUsed.filter(t => recipeTools.includes(t)).join(', ')}`);
        return 24 * 60 * 60 * 1000; // 24 hours
    }

    // Medium TTL for general knowledge (static content)
    const knowledgeTools = [
        'direct_answer'            // General cooking/food knowledge is static
    ];

    if (knowledgeTools.some(tool => toolsUsed.includes(tool))) {
        console.log(`📚 Knowledge content detected: ${toolsUsed.filter(t => knowledgeTools.includes(t)).join(', ')}`);
        return 12 * 60 * 60 * 1000; // 12 hours
    }

    // Short TTL for product searches (prices/availability change)
    const searchTools = [
        'search_products'
    ];

    if (searchTools.some(tool => toolsUsed.includes(tool))) {
        console.log(`🔍 Product search detected: ${toolsUsed.filter(t => searchTools.includes(t)).join(', ')}`);
        return 2 * 60 * 60 * 1000; // 2 hours
    }

    // Default for direct responses or unknown tools
    console.log(`🤷 Default TTL for tools: ${toolsUsed.join(', ')}`);
    return 6 * 60 * 60 * 1000; // 6 hours default
}
