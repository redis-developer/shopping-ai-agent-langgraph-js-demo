import { createChatModel } from "./chat-model.js";
import { createEmbedder, EMBEDDING_DIMENSIONS } from "./embeddings.js";
import { sanitizeForCache } from "./sanitize.js";

/**
 * The OpenAI AI provider
 * @param {{apiKey: string, modelName: string}} settings - The OpenAI settings from config
 */
export function createProvider(settings) {
    return {
        name: "openai",
        createChatModel: (options) => createChatModel(settings, options),
        embed: createEmbedder(settings),
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        sanitizeForCache: (text) => sanitizeForCache(settings, text),
        // OpenAI has no guardrails, so requests go straight to the shopping agent
        guardrails: undefined
    };
}
