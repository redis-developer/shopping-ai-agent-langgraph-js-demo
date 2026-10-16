import { ChatOpenAI } from "@langchain/openai";
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
 * Node 2: Retrieve Long Term Memories
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
 * Node 3: Personal Shopper Agent
 *
 * Specialized agent with tools for shopping-related tasks
 */
export const personalShopperAgent = async (state) => {
    const model = new ChatOpenAI({ 
        temperature: 0.1,
        model: CONFIG.modelName, 
        apiKey: CONFIG.openAiApiKey 
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
 * Node 4: Tools
 * Runs the tool calls requested by the shopper agent and appends the results as tool messages.
 * userId and sessionId reach the tools through the graph's run config (config.configurable).
 */
export const toolNode = new ToolNode(allTools);

/**
 * Node 5: Process Results for caching
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
        // Use LLM-based GDPR sanitization
        const [sanitizedQuery, sanitizedResponse ] =  await Promise.all([
            dataComplianceAgent(query),
            dataComplianceAgent(reply)
        ]);

        console.log(`💾 Saving sanitized query to cache: "${sanitizedQuery.substring(0, 50)}..."`);

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
 * LLM-based GDPR-compliant data sanitization
 * Uses AI to intelligently remove personal information while preserving the core query
 */
async function dataComplianceAgent(text) {
    if (!text || typeof text !== 'string') return text;

    try {
        const model = new ChatOpenAI({
            temperature: 0,
            model: CONFIG.modelName,
            apiKey: CONFIG.openAiApiKey
        });

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
