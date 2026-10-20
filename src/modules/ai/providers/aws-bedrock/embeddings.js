import { BedrockEmbeddings } from "@langchain/aws";

export const EMBEDDING_DIMENSIONS = 1024; // AWS Titan Text Embeddings V2 (default size)

/**
 * Create a function that generates embeddings with AWS Titan Text Embeddings V2
 * @param {Object} settings - The AWS Bedrock settings from config
 * @returns {(texts: Array<string>) => Promise<Array<number[]>>}
 */
export function createEmbedder(settings) {
    const embeddings = new BedrockEmbeddings({
        model: "amazon.titan-embed-text-v2:0",
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        }
    });

    return async function embed(texts) {
        return Promise.all(texts.map(text => embeddings.embedQuery(text)));
    };
}
