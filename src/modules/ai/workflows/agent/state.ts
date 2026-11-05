import { MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import { z } from "zod";

// Content shown with the reply. The type says what is in data.
const attachmentSchema = z.discriminatedUnion("type", [
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
]);

/**
 * Grocery Shopping Agent State Schema
 *
 * The message history, plus grocery shopping specific metadata
 * for tracking session context, caching, tool invocation, and shopping cart details.
 */
export const ShoppingAgentState = new StateSchema({
    messages: MessagesValue,
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
    /** Short messages the shopper could send next, shown as buttons under the reply */
    suggestedFollowUps: z.array(z.string()).optional(),
    /**
     * Content that comes with the reply for the UI to render, mostly structured data. Here it is the products the tools found this turn (or the ones the cached reply came with).
     * A node adds to it and does not return what it has read, so every node can contribute its own and none replaces another's.
     */
    attachments: new ReducedValue(
        z.array(attachmentSchema).default(() => []),
        { reducer: (existing, update) => existing.concat(update ?? []) }
    ),
});

export type ShoppingAgentStateType = typeof ShoppingAgentState.State;