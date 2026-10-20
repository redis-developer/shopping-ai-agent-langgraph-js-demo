import { ChatBedrockConverse } from "@langchain/aws";

/**
 * Create the front desk check: content safety filtering with the conversation guardrail
 * @param {Object} settings - The AWS Bedrock settings from config
 * @returns {{checkInput: (text: string) => Promise<{blocked: boolean, message: string}>}}
 */
export function createGuardrails(settings) {
    const model = new ChatBedrockConverse({
        model: settings.modelId,
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        },
        guardrailConfig: {
            guardrailIdentifier: settings.conversationGuardrailId,
            guardrailVersion: settings.guardrailVersion,
            enabled: "enabled_full"
        }
    });

    return {
        /**
         * Pass the text straight to the model so the guardrail evaluates it
         * @param {string} text - What the user said
         * @returns {Promise<{blocked: boolean, message: string}>} Whether the guardrail intervened, and the reply to show if it did
         */
        async checkInput(text) {
            const response = await model.invoke(text);
            const blocked = response.response_metadata?.stopReason === "guardrail_intervened";

            if (blocked) {
                console.log('Response metadata:', response.response_metadata);
            }

            return { blocked, message: response.content };
        }
    };
}
