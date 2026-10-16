import { LangCache } from "@redis-ai/langcache";
import { SearchStrategy } from '@redis-ai/langcache/models/searchstrategy.js';

import CONFIG from '#config';

// Initialize LangCache client
const langCache = new LangCache({
    serverURL: CONFIG.langcacheApiBaseUrl,
    cacheId: CONFIG.langcacheCacheId,
    apiKey: CONFIG.langcacheApiKey,
});

export default class ChatRepository {

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
}
