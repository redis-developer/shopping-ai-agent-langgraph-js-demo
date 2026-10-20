import { ChatOpenAI } from "@langchain/openai";

// A smaller, cheaper model for simple tasks such as extracting a recipe's ingredients
const FAST_MODEL = "gpt-4o-mini";

/**
 * Create an OpenAI chat model
 * @param {{apiKey: string, modelName: string}} settings - The OpenAI settings from config
 * @param {Object} [options]
 * @param {number} [options.temperature] - Lower values give more consistent answers
 * @param {number} [options.maxTokens] - Limit on the length of the reply
 * @param {number} [options.timeout] - Time limit in milliseconds
 * @param {boolean} [options.fast] - Use the smaller, cheaper model
 */
export function createChatModel(settings, { temperature, maxTokens, timeout, fast = false } = {}) {
    return new ChatOpenAI({
        temperature,
        model: fast ? FAST_MODEL : settings.modelName,
        apiKey: settings.apiKey,
        maxTokens,
        timeout
    });
}
