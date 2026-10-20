import KnowledgeBankRepository from '../data/knowledge-bank-repository.ts';
import type { CachedResponse } from '../data/knowledge-bank-repository.ts';

const knowledgeBankRepository = new KnowledgeBankRepository();

/**
 * Save response to semantic cache
 * @param query - Original user query
 * @param response - Reply to cache, with the products shown with it
 * @param ttlMillis - Time to live in milliseconds
 * @param userId - Optional user ID
 */
export async function saveToSemanticCache(query: string, response: CachedResponse, ttlMillis: number, userId?: string) {
    await knowledgeBankRepository.saveResponseInSemanticCache(
        query,
        response,
        ttlMillis,
        userId
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
 * @param query - User query to check
 * @param userId - Optional user ID for scoped search
 * @returns The cached reply and its products, or null on a miss
 */
export async function checkSemanticCache(query: string, userId?: string) {
    return knowledgeBankRepository.findFromSemanticCache(query, userId);
}
