import { MessagesZodState } from "@langchain/langgraph";
import { z } from "zod";

/**
 * Grocery Shopping Agent State Schema
 *
 * Extends the base `MessagesZodState` with grocery shopping specific metadata
 * for tracking session context, caching, tool invocation, and shopping cart details.
 */
export const ShoppingAgentState = MessagesZodState.extend({
    /** Stable user ID (owns the cart and long-term memories) */
    userId: z.string(),
    /** Unique session ID for tracking the user's shopping session */
    sessionId: z.string(),
    /** Shows if a cached result was used */
    cacheStatus: z.enum(["hit", "miss"]).optional(),
    /** Error message when the shopper's model call failed (the reply is then an apology and is not cached) */
    error: z.string().optional(),
    /** Whether to look up similar earlier responses in the semantic cache. New responses are always saved to it. */
    lookupSimilarResponses: z.boolean().optional(),
    /** Service-generated summary of the earlier conversation in this session */
    conversationSummary: z.string().optional(),
    /** Text of the long-term memories loaded for this turn */
    longTermMemories: z.array(z.string()).optional(),
    /** Result of the front desk guardrail check (only for providers with guardrails) */
    guardrailTestResult: z.enum(["passed", "blocked"]).optional(),
    /** Content shown with the reply, such as the product cards for the products the tools found this turn (or the cached reply came with) */
    attachments: z.array(z.discriminatedUnion("type", [
        z.object({
            type: z.literal("productSummary"),
            data: z.object({
                id: z.string(),
                name: z.string(),
                price: z.number(),
                image: z.string(),
                rating: z.number(),
            }),
        }),
    ])).optional(),
});

export type ShoppingAgentStateType = z.infer<typeof ShoppingAgentState>;