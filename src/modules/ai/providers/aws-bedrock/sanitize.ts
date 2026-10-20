import { ChatBedrockConverse } from "@langchain/aws";
import type { AwsBedrockSettings } from "./chat-model.ts";

/**
 * Data compliance for regulatory requirements (GDPR, privacy, security)
 * Uses AWS guardrails at input level to detect PII, then cleans up placeholders
 * @param settings - The AWS Bedrock settings from config
 * @param text - The text to clean before it is saved to the knowledge bank
 * @returns The text without personal information
 */
export async function sanitizeForCache(settings: AwsBedrockSettings, text: string) {
    if (!text || typeof text !== 'string') return text;

    const placeholderRemovalPrompt = `You are a text cleanup specialist. Your task is to remove any placeholder text completely and make the text grammatically coherent while preserving everything else.

INSTRUCTIONS:
1. Remove all placeholder tokens completely: [NAME], [EMAIL], [PHONE], [ADDRESS], [CREDIT_CARD], [SSN], [PII], etc.
2. Fix grammar and sentence structure to make the result natural
3. Preserve ALL food, grocery, cooking, and recipe-related content
4. IMPORTANT: Keep all food-related terms, product IDs, grocery items, cooking terms, brand names, and the core question and intent intact.
5. Make the result sound conversational and natural
6. Return ONLY the cleaned text - no explanations, notes, or additional commentary

PLACEHOLDER REMOVAL EXAMPLES:

Input: "Hi [NAME], my email is [EMAIL]. I need pasta ingredients."
Output: "I need pasta ingredients."

Input: Hi [NAME], here are the ingredients you'll need for a basic pasta dish with suggested products:\n\n1. Pasta (1 pound):\n**Durum Wheat Pasta- Penne Rigate** by Barilla - ₹598 (ID: 786) [🛒 Add]\n\n2. Parmesan Cheese (1/2 cup):\n**Parmesan Grana Padano D.O.P Cheese - Diced** by Fresho Signature - ₹239.40 (ID: 1574) [🛒 Add]\n\n
Output: "Here are the ingredients you'll need for a basic pasta dish with suggested products:\n\n1. Pasta (1 pound):\n**Durum Wheat Pasta- Penne Rigate** by Barilla - ₹598 (ID: 786) [🛒 Add]\n\n2. Parmesan Cheese (1/2 cup):\n**Parmesan Grana Padano D.O.P Cheese - Diced** by Fresho Signature - ₹239.40 (ID: 1574) [🛒 Add]\n\n

Input: "I'm [NAME] from [ADDRESS], what's good for dinner?"
Output: "What's good for dinner?"

Input: "My grandmother [NAME]'s famous lasagna recipe needs ricotta cheese."
Output: "This famous lasagna recipe needs ricotta cheese."

Input: "Call me at [PHONE] about organic tomatoes and free-range chicken."
Output: "I'm interested in organic tomatoes and free-range chicken."

Input: "My card [CREDIT_CARD] was charged for groceries. I bought milk, bread, and eggs."
Output: "My credit card was charged for groceries. I bought milk, bread, and eggs."

Input: "I'm hosting a party for my friend [NAME] at [ADDRESS]. Need ingredients for 20 people."
Output: "Need ingredients for 20 people."

Input: "My mom [NAME] taught me this Uncle Ben's rice recipe."
Output: "I learned this Uncle Ben's rice recipe."

Text with placeholders: "${text}"

Clean text:`;
    // PII redaction model with guardrails for input-level PII detection and placeholder cleanup
    const piiRedactionModel = new ChatBedrockConverse({
        model: settings.modelId,
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey
        },
        guardrailConfig: {
            guardrailIdentifier: settings.cacheGuardrailId,
            guardrailVersion: settings.guardrailVersion,
            enabled: "enabled_full"
        }
    } as ConstructorParameters<typeof ChatBedrockConverse>[0]);

    // The guardrail will automatically redact PII in the input before the model sees it
    const response = await piiRedactionModel.invoke([
        {
            role: "user",
            content: placeholderRemovalPrompt
        }
    ]);

    // Check if guardrail intervened
    if (response.response_metadata?.stopReason === "guardrail_intervened") {
        console.log('🛡️ PII content detected and cleaned by guardrails during data compliance processing');
    }

    const cleanedText = (response.content as string).trim();
    return cleanedText;
}
