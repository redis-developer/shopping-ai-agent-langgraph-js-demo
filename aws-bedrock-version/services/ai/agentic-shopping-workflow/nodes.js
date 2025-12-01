import { ChatBedrockConverse } from "@langchain/aws";
import { AIMessage } from "@langchain/core/messages";
import { groceryTools } from "./tools.js";
import { checkSemanticCache, saveToSemanticCache } from "../../chat/domain/chat-service.js";
import CONFIG from "../../../config.js";

/**
 * Node 1: Query Cache Check
 */
export const queryCacheCheck = async (state) => {
    const lastUserMessage = state.messages.findLast(m => m.getType() === "human");
    const userQuery = lastUserMessage?.content || "";
    
    console.log(`🔍 Checking semantic cache for: "${userQuery.substring(0, 50)}..."`);
    
    try {
        const cachedResult = await checkSemanticCache(userQuery);

        if (cachedResult) {
            console.log("🎯 Semantic cache HIT - returning previous response");
            return {
                cacheStatus: "hit",
                result: cachedResult,
                messages: [...state.messages, new AIMessage(cachedResult)],
                sessionId: state.sessionId
            };
        }
        
        console.log("❌ Semantic cache MISS - proceeding to agent");
        return { 
            cacheStatus: "miss",
            sessionId: state.sessionId
        };
        
    } catch (error) {
        console.error("Error checking semantic cache:", error);
        return {
            cacheStatus: "miss",
            sessionId: state.sessionId
        };
    }
};

/**
 * Node 2: Front Desk Agent
 *
 * Simple content safety filter that passes user queries directly to guardrails
 * AWS guardrails handle content filtering and topic restrictions
 * Approved requests pass through to personal shopper agent
 */
export const frontDeskAgent = async (state) => {
    console.log('🏢 Front desk screening request for content safety...');

    const model = new ChatBedrockConverse({
        model: CONFIG.bedrockModelId,
        region: CONFIG.awsRegion,
        credentials: {
            accessKeyId: CONFIG.awsAccessKeyId,
            secretAccessKey: CONFIG.awsSecretAccessKey
        },
        temperature: 0.1,
        guardrailConfig: {
            guardrailIdentifier: CONFIG.bedrockConversationGuardrailId,
            guardrailVersion: CONFIG.bedrockGuardrailVersion,
            enabled: "enabled_full"
        }
    });

    const lastUserMessage = state.messages.findLast(m => m.getType() === "human");
    const userQuery = lastUserMessage?.content || "";

    console.log(`🔍 Front desk screening query: "${userQuery.substring(0, 50)}..."`);

    // Simple approach - just pass the message directly to trigger guardrail evaluation
    const response = await model.invoke(userQuery);

    // Check if guardrail intervened
    if (response.response_metadata?.stopReason === "guardrail_intervened") {
        console.log('🛡️ Front desk blocked irrelevant query - using default response');
        console.log('Response metadata:', response.response_metadata);

        return {
            result: response.content, // Use AWS default guardrail response
            messages: [...state.messages, new AIMessage(response.content)],
            guardrailTestResult: "blocked",
            guardrailBlockReason: "Content blocked by guardrail",
            sessionId: state.sessionId,
            userMessage: userQuery
        };
    }

    console.log('✅ Front desk approved - directing to shopping assistant');

    return {
        ...state,
        guardrailTestResult: "passed",
        userMessage: userQuery // Ensure userMessage is set for downstream nodes
    };
};

/**
 * Node 3: Shopping Agent Node
 *
 * Specialized agent with tools for shopping-related tasks
 */
