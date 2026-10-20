import { ChatBedrockConverse } from "@langchain/aws";

/**
 * Create an AWS Bedrock chat model that runs behind the conversation guardrail
 * @param {Object} settings - The AWS Bedrock settings from config
 * @param {Object} [options]
 * @param {number} [options.maxTokens] - Limit on the length of the reply
 *
 * Temperature, timeout and the fast option are not used with Bedrock.
 */
export function createChatModel(settings, { maxTokens } = {}) {
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
    });
}
