import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { shoppingTools, entityQueryTools } from "./tools/shopping-tools.ts";
import { memoryTools } from "./tools/memory-tools.ts";
import { getContextRetrieverTools } from "../../context-retriever/index.ts";
import { checkSemanticCache, saveToSemanticCache } from "#modules/chat/domain/knowledge-bank-service";
import { determineToolBasedCacheTTL } from "../../helpers/caching.ts";
import { searchShopperPreferences } from "#modules/chat/domain/agent-memory-service";
import { getProductImage } from "#modules/products/domain/product-service";
import type { Attachment } from "#modules/chat/domain/attachments";
import type { ShoppingAgentStateType } from "./state.ts";
import { createChatModel, sanitizeForCache, guardrails } from "../../providers/index.ts";

// The tools of the Context Retriever surface, loaded once when the app starts. Empty when it is not set up.
const contextRetrieverTools = await getContextRetrieverTools();

// Without Context Retriever, the agent needs its own tools to query the entities
const ownEntityQueryTools = contextRetrieverTools.length > 0 ? [] : entityQueryTools;

export const allTools = [...shoppingTools, ...ownEntityQueryTools, ...memoryTools, ...contextRetrieverTools];

// Where each tool comes from, by its metadata. Whether a reply can be cached depends on it.
const toolSources = new Map(allTools.map((agentTool) => [agentTool.name, agentTool.metadata?.source as string | undefined]));

const suggestedFollowUpsSchema = z.object({
    followUps: z.array(z.string()).describe("Up to 3 short messages the shopper could send next")
});

// What the tools return, as far as this file reads it
type ToolProduct = { id: string; name: string; salePrice: number; category: string; rating: number };
type ToolResult = {
    success?: boolean;
    products?: ToolProduct[];
};

/**
 * Node 1: Query Cache Check
 */
