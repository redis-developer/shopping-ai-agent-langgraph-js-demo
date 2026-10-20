import OpenAI from "openai";

export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Create a function that generates embeddings with OpenAI
 * @param {{apiKey: string}} settings - The OpenAI settings from config
 * @returns {(texts: Array<string>) => Promise<Array<number[]>>}
 */
export function createEmbedder(settings) {
    const openai = new OpenAI({
        apiKey: settings.apiKey,
    });

    return async function embed(texts) {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // More cost-effective
            input: texts,
        });

        return response.data.map(item => item.embedding);
    };
}
