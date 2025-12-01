import { BedrockEmbeddings } from '@langchain/aws';
import CONFIG from '../../../config.js';

const embeddings = new BedrockEmbeddings({
    model: "amazon.titan-embed-text-v2:0",
    region: CONFIG.awsRegion,
    credentials: {
        accessKeyId: CONFIG.awsAccessKeyId,
        secretAccessKey: CONFIG.awsSecretAccessKey
    }
});

/**
 * Generate embeddings for text descriptions using AWS Titan Text Embeddings V2
 * @param {Array<string>} texts - Array of text descriptions
 * @returns {Promise<Array<number[]>>} Array of embedding vectors
 */
export async function generateEmbeddings(texts) {
    // Generate embeddings for all texts
    const embeddingVectors = await Promise.all(
        texts.map(text => embeddings.embedQuery(text))
    );

    return embeddingVectors;
}
