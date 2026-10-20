import { LangCache } from "@redis-ai/langcache";
import { SearchStrategy } from '@redis-ai/langcache/models/searchstrategy.js';

import CONFIG from '../../../config.ts';
import type { Attachment } from '../domain/attachments.ts';

/** What is saved in the knowledge bank: a reply, and the products shown with it */
export type CachedResponse = {
    content: string;
    attachments: Attachment[];
};

// Initialize LangCache client
const langCache = new LangCache({
    serverURL: CONFIG.langcacheApiBaseUrl!,
    cacheId: CONFIG.langcacheCacheId!,
    apiKey: CONFIG.langcacheApiKey,
});

export default class KnowledgeBankRepository {

    /**
     * Search user query in langcache
     * @param userId - Optional user identifier to scope the search
     * @returns The cached reply and the products shown with it
     */
    async findFromSemanticCache(query: string, userId?: string): Promise<CachedResponse | null> {
        const searchParams: { prompt: string; searchStrategies: SearchStrategy[]; attributes?: Record<string, string> } = {
            prompt: query,
            searchStrategies: [SearchStrategy.Exact, SearchStrategy.Semantic]
        };

        // Only add userId to attributes if it's provided
        if (userId) {
            searchParams.attributes = {
                "userId": userId,
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
            return { content: cachedResponse, attachments: [] };
        }
    }

    /**
     * Save results in Redis Langcache.
     * @async
     * @param query - The original user query to store as the semantic prompt.
     * @param aiResponse - The AI-generated reply and the products shown with it.
     * @param ttlMillis - Time-to-live in milliseconds for the cached entry.
     * @param userId - Optional unique identifier for the user.
     */
    async saveResponseInSemanticCache(query: string, aiResponse: CachedResponse, ttlMillis: number, userId?: string) {
        const cacheParams: { prompt: string; response: string; ttlMillis: number; attributes?: Record<string, string> } = {
            prompt: query,
            response: JSON.stringify(aiResponse),
            ttlMillis,
        };

        // Only add userId to attributes if it's provided
        if (userId) {
            cacheParams.attributes = {
                "userId": userId
            };
        }

        const result = await langCache.set(cacheParams);

        return result;
    }
}