export const personalShopperAgent = async (state) => {
    const model = new ChatBedrockConverse({
        model: CONFIG.bedrockModelId,
        region: CONFIG.awsRegion,
        credentials: {
            accessKeyId: CONFIG.awsAccessKeyId,
            secretAccessKey: CONFIG.awsSecretAccessKey
        },
        temperature: 0.1,
        guardrails: {
            guardrailIdentifier: CONFIG.bedrockConversationGuardrailId,
            guardrailVersion: CONFIG.bedrockGuardrailVersion
        }
    });

    const systemPrompt = `You are a helpful grocery shopping assistant. You have access to specialized tools that return JSON data.

🍳 **fast_recipe_ingredients**: For recipe/ingredient questions (USE THIS FIRST for recipes!)
- Use when user asks "ingredients for [recipe]" or "what do I need to make [dish]"
- Returns ingredient list with ONE suggested product each for SPEED
- Much faster than searching for each ingredient separately
- Format each product as: **Product Name** by Brand - ₹Price (ID: 12345) [🛒 Add] [👁️ Details]
- Always offer: "Want more options for any ingredient? Just ask!"
- Example: "ingredients for butter chicken" → Use this tool!

🔍 **search_products**: For specific product searches and follow-ups
- Use when user wants to "find [specific item]" or "show me [products]"
- Use when user asks for "more options" or "more brands" after recipe ingredients
- Returns products with cart icons and product page links
- Format: Show products with "🛒 Add to Cart" and "👁️ View Details" options

🛒 **Cart Tools**: For cart management
- add_to_cart: Add products by ID (parse JSON response)
- view_cart: Show cart contents with totals
- clear_cart: Empty the cart

🧠 **direct_answer**: For general cooking/food knowledge
- Cooking tips, techniques, nutrition advice
- Food storage, preparation methods
- General culinary knowledge (not recipe ingredients!)

**CRITICAL Tool Selection Rules:**
1. Recipe/ingredient questions → ALWAYS use fast_recipe_ingredients FIRST
2. "More options" requests → search_products
3. Cart operations → appropriate cart tool
4. General cooking tips → direct_answer

**Response Formatting Rules:**
1. Parse ALL JSON tool responses before presenting to user
2. For recipe ingredients: Show ingredient + suggested product + cart icon + product link
3. For product searches: Show products with cart icons and "View Details" links  
4. Always include product IDs and make them clickable
5. Use engaging formatting with emojis and clear structure
6. For products, use this exact format: **Product Name** by Brand - ₹Price (ID: 12345) [🛒 Add] [👁️ Details]
7. Make cart icons clickable by using proper product IDs
8. After showing ingredients, always offer: "Want more brands for any ingredient? Just ask!"
9. IMPORTANT: Do NOT create markdown links with # or (). Product IDs should be plain numbers like (ID: 3218)

Session ID: ${state.sessionId}
Make responses helpful, fast, and easy to interact with!`;

    const modelWithTools = model.bindTools(groceryTools);

    try {
        let currentMessages = [
            { role: "system", content: systemPrompt },
            ...state.messages
        ];
        let toolsUsed = [];
        let foundProducts = [];
        
        while (true) {
            const response = await modelWithTools.invoke(currentMessages);
            currentMessages.push(response);

            if (!response.tool_calls || response.tool_calls.length === 0) {
                console.log("🛒 Shopping agent finished with response");
                
                return {
                    result: response.content,
                    messages: [...state.messages, new AIMessage(response.content)],
                    toolsUsed: toolsUsed.length > 0 ? toolsUsed : ["none"],
                    foundProducts,
                    sessionId: state.sessionId
                };
            }

            for (const toolCall of response.tool_calls) {
                let toolResult;
                
                console.log(`🔧 Shopping agent using tool: ${toolCall.name}`);
                toolsUsed.push(toolCall.name);

                // Find and invoke the appropriate tool
                const tool = groceryTools.find(t => t.name === toolCall.name);

                if (tool) {
                    // Add sessionId to tool arguments if needed
                    const toolArgs = { ...toolCall.args };
                    if (['add_to_cart', 'view_cart', 'clear_cart', 'save_to_semantic_cache'].includes(toolCall.name)) {
                        toolArgs.sessionId = state.sessionId;
                    }
                    
                    toolResult = await tool.invoke(toolArgs);
                    
                    // Parse JSON response to extract products for summary
                    try {
                        const parsedResult = JSON.parse(toolResult);
                        if (parsedResult.type === "product_search" && parsedResult.products) {
                            foundProducts = parsedResult.products;
                        } else if (parsedResult.type === "recipe_ingredients" && parsedResult.ingredientProducts) {
                            foundProducts = parsedResult.ingredientProducts
                                .filter(item => item.suggestedProduct)
                                .map(item => item.suggestedProduct);
                        }
                    } catch (parseError) {
                        console.warn("Could not parse tool result as JSON:", parseError);
                    }
                } else {
                    toolResult = JSON.stringify({
                        type: "error",
                        success: false,
                        error: "Unknown tool requested"
                    });
                }

                currentMessages.push({
                    role: "tool",
                    content: toolResult,
                    tool_call_id: toolCall.id,
                });
            }
        }
    } catch (error) {
        console.error("❌ Personal shopper agent error:", error);
        const fallbackMessage = "I apologize, but I'm having trouble with your grocery request right now. Please try asking about recipe ingredients, searching for products, or managing your cart!";
        
        return {
            result: fallbackMessage,
            messages: [...state.messages, new AIMessage(fallbackMessage)],
            toolsUsed: ["error"],
            sessionId: state.sessionId
        };
    }
};

