import { ChatOpenAI } from "@langchain/openai";

export type OpenAISettings = { apiKey: string; modelName: string };

// A smaller, cheaper model for simple tasks such as extracting a recipe's ingredients
const FAST_MODEL = "gpt-4o-mini";

/**
 * Create an OpenAI chat model
 * @param settings - The OpenAI settings from config
 * @param options.temperature - Lower values give more consistent answers
 * @param options.maxTokens - Limit on the length of the reply
 * @param options.timeout - Time limit in milliseconds
 * @param options.fast - Use the smaller, cheaper model
 * @param options.disableStreaming - Get the whole reply at once. Use it for calls whose reply is not shown to the shopper as it is written.
 */
export function createChatModel(
    settings: OpenAISettings,
    { temperature, maxTokens, timeout, fast = false, disableStreaming }: { temperature?: number; maxTokens?: number; timeout?: number; fast?: boolean; disableStreaming?: boolean } = {}
) {
    return new ChatOpenAI({
        temperature,
        model: fast ? FAST_MODEL : settings.modelName,
        apiKey: settings.apiKey,
        maxTokens,
        timeout,
        disableStreaming
    });
}
