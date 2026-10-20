import { createChatModel } from "./chat-model.js";

/**
 * LLM-based GDPR-compliant data sanitization
 * Uses AI to intelligently remove personal information while preserving the core query
 * @param {{apiKey: string, modelName: string}} settings - The OpenAI settings from config
 * @param {string} text - The text to clean before it is saved to the knowledge bank
 * @returns {Promise<string>} The text without personal information
 */
export async function sanitizeForCache(settings, text) {
    if (!text || typeof text !== 'string') return text;

    try {
        const model = createChatModel(settings, { temperature: 0 });

        const sanitizationPrompt = `You are a GDPR compliance assistant. Your task is to remove or anonymize any personal information from the given text while preserving the core meaning and context.

Remove or replace the following types of personal information:
- Names (first names, last names, usernames)
- Email addresses
- Phone numbers
- Addresses (street addresses, zip codes)
- Credit card numbers, SSNs, or other ID numbers
- Any other personally identifiable information

IMPORTANT: Keep all food-related terms, product IDs, grocery items, cooking terms, brand names, and the core question intact. Only remove personal identifiers.

Examples:
- "Hi, my name is John, I want butter chicken ingredients" → "I want butter chicken ingredients"
- "I'm Sarah and I live at 123 Main St, what's good for pasta?" → "what's good for pasta?"
- "My email is test@email.com, show me organic apples" → "show me organic apples"

Text to sanitize: "${text}"

Return only the sanitized text with no additional explanation:`;

        const response = await model.invoke(sanitizationPrompt);
        return response.content.trim();

    } catch (error) {
        console.error('Error in LLM sanitization, using original text:', error);
        return text; // Fallback to original text if LLM fails
    }
}
