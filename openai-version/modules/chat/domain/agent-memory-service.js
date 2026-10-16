import memoryRepository from '../data/agent-memory-repository.js';

// The custom memory type and its fields, as configured in the Agent Memory service
// (see the Redis Agent Memory setup in the main README). The topics are the type's field names.
const CUSTOM_MEMORY_TYPE = 'shopper_preference';
export const CUSTOM_TOPICS = ['dietary_restrictions', 'food_preferences', 'standing_instructions'];

/**
 * Get the conversation for a session: the recent messages and the summary of earlier ones
 * @param {string} sessionId - Session ID
 */
export async function getWorkingMemory(sessionId) {
    return memoryRepository.getWorkingMemory(sessionId);
}

/**
 * Save one conversation turn (the user's message and the assistant's reply) to a session
 * @param {string} sessionId - Session ID
 * @param {string} userId - User ID
 * @param {string} userMessage - What the user said
 * @param {string} assistantReply - What the assistant replied
 */
export async function addConversationTurn(sessionId, userId, userMessage, assistantReply) {
    return memoryRepository.addConversationTurn(sessionId, userId, userMessage, assistantReply);
}

/**
 * Search all of a user's long-term memories, whatever their type
 * @param {string} userId - User ID
 * @param {string} query - What to search for
 */
export async function searchLongTermMemories(userId, query) {
    return memoryRepository.searchLongTermMemory({ text: query, userId });
}

/**
 * Search only the user's saved shopper preferences
 * @param {string} userId - User ID
 * @param {string} query - What to search for
 * @param {number} [limit] - Maximum number of results
 */
export async function searchShopperPreferences(userId, query, limit = 5) {
    return memoryRepository.searchLongTermMemory({ text: query, userId, memoryType: CUSTOM_MEMORY_TYPE, limit });
}

/**
 * Save a shopper preference for the user
 * @param {string} userId - User ID
 * @param {string} fact - The preference to remember
 * @param {Array<string>} topics - Which kinds of preference this is (see CUSTOM_TOPICS)
 */
export async function saveShopperPreference(userId, fact, topics) {
    return memoryRepository.createLongTermMemories([{
        text: fact,
        memoryType: CUSTOM_MEMORY_TYPE,
        topics,
        userId
    }]);
}
