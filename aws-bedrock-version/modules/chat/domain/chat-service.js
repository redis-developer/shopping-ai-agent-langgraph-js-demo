import ChatRepository from '../data/chat-repository.js';
import { runShoppingAgentWorkflow } from '#modules/ai/agentic-shopping-workflow/index.js';

const chatRepository = new ChatRepository();

/**
 * Save response to semantic cache
 * @param {string} query - Original user query
 * @param {string} response - Response to cache
 * @param {number} ttlMillis - Time to live in milliseconds
 * @param {string} [sessionId] - Optional user session ID
 */
export async function saveToSemanticCache(query, response, ttlMillis, sessionId) {
    await chatRepository.saveResponseInSemanticCache(
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
 */
export async function checkSemanticCache(query, sessionId) {
    return chatRepository.findFromSemanticCache(query, sessionId);
}

/**
 * Get reply from Shopping AI agent
 * @param {string} userId - User ID (the shopper, stable across sessions)
 * @param {string} sessionId - Session ID (one conversation)
 * @param {string} message - User message
 * @param {boolean} lookupSimilarResponses - Whether to look up similar earlier responses in the semantic cache (saving to it always happens)
 */
export async function processShoppingInquiry(userId, sessionId, message, lookupSimilarResponses) {
    return runShoppingAgentWorkflow(userId, sessionId, message, lookupSimilarResponses);
}
