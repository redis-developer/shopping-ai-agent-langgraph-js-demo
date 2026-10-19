import { MessagesZodState } from "@langchain/langgraph";
import { z } from "zod";

/**
 * Grocery Shopping Agent State Schema
 *
 * Extends the base `MessagesZodState` with grocery shopping specific metadata
 * for tracking session context, caching, tool invocation, and shopping cart details.
 *
 * @typedef {Object} ShoppingAgentState
 * @property {string} userId - Stable user ID (owns the cart and long-term memories)
 * @property {string} sessionId - Unique session ID for tracking the user's shopping session
 * @property {"hit" | "miss"} [cacheStatus] - Cache indicator showing if a cached result was used
 * @property {string} [error] - Error message when the shopper's model call failed (the reply is then an apology and is not cached)
 * @property {boolean} [lookupSimilarResponses] - Whether to look up similar earlier responses in the semantic cache. New responses are always saved to it.
 * @property {string} [conversationSummary] - Service-generated summary of the earlier conversation in this session
 * @property {string[]} [longTermMemories] - Text of the long-term memories loaded for this turn
 * @property {Array<{id: string, name: string, price: number, image: string, rating: number}>} [foundProducts] - Products the tools found this turn (or the cached reply came with), shown to the user as product cards
 */
export const ShoppingAgentState = MessagesZodState.extend({
    userId: z.string(),
    sessionId: z.string(),
    cacheStatus: z.enum(["hit", "miss"]).optional(),
    error: z.string().optional(),
    lookupSimilarResponses: z.boolean().optional(),
    conversationSummary: z.string().optional(),
    longTermMemories: z.array(z.string()).optional(),
    foundProducts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        price: z.number(),
        image: z.string(),
        rating: z.number(),
    })).optional(),
});