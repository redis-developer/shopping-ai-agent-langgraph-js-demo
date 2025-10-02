import { LangCache } from "@redis-ai/langcache";
import { SearchStrategy } from '@redis-ai/langcache/models/searchstrategy.js';
import { getRedisClient } from '../../db/redis-client.js';

import CONFIG from '../../../config.js';

// Initialize LangCache client
const langCache = new LangCache({
    serverURL: CONFIG.langcacheApiBaseUrl,
    cacheId: CONFIG.langcacheCacheId,
    apiKey: CONFIG.langcacheApiKey,
});

/**
 * @typedef {Object} ChatMessage
 * @property {'user' | 'assistant'} role
 * @property {string} content
 */

export default class ChatRepository {

    /**
     * Retrieve chat history
     * @param {string} sessionId
     * @param {string} chatId
     * @returns {Promise<ChatMessage[]>}
     */
    async getOrCreateChatHistory(sessionId, chatId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        const chatHistory = await client.json.get(userKey, {
            path: `$.chat.${chatId}`,
        });

        if (!chatHistory) { // if user session itself does not exist
            await client.json.set(userKey, '$', {
                sessionId: sessionId,
                chat: {
                    [chatId]: [],
                },
                cart: {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            return [];
        } else if (chatHistory.length === 0) { // if user session exists but chatId does not
            await client.json.set(userKey, `$.chat.${chatId}`, []);
            return [];
        } else {
            return chatHistory[0];
        }
    }

    /**
     * Save chat history
     * @param {string} sessionId
     * @param {string} chatId
     * @param {ChatMessage} chatMessage
     */
    async saveChatMessage(sessionId, chatId, chatMessage) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        await client.json.set(userKey, '$.updatedAt', new Date().toISOString());
        return client.json.arrAppend(userKey, `$.chat.${chatId}`, chatMessage);
    }

    /**
     * Delete session including all chat messages for a given sessionId
     * @param {string} sessionId
     */
    async deleteChats(sessionId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        return client.json.del(userKey);
    }

    /**
     * Search user query in langcache
     * @param {string} query
     * @param {string} [sessionId] - Optional session identifier to scope the search
     */
    async findFromSemanticCache(query, sessionId) {
        const searchParams = {
            prompt: query,
            searchStrategies: [SearchStrategy.Exact, SearchStrategy.Semantic]
        };

        // Only add sessionId to attributes if it's provided
        if (sessionId) {
            searchParams.attributes = {
                "sessionId": sessionId,
            };
        }

        const result = await langCache.search(searchParams);

        return result.data?.[0]?.response || null;
    }

    /**
     * Save results in Redis Langcache.
     * @async
     * @param {string} query - The original user query to store as the semantic prompt.
     * @param {string} aiReplyMessage - The AI-generated response to be cached.
     * @param {number} ttlMillis - Time-to-live in milliseconds for the cached entry.
     * @param {string} [sessionId] - Optional unique identifier for the user session.
     */
    async saveResponseInSemanticCache(query, aiReplyMessage, ttlMillis, sessionId) {
        const cacheParams = {
            prompt: query,
            response: aiReplyMessage,
            ttlMillis,
        };

        // Only add sessionId to attributes if it's provided
        if (sessionId) {
            cacheParams.attributes = {
                "sessionId": sessionId
            };
        }

        const result = await langCache.set(cacheParams);

        return result;
    }

    /**
     * Clear all semantic cache entries associated with a session.
     * 
     * @async
     * @param {string} sessionId - The session identifier used to scope cache entries.
     */
    async clearSemanticCache(sessionId) {
        const result = await langCache.deleteQuery({
            attributes: {
                "sessionId": sessionId
            }
        });
    
        return result.deletedEntriesCount;
    }
}
