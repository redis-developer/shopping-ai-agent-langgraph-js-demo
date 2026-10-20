import { runShoppingAgentWorkflow } from '#modules/ai/workflows/agent/index.js';

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
