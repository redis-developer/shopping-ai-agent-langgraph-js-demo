import memoryRepository from '../data/agent-memory-repository.ts';
import type { Attachment } from './attachments.ts';

// The custom memory type and its fields, as configured in the Agent Memory service
// (see the Redis Agent Memory setup in the main README). The topics are the type's field names.
const CUSTOM_MEMORY_TYPE = 'shopper_preference';
export const CUSTOM_TOPICS = ['dietary_restrictions', 'food_preferences', 'standing_instructions'] as const;

/**
 * Get the conversation for a session: the recent messages and the summary of earlier ones
 * @param sessionId - Session ID
 */
export async function getWorkingMemory(sessionId: string) {
    return memoryRepository.getWorkingMemory(sessionId);
}

/**
 * List the IDs of a user's sessions
 * @param userId - User ID
 */
export async function listSessionIds(userId: string) {
    return memoryRepository.listSessionIds(userId);
}

/**
 * Save one conversation turn (the user's message and the assistant's reply) to a session
 * @param sessionId - Session ID
 * @param userId - User ID
 * @param userMessage - What the user said
 * @param assistantReply - What the assistant replied
 * @param attachments - Content shown with the reply
 */
export async function addConversationTurn(sessionId: string, userId: string, userMessage: string, assistantReply: string, attachments: Attachment[]) {
    return memoryRepository.addConversationTurn(sessionId, userId, userMessage, assistantReply, attachments);
}

/**
 * Search all of a user's long-term memories, whatever their type
 * @param userId - User ID
 * @param query - What to search for
 */
export async function searchLongTermMemories(userId: string, query: string) {
    return memoryRepository.searchLongTermMemory({ text: query, userId });
}

/**
 * Search only the user's saved shopper preferences
 * @param userId - User ID
 * @param query - What to search for
 * @param limit - Maximum number of results
 */
export async function searchShopperPreferences(userId: string, query: string, limit = 5) {
    return memoryRepository.searchLongTermMemory({ text: query, userId, memoryType: CUSTOM_MEMORY_TYPE, limit });
}

/**
 * Save a shopper preference for the user
 * @param userId - User ID
 * @param fact - The preference to remember
 * @param topics - Which kinds of preference this is (see CUSTOM_TOPICS)
 */
export async function saveShopperPreference(userId: string, fact: string, topics: string[]) {
    return memoryRepository.createLongTermMemories([{
        text: fact,
        memoryType: CUSTOM_MEMORY_TYPE,
        topics,
        userId
    }]);
}
