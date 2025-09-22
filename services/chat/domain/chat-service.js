import ChatRepository from '../data/chat-repository.js';
import { getGroceryShoppingReply } from '../../ai/grocery-ai-agent/index.js';

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
 * End user session and clear chat data
 * @param {string} sessionId - User session ID
 */
export async function endUserSession(sessionId) {
    return chatRepository.deleteChats(sessionId);
}

/**
 * Get reply from grocery AI agent
 * @param {string} sessionId - User session ID
 * @param {string} chatId - Chat ID
 * @param {string} message - User message
 * @param {boolean} useSmartRecall - Whether to use smart recall caching
 */
export async function getReplyFromGroceryAgent(sessionId, chatId, message, useSmartRecall) {
    return getGroceryShoppingReply(sessionId, chatId, message, useSmartRecall);
}
