import KnowledgeBankRepository from '../data/knowledge-bank-repository.js';

const knowledgeBankRepository = new KnowledgeBankRepository();

/**
 * Save response to semantic cache
 * @param {string} query - Original user query
 * @param {{content: string, foundProducts: Array}} response - Reply to cache, with the products shown with it
 * @param {number} ttlMillis - Time to live in milliseconds
 * @param {string} [sessionId] - Optional user session ID
 */
export async function saveToSemanticCache(query, response, ttlMillis, sessionId) {
    await knowledgeBankRepository.saveResponseInSemanticCache(
        query,
        response,
        ttlMillis,
        sessionId
    );
    
    const ttlDays = Math.round(ttlMillis / (24 * 60 * 60 * 1000));
    
    return {
        success: true,
        ttlDays: ttlDays,
        message: "Response cached successfully for future queries."
    };
}

/**
 * Check semantic cache for similar queries
 * @param {string} query - User query to check
 * @param {string} [sessionId] - Optional user session ID for scoped search
 * @returns {Promise<{content: string, foundProducts: Array}|null>} The cached reply and its products, or null on a miss
 */
export async function checkSemanticCache(query, sessionId) {
    return knowledgeBankRepository.findFromSemanticCache(query, sessionId);
}