/**
 * Node 3: Process Results for caching
 */
export const processWorkOutputWithCaching = async (state) => {
    if (!state.result) {
        return {};
    }

    const lastUserMessage = state.messages.findLast(m => m.getType() === "human");
    const query = lastUserMessage?.content || "";

    // Determine TTL for cache
    const cacheTTL = determineCacheTTL(query);

    // Don't cache if TTL is 0 (e.g., cart operations)
    if (cacheTTL === 0) {
        console.log("⏭️ Skipping cache for dynamic/personal operation");
        return {};
    }

    try {
        // Use data compliance agent for regulatory requirements
        const [sanitizedQuery, sanitizedResponse ] =  await Promise.all([
            dataComplianceAgent(query),
            dataComplianceAgent(state.result)
        ]);

        console.log(`Saving sanitized query to cache: "${sanitizedQuery.substring(0, 50)}..."`);

        await saveToSemanticCache(
            sanitizedQuery,
            sanitizedResponse,
            cacheTTL,
            state.sessionId
        );

        console.log(`💾 Cached with TTL: ${cacheTTL}ms (${Math.round(cacheTTL / (60 * 60 * 1000))}h)`);

    } catch (error) {
        console.error('Error in GDPR-compliant caching:', error);
        // Don't fail the whole request if caching fails
    }

    return {};
};

/**
 * Determine cache TTL based on query type
 * TODO: To be replaced by a better caching logic (e.g: semantic routing)
 */
function determineCacheTTL(query) {
    if (!query || typeof query !== 'string') {
        return 6 * 60 * 60 * 1000; // 6 hours default
    }

    const lowerQuery = query.toLowerCase();

    // Don't cache cart operations (they're user-specific and dynamic)
    if (lowerQuery.includes('cart') ||
        lowerQuery.includes('add to') ||
        lowerQuery.includes('remove')) {
        return 0; // Don't cache
    }

    // Longer TTL for recipe/ingredient queries (they don't change often)
    if (lowerQuery.includes('recipe') ||
        lowerQuery.includes('ingredients') ||
        lowerQuery.includes('how to make') ||
        lowerQuery.includes('need for') ||
        lowerQuery.includes('to make')) {
        return 24 * 60 * 60 * 1000; // 24 hours
    }

    // Shorter TTL for price/shopping queries (prices change)
    if (lowerQuery.includes('price') ||
        lowerQuery.includes('cost') ||
        lowerQuery.includes('cheap')) {
        return 2 * 60 * 60 * 1000; // 2 hours
    }

    return 6 * 60 * 60 * 1000; // 6 hours default
}

/**
 * Data compliance agent for regulatory requirements (GDPR, privacy, security)
 * Uses AWS guardrails at input level to detect PII, then cleans up placeholders
 */
async function dataComplianceAgent(text) {
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

Input: Hi [NAME], here are the ingredients you'll need for a basic pasta dish with suggested products:\n\n1. Pasta (1 pound):\n**Durum Wheat Pasta- Penne Rigate** by Barilla - ₹598 (ID: 786) [🛒 Add] [👁️ Details]\n\n2. Parmesan Cheese (1/2 cup):\n**Parmesan Grana Padano D.O.P Cheese - Diced** by Fresho Signature - ₹239.40 (ID: 1574) [🛒 Add] [👁️ Details]\n\n
Output: "Here are the ingredients you'll need for a basic pasta dish with suggested products:\n\n1. Pasta (1 pound):\n**Durum Wheat Pasta- Penne Rigate** by Barilla - ₹598 (ID: 786) [🛒 Add] [👁️ Details]\n\n2. Parmesan Cheese (1/2 cup):\n**Parmesan Grana Padano D.O.P Cheese - Diced** by Fresho Signature - ₹239.40 (ID: 1574) [🛒 Add] [👁️ Details]\n\n

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
        model: CONFIG.bedrockModelId,
        region: CONFIG.awsRegion,
        credentials: {
            accessKeyId: CONFIG.awsAccessKeyId,
            secretAccessKey: CONFIG.awsSecretAccessKey
        },
        temperature: 0,
        guardrailConfig: {
            guardrailIdentifier: CONFIG.bedrockCacheGuardrailId,
            guardrailVersion: CONFIG.bedrockGuardrailVersion,
            enabled: "enabled_full"
        }
    });

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

    const cleanedText = response.content.trim();
    return cleanedText;
}
