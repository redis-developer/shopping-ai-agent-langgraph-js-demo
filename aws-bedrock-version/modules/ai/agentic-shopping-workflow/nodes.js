import { ChatBedrockConverse } from "@langchain/aws";
import { AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { shoppingTools } from "./tools/shopping-tools.js";
import { memoryTools } from "./tools/memory-tools.js";
import { checkSemanticCache, saveToSemanticCache } from "#modules/chat/domain/chat-service.js";
import { determineToolBasedCacheTTL } from "../helpers/caching.js";
import { searchLongTermMemories } from "#modules/chat/domain/agent-memory-service.js";
import CONFIG from "#config";

const allTools = [...shoppingTools, ...memoryTools];

/**
 * Node 1: Query Cache Check
 */
export const queryCacheCheck = async (state) => {
    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const userQuery = lastUserMessage?.content || "";

    // Look-up of similar responses is turned off in the UI, so skip the semantic cache lookup
    if (state.lookupSimilarResponses === false) {
        console.log("⏭️ Look-up of similar responses is off - skipping the semantic cache lookup");
        return { cacheStatus: "miss" };
    }

    console.log(`🔍 Checking semantic cache for: "${userQuery.substring(0, 50)}..."`);
    
    try {
        const cachedResult = await checkSemanticCache(userQuery);

        if (cachedResult) {
            console.log("🎯 Semantic cache HIT - returning previous response");
            return {
                cacheStatus: "hit",
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
        // temperature: 0.1,
        guardrailConfig: {
            guardrailIdentifier: CONFIG.bedrockConversationGuardrailId,
            guardrailVersion: CONFIG.bedrockGuardrailVersion,
            enabled: "enabled_full"
        }
    });

    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const userQuery = lastUserMessage?.content || "";

    console.log(`🔍 Front desk screening query: "${userQuery.substring(0, 50)}..."`);

    // Simple approach - just pass the message directly to trigger guardrail evaluation
    const response = await model.invoke(userQuery);

    // Check if guardrail intervened
    if (response.response_metadata?.stopReason === "guardrail_intervened") {
        console.log('🛡️ Front desk blocked irrelevant query - using default response');
        console.log('Response metadata:', response.response_metadata);

        return {
            messages: [...state.messages, new AIMessage(response.content)],
            guardrailTestResult: "blocked",
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
 * Node 3: Retrieve Long Term Memories
 * Fetch the user's most relevant long-term memories for the current query. Search
 * is ranked by semantic similarity to the query and filtered to this user only, so
 * the shopper agent sees preferences/history actually pertinent to *this* question
 * (e.g. "pasta ingredients" surfaces a stored gluten-free preference).
 * Runs once per turn, before the shopper agent starts calling tools.
 */
export const retrieveLongTermMemories = async (state) => {
    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const query = lastUserMessage?.content || "";

    const memories = await searchLongTermMemories(state.userId, query);

    return { longTermMemories: memories.map((memory) => memory.text) };
};

/**
 * Node 4: Personal Shopper Agent
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
        // temperature: 0.1,
        guardrails: {
            guardrailIdentifier: CONFIG.bedrockConversationGuardrailId,
            guardrailVersion: CONFIG.bedrockGuardrailVersion
        }
    });

    // Long-term memories were retrieved by the retrieve_long_term_memories node
    const userContextBlock = state.longTermMemories?.length
        ? `\n**What we know about this shopper (from long-term memory):**\n${state.longTermMemories.map((memoryText) => `- ${memoryText}`).join("\n")}\n`
        : "";
    const conversationSummaryBlock = state.conversationSummary
        ? `\n**Summary of the earlier conversation in this session:**\n${state.conversationSummary}\n`
        : "";

    const systemPrompt = `You are a helpful grocery shopping assistant. Use your tools to find recipe ingredients, search products, manage the cart, and answer cooking questions.
${userContextBlock}${conversationSummaryBlock}
**Tool selection:**
- For recipe/ingredient questions, ALWAYS use find_recipe_ingredient_products first.
- For "more options" or "more brands" requests, use search_products.

**Response formatting:**
- Tool results are JSON. Present them in plain language, never as raw JSON.
- Show each product in exactly this format: **Product Name** by Brand - ₹Price (ID: 12345) [🛒 Add]
- Always include the product ID as a plain number, like (ID: 3218). Do NOT create markdown links with # or (), and do not add any JavaScript code.
- For recipe ingredients, show each ingredient with its suggested product, then offer: "Want more options for any ingredient? Just ask!"
- Use emojis and clear structure. Keep responses helpful, fast, and easy to interact with.`;

    const modelWithTools = model.bindTools(allTools);

    try {
        const response = await modelWithTools.invoke([
            { role: "system", content: systemPrompt },
            ...state.messages
        ]);

        // The messages reducer appends the reply. If it has tool calls, the graph
        // routes to the tools node and then back here; otherwise it moves on.
        return { messages: [response] };
    } catch (error) {
        console.error("❌ Grocery shopping agent error:", error);
        const apology = "I apologize, but I'm having trouble with your shopping request right now. Please try asking about recipe ingredients, searching for products, or managing your cart!";
        return {
            messages: [new AIMessage(apology)],
            error: error.message
        };
    }
};

/**
 * Node 5: Tools
 * Runs the tool calls requested by the shopper agent and appends the results as tool messages.
 * userId and sessionId reach the tools through the graph's run config (config.configurable).
 */
export const toolNode = new ToolNode(allTools);

/**
 * Node 6: Process Results for caching
 */
export const processWorkOutputWithCaching = async (state) => {
    // Nothing to cache if the model call failed (the reply is just an apology)
    if (state.error) {
        return {};
    }

    const reply = state.messages.at(-1).content;

    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const query = lastUserMessage?.content || "";

    // Determine cache TTL based on tool execution results
    // The history loaded from Agent Memory has no tool messages, so every tool
    // message in state.messages belongs to the current turn
    const toolResults = state.messages
        .filter((message) => message.getType() === "tool")
        .map((toolMessage) => {
            let success;
            try {
                success = JSON.parse(toolMessage.content).success !== false;
            } catch {
                success = false;
            }
            return { toolName: toolMessage.name, success };
        });
    const cacheTTL = determineToolBasedCacheTTL(toolResults);

    // Don't cache if TTL is 0 (personal/dynamic operations or failures)
    if (cacheTTL === 0) {
        console.log("Skipping cache for personal/dynamic operations or tool failures");
        return {};
    }

    try {
        // Use data compliance agent for regulatory requirements
        const [sanitizedQuery, sanitizedResponse ] =  await Promise.all([
            dataComplianceAgent(query),
            dataComplianceAgent(reply)
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
        model: CONFIG.bedrockModelId,
        region: CONFIG.awsRegion,
        credentials: {
            accessKeyId: CONFIG.awsAccessKeyId,
            secretAccessKey: CONFIG.awsSecretAccessKey
        },
        //temperature: 0,
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
