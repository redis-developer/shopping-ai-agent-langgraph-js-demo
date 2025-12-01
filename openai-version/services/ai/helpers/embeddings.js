import OpenAI from 'openai';
import CONFIG from '../../../config.js';

const openai = new OpenAI({
    apiKey: CONFIG.openAiApiKey,
});

/**
 * Generate embeddings for text descriptions
 * @param {Array<string>} texts - Array of text descriptions
 * @returns {Promise<Array<number[]>>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small", // More cost-effective
        input: texts,
    });

    return response.data.map(item => item.embedding);
}
