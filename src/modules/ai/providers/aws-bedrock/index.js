import { createChatModel } from "./chat-model.js";
import { createEmbedder, EMBEDDING_DIMENSIONS } from "./embeddings.js";
import { sanitizeForCache } from "./sanitize.js";
import { createGuardrails } from "./guardrails.js";

/**
 * The AWS Bedrock AI provider
 * @param {Object} settings - The AWS Bedrock settings from config
 */
export function createProvider(settings) {
    return {
        name: "aws-bedrock",
        createChatModel: (options) => createChatModel(settings, options),
        embed: createEmbedder(settings),
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        sanitizeForCache: (text) => sanitizeForCache(settings, text),
        // Screens each request before it reaches the shopping agent
        guardrails: createGuardrails(settings)
    };
}
