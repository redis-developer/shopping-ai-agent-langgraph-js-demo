import { LangCache } from "@redis-ai/langcache";
import { SearchStrategy } from '@redis-ai/langcache/models/searchstrategy.js';

import CONFIG from '#config';

// Initialize LangCache client
const langCache = new LangCache({
    serverURL: CONFIG.langcacheApiBaseUrl,
    cacheId: CONFIG.langcacheCacheId,
    apiKey: CONFIG.langcacheApiKey,
});

export default class KnowledgeBankRepository {

    /**
     * Search user query in langcache
     * @param {string} query
     * @param {string} [sessionId] - Optional session identifier to scope the search
     * @returns {Promise<{content: string, foundProducts: Array}|null>} The cached reply and the products shown with it
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

        const cachedResponse = result.data?.[0]?.response;
        if (!cachedResponse) {
            return null;
        }

        // Entries are saved as JSON. Older entries are plain reply text.
        try {
            return JSON.parse(cachedResponse);
        } catch {
            return { content: cachedResponse, foundProducts: [] };
        }
    }

    /**
     * Save results in Redis Langcache.
     * @async
     * @param {string} query - The original user query to store as the semantic prompt.
     * @param {{content: string, foundProducts: Array}} aiResponse - The AI-generated reply and the products shown with it.
     * @param {number} ttlMillis - Time-to-live in milliseconds for the cached entry.
     * @param {string} [sessionId] - Optional unique identifier for the user session.
     */
    async saveResponseInSemanticCache(query, aiResponse, ttlMillis, sessionId) {
        const cacheParams = {
            prompt: query,
            response: JSON.stringify(aiResponse),
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
