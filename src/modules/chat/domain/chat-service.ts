import { runShoppingAgentWorkflow } from '#modules/ai/workflows/agent/index';
import { getWorkingMemory, listSessionIds, searchShopperPreferences } from '#modules/chat/domain/agent-memory-service';

// How many of the shopper's latest sessions the context lists
const MAX_LISTED_SESSIONS = 10;

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

/**
 * What the assistant knows about a shopper: the saved preferences, the summary of the current
 * session, and the shopper's latest sessions, each titled with its first message
 * @param userId - User ID
 * @param sessionId - The current session ID
 */
export async function getShopperContext(userId: string, sessionId: string) {
    const [preferences, sessionIds, currentSession] = await Promise.all([
        searchShopperPreferences(userId, 'preferences', 20),
        listSessionIds(userId),
        getWorkingMemory(sessionId)
    ]);

    // Session IDs end with the time the session started, so the largest number is the newest
    const startTime = (id: string) => Number(id.split('-').at(-1));
    const latestSessionIds = sessionIds
        .toSorted((first, second) => startTime(second) - startTime(first))
        .slice(0, MAX_LISTED_SESSIONS);

    const sessions = await Promise.all(latestSessionIds.map(async (id) => {
        const { messages } = await getWorkingMemory(id);
        const firstUserMessage = messages.find((message) => message.role === 'user');
        return { sessionId: id, title: firstUserMessage?.content ?? '', startedAt: messages[0]?.createdAt };
    }));

    return {
        preferences: preferences.map((preference) => preference.text),
        conversationSummary: currentSession.summary,
        sessions
    };
}
