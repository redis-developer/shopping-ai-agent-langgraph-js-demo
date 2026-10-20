import { createChatModel } from "./chat-model.ts";
import type { AwsBedrockSettings } from "./chat-model.ts";
import { createEmbedder, EMBEDDING_DIMENSIONS } from "./embeddings.ts";
import { sanitizeForCache } from "./sanitize.ts";
import { createGuardrails } from "./guardrails.ts";

/**
 * The AWS Bedrock AI provider
 * @param settings - The AWS Bedrock settings from config
 */
export function createProvider(settings: AwsBedrockSettings) {
    return {
        name: "aws-bedrock",
        createChatModel: (options?: Parameters<typeof createChatModel>[1]) => createChatModel(settings, options),
        embed: createEmbedder(settings),
        embeddingDimensions: EMBEDDING_DIMENSIONS,
        sanitizeForCache: (text: string) => sanitizeForCache(settings, text),
        // Screens each request before it reaches the shopping agent
        guardrails: createGuardrails(settings)
    };
}
