import OpenAI from "openai";
import type { OpenAISettings } from "./chat-model.ts";

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Create a function that generates embeddings with OpenAI
 * @param settings - The OpenAI settings from config
 */
export function createEmbedder(settings: OpenAISettings) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
    });

    return async function embed(texts: string[]) {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // More cost-effective
            input: texts,
        });

        return response.data.map(item => item.embedding);
    };
}