export const queryCacheCheck = async (state: ShoppingAgentStateType) => {
    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const userQuery = (lastUserMessage?.content || "") as string;

    // Look-up of similar responses is turned off in the UI, so skip the semantic cache lookup
    if (state.lookupSimilarResponses === false) {
        console.log("⏭️ Look-up of similar responses is off - skipping the semantic cache lookup");
        return { cacheStatus: "miss" };
    }

    console.log(`🔍 Checking semantic cache for: "${userQuery.substring(0, 50)}..."`);
    
    try {
        const cachedResponse = await checkSemanticCache(userQuery);

        if (cachedResponse) {
            console.log("🎯 Semantic cache HIT - returning previous response");
            return {
                cacheStatus: "hit",
                messages: [...state.messages, new AIMessage(cachedResponse.content)],
                attachments: cachedResponse.attachments,
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
 * Simple content safety filter. The AI provider's guardrails screen the user's query,
 * and approved requests pass through to the personal shopper agent.
 * Only part of the graph when the provider has guardrails.
 */
export const frontDeskAgent = async (state: ShoppingAgentStateType) => {
    console.log('🏢 Front desk screening request for content safety...');

    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const userQuery = (lastUserMessage?.content || "") as string;

    console.log(`🔍 Front desk screening query: "${userQuery.substring(0, 50)}..."`);

    const verdict = await guardrails!.checkInput(userQuery);

    if (verdict.blocked) {
        console.log('🛡️ Front desk blocked irrelevant query - using default response');

        return {
            messages: [...state.messages, new AIMessage(verdict.message)],
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
 * Fetch the user's most relevant saved shopper preferences for the current query. Search
 * is ranked by semantic similarity to the query and filtered to this user only, so
 * the shopper agent sees the preferences actually pertinent to *this* question
 * (e.g. "pasta ingredients" surfaces a stored gluten-free preference).
 * Only preferences are retrieved. Other memories the service extracts, such as dated
 * product, price or cart facts, would let the agent answer from memory instead of calling
 * its tools, and then no product cards are shown.
 * Runs once per turn, before the shopper agent starts calling tools.
 */
export const retrieveLongTermMemories = async (state: ShoppingAgentStateType) => {
    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const query = (lastUserMessage?.content || "") as string;

    const memories = await searchShopperPreferences(state.userId, query);

    return { longTermMemories: memories.map((memory) => memory.text) };
};

/**
 * Node 4: Personal Shopper Agent
 *
 * Specialized agent with tools for shopping-related tasks
 */
export const personalShopperAgent = async (state: ShoppingAgentStateType) => {
    const model = createChatModel({ temperature: 0.1 });

    // Long-term memories were retrieved by the retrieve_long_term_memories node
    const userContextBlock = state.longTermMemories?.length
        ? `\n**What we know about this shopper (from long-term memory):**\n${state.longTermMemories.map((memoryText) => `- ${memoryText}`).join("\n")}\n`
        : "";
    const conversationSummaryBlock = state.conversationSummary
        ? `\n**Summary of the earlier conversation in this session:**\n${state.conversationSummary}\n`
        : "";

    // The Context Retriever tools filter carts by user ID, so the agent needs to know this shopper's
    const shopperIdBlock = contextRetrieverTools.length > 0
        ? `\n**This shopper's user ID is ${state.userId}.** When you look up the cart, only look at the cart of this user ID.\n`
        : "";

    const systemPrompt = `You are a helpful grocery shopping assistant. Use your tools to find recipe ingredients, search for products and groceries, manage the cart, and answer cooking questions.
${shopperIdBlock}${userContextBlock}${conversationSummaryBlock}

**Response formatting:**
- Tool results are JSON. Present them in plain language, never as raw JSON.
- Show each product in exactly this format: **Product Name** by Brand (ID: 12345) - ₹Price
- For a recipe, get its ingredients, then search for one product for each ingredient (ask for just 1 result per ingredient). List each ingredient with its quantity and its product, in order (the cards of the products found appear below in the same order), then offer: "Want more options for any ingredient? Just ask!"
- For cooking methods and techniques, food storage and preparation, nutrition, spices and flavour combinations, shopping tips and Indian cuisine, answer directly from your own knowledge, concisely and practically.
- Never state prices, brands or product IDs unless they come from a tool. To know the actual product ID of a product, look it up with the product tools.
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
            error: (error as Error).message
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
 * Collects the products the tools found this turn (the UI shows them as product cards)
 * and saves the reply together with them to the semantic cache.
 */
export const processWorkOutputWithCaching = async (state: ShoppingAgentStateType) => {
    // Nothing to cache if the model call failed (the reply is just an apology)
    if (state.error) {
        return {};
    }

    const reply = state.messages.at(-1)!.text;

    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const query = (lastUserMessage?.content || "") as string;

    // The history loaded from Agent Memory has no tool messages, so every tool
    // message in state.messages belongs to the current turn
    const toolMessages = state.messages
        .filter((message) => message.getType() === "tool")
        .map((toolMessage) => {
            let result: ToolResult;
            try {
                result = JSON.parse(toolMessage.content as string);
            } catch {
                result = { success: false };
            }
            return { toolName: toolMessage.name as string, result };
        });

    // Products the tools found this turn
    const attachments: Attachment[] = [];
    for (const { result } of toolMessages) {
        const products = result.products || [];
        for (const product of products) {
            if (!attachments.some((attachment) => attachment.data.id === product.id)) {
                attachments.push({
                    type: "productSummary",
                    data: {
                        id: product.id,
                        name: product.name,
                        price: product.salePrice,
                        image: getProductImage(product.category),
                        rating: product.rating
                    }
                });
            }
        }
    }

    // Determine cache TTL based on tool execution results
    const toolResults = toolMessages.map(({ toolName, result }) => ({ toolName, success: result.success !== false, source: toolSources.get(toolName) }));
    const cacheTTL = determineToolBasedCacheTTL(toolResults);

    // Don't cache if TTL is 0 (personal/dynamic operations or failures)
    if (cacheTTL === 0) {
        console.log("Skipping cache for personal/dynamic operations or tool failures");
        return { attachments };
    }

    try {
        // Use LLM-based GDPR sanitization
        const [sanitizedQuery, sanitizedResponse ] =  await Promise.all([
            sanitizeForCache(query),
            sanitizeForCache(reply)
        ]);

        console.log(`💾 Saving sanitized query to cache: "${sanitizedQuery.substring(0, 50)}..."`);

        await saveToSemanticCache(
            sanitizedQuery,
            { content: sanitizedResponse, attachments },
            cacheTTL,
            state.userId
        );

        console.log(`💾 Cached with TTL: ${cacheTTL}ms (${Math.round(cacheTTL / (60 * 60 * 1000))}h)`);

    } catch (error) {
        console.error('Error in GDPR-compliant caching:', error);
        // Don't fail the whole request if caching fails
    }

    return { attachments };
};

/**
 * Node 7: Generate Suggested Follow-ups
 * Writes a few short messages the shopper could send next, from the last exchange and
 * the shopper's saved preferences. They are not cached, so each shopper gets their own,
 * also when the reply came from the cache.
 */
export const generateSuggestedFollowUps = async (state: ShoppingAgentStateType) => {
    // No follow-ups after a failed model call or a blocked request
    if (state.error || state.guardrailTestResult === "blocked") {
        return {};
    }

    const lastUserMessage = state.messages.findLast((message) => message.getType() === "human");
    const reply = state.messages.at(-1)!.text;

    const preferencesBlock = state.longTermMemories?.length
        ? `\nWhat we know about this shopper:\n${state.longTermMemories.map((memoryText) => `- ${memoryText}`).join("\n")}\n`
        : "";

    const systemPrompt = `Suggest up-to 3 short messages the shopper could send next in this grocery shopping chat.

Rules:
- Write each from the shopper's point of view, in 5 words or fewer
- Make each something the assistant can act on: add products to the cart, show other options, or a related recipe or product
- Write in the language of the shopper's last message
- Use the shopper's saved preferences only when they clearly apply
- Do not repeat what the shopper just asked

Here are some examples (only to show the style):

Example 1:
Shopper: What do I need for dal tadka?
Assistant: Here are the ingredients for dal tadka: toor dal, ghee, cumin, garlic, tomatoes, with product suggestions.
Follow-ups: ["Add all items to my cart", "Show cheaper toor dal options", ]

Example 2:
Shopper: Add 2 packets of milk
Assistant: Done! I added 2 packets of milk to your cart.
Follow-ups: ["What's in my cart?", "Show me curd and butter products", "Add bread too"]

Example 3:
What we know about this shopper: Vegetarian, avoids onion and garlic

Shopper: Show me some snacks
Assistant: Here are some snacks: roasted makhana, salted peanuts, and baked chips.
Follow-ups: ["Show Jain-friendly snacks", "Any healthy options?"]

${preferencesBlock}`;

    try {
        const model = createChatModel({
            temperature: 0.5,
            fast: true,
            maxTokens: 150,
            timeout: 10000,
            disableStreaming: true // The shopper does not see this call's reply
        });

        const { followUps } = await model.withStructuredOutput(suggestedFollowUpsSchema).invoke([
            { role: "system", content: systemPrompt },
            new HumanMessage(`Shopper: ${lastUserMessage?.text}\n\nAssistant: ${reply}`)
        ]);

        return { suggestedFollowUps: followUps.slice(0, 3) };
    } catch (error) {
        // The reply is complete without them
        console.error("Error generating suggested follow-ups:", error);
        return {};
    }
};
