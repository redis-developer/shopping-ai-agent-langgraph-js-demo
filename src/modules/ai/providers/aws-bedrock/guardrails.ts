import type { AwsBedrockSettings } from "./chat-model.ts";
import { ChatBedrockConverse } from "@langchain/aws";

/**
 * Create the front desk check: content safety filtering with the conversation guardrail
 * @param settings - The AWS Bedrock settings from config
 */
export function createGuardrails(settings: AwsBedrockSettings) {
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
    } as ConstructorParameters<typeof ChatBedrockConverse>[0]);

    return {
        /**
         * Pass the text straight to the model so the guardrail evaluates it
         * @param text - What the user said
         * @returns Whether the guardrail intervened, and the reply to show if it did
         */
        async checkInput(text: string) {
            const response = await model.invoke(text);
            const blocked = response.response_metadata?.stopReason === "guardrail_intervened";

            if (blocked) {
                console.log('Response metadata:', response.response_metadata);
            }

            return { blocked, message: response.content as string };
        }
    };
}
