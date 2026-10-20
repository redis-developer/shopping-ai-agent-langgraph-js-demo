import { createChatModel } from "./chat-model.ts";
import type { OpenAISettings } from "./chat-model.ts";
import { createEmbedder, EMBEDDING_DIMENSIONS } from "./embeddings.ts";
import { sanitizeForCache } from "./sanitize.ts";

/**
 * The OpenAI AI provider
 * @param settings - The OpenAI settings from config
 */
export function createProvider(settings: OpenAISettings) {
    return {
        name: "openai",
        createChatModel: (options?: Parameters<typeof createChatModel>[1]) => createChatModel(settings, options),
        embed: createEmbedder(settings),
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        sanitizeForCache: (text: string) => sanitizeForCache(settings, text),
        // OpenAI has no guardrails, so requests go straight to the shopping agent
        guardrails: undefined
    };
}
