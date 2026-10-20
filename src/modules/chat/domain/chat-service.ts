import { runShoppingAgentWorkflow } from '#modules/ai/workflows/agent/index';

/**
 * Get reply from Shopping AI agent
 * @param userId - User ID (the shopper, stable across sessions)
 * @param sessionId - Session ID (one conversation)
 * @param message - User message
 * @param lookupSimilarResponses - Whether to look up similar earlier responses in the semantic cache (saving to it always happens)
 */
export async function processShoppingInquiry(userId: string, sessionId: string, message: string, lookupSimilarResponses: boolean) {
    return runShoppingAgentWorkflow(userId, sessionId, message, lookupSimilarResponses);
}
