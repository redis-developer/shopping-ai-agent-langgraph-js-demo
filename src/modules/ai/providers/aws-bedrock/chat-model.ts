import { ChatBedrockConverse } from "@langchain/aws";

export type AwsBedrockSettings = {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    modelId: string;
    conversationGuardrailId: string;
    cacheGuardrailId: string;
    guardrailVersion: string;
};

/**
 * Create an AWS Bedrock chat model that runs behind the conversation guardrail
 * @param settings - The AWS Bedrock settings from config
 * @param options.maxTokens - Limit on the length of the reply
 *
 * Temperature, timeout and the fast option are not used with Bedrock.
 */
export function createChatModel(settings: AwsBedrockSettings, { maxTokens }: { maxTokens?: number } = {}) {
    return new ChatBedrockConverse({
        model: settings.modelId,
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        },
        maxTokens,
        guardrails: {
            guardrailIdentifier: settings.conversationGuardrailId,
            guardrailVersion: settings.guardrailVersion
        }
    } as ConstructorParameters<typeof ChatBedrockConverse>[0]);
}
