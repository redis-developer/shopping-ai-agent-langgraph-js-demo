import type { AwsBedrockSettings } from "./chat-model.ts";
import { BedrockEmbeddings } from "@langchain/aws";

export const EMBEDDING_DIMENSIONS = 1024; // AWS Titan Text Embeddings V2 (default size)

/**
 * Create a function that generates embeddings with AWS Titan Text Embeddings V2
 * @param settings - The AWS Bedrock settings from config
 */
export function createEmbedder(settings: AwsBedrockSettings) {
    const embeddings = new BedrockEmbeddings({
        model: "amazon.titan-embed-text-v2:0",
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        }
    });

    return async function embed(texts: string[]) {
        return Promise.all(texts.map(text => embeddings.embedQuery(text)));
    };
}
