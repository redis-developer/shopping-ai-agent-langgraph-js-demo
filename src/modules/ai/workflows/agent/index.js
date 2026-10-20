import * as fs from "node:fs/promises";

import { StateGraph, START, END } from "@langchain/langgraph";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

import { ShoppingAgentState } from "./state.js";
import { toolsCondition } from "@langchain/langgraph/prebuilt";

import { queryCacheCheck, frontDeskAgent, personalShopperAgent, processWorkOutputWithCaching, retrieveLongTermMemories, toolNode } from "./nodes.js";

import { getWorkingMemory, addConversationTurn } from "#modules/chat/domain/agent-memory-service.js";
import { UsageCallbackHandler } from "../../helpers/usage-callback-handler.js";
import { provider, guardrails } from "../../providers/index.js";

/**
 * Create Agentic AI Shopping Workflow
 *
 * This creates a multi-agent workflow system for intelligent shopping assistance with:
 * 1. Smart caching for recipe ingredient lists (long TTL) vs cart/search operations (no cache)
 * 2. Specialized shopping tools with embeddings support
 * 3. Product ID-based cart management
 * 4. LLM-powered recipe ingredient knowledge + real product database
 */
export const createAgenticAIShoppingWorkflow = () => {
    const builder = new StateGraph(ShoppingAgentState)
        .addNode("query_cache_check", queryCacheCheck)
        .addNode("retrieve_long_term_memories", retrieveLongTermMemories)
        .addNode("personal_shopper_agent", personalShopperAgent)
        .addNode("tools", toolNode)
        .addNode("process_work_output_with_caching", processWorkOutputWithCaching)

        .addEdge(START, "query_cache_check");

    if (guardrails) {
        // The provider screens each request first. A blocked one skips the shopping agent.
        builder
            .addNode("front_desk_agent", frontDeskAgent)
            .addConditionalEdges("query_cache_check", (state) => {
                return state.cacheStatus === "hit" ? END : "front_desk_agent";
            }, ["front_desk_agent", END])
            .addConditionalEdges("front_desk_agent", (state) => {
                return state.guardrailTestResult === "blocked" ? "process_work_output_with_caching" : "retrieve_long_term_memories";
            }, ["process_work_output_with_caching", "retrieve_long_term_memories"]);
    } else {
        builder.addConditionalEdges("query_cache_check", (state) => {
            return state.cacheStatus === "hit" ? END : "retrieve_long_term_memories";
        }, ["retrieve_long_term_memories", END]);
    }

    builder
        .addEdge("retrieve_long_term_memories", "personal_shopper_agent")
        .addConditionalEdges("personal_shopper_agent", toolsCondition, {
            tools: "tools",
            [END]: "process_work_output_with_caching"
        })
        .addEdge("tools", "personal_shopper_agent")
        .addEdge("process_work_output_with_caching", END);

    const graph = builder.compile();

    // Saving the image can fail (for example on a read-only file system), and that should not stop the app
    visualizeGraph(graph).catch((error) => console.warn(`Could not save the graph image: ${error.message}`));
    
    return graph;
};

export const shoppingWorkflowGraph = createAgenticAIShoppingWorkflow();

export function getWorkflowExecutionSummary(graphResult) {
    const toolNames = graphResult.messages
        .filter((message) => message.getType() === "tool")
        .map((toolMessage) => toolMessage.name);

    const summary = {
        toolsUsed: toolNames.length > 0 ? toolNames : ["none"],
        cacheStatus: graphResult.cacheStatus || "miss",
        finalResult: graphResult.messages.at(-1).content,
        guardrailTestResult: graphResult.guardrailTestResult || "not-tested",
        sessionId: graphResult.sessionId
    };

    console.log("\n🛒 GROCERY SHOPPING EXECUTION SUMMARY:");
    console.log(`Session: ${summary.sessionId}`);
    console.log(`Cache: ${summary.cacheStatus === "hit" ? "🎯 HIT" : "❌ MISS"}`);
    if (guardrails) {
        console.log(`Front Desk: ${summary.guardrailTestResult === "passed" ? "✅ APPROVED" :
                                   summary.guardrailTestResult === "blocked" ? "🛡️ BLOCKED" : "⏭️ SKIPPED"}`);
    }

    // Display all tools used
    if (summary.toolsUsed.length === 1 && summary.toolsUsed[0] === "none") {
        console.log(`Tools Used: 🧠 Direct Response (no tools)`);
    } else {
        const toolIcons = summary.toolsUsed.map(tool => {
            switch(tool) {
                case "direct_answer": return "🧠 Direct Knowledge";
                case "search_products": return "🔍 Product Search";
                case "add_to_cart": return "🛒 Add to Cart";
                case "view_cart": return "👀 View Cart";
                case "clear_cart": return "🗑️ Clear Cart";
                case "find_recipe_ingredient_products": return "🍳 Recipe Ingredients";
                case "save_to_semantic_cache": return "💾 Save Cache";
                case "error": return "❌ Error";
                default: return `🔧 ${tool}`;
            }
        });
        console.log(`Tools Used: ${toolIcons.join(" → ")}`);
        console.log(`Tool Count: ${summary.toolsUsed.length}`);
    }

    console.log("─".repeat(50));

    return summary;
}

/**
 * Main function for running the grocery shopping agent workflow
 * Uses Redis Agent Memory for conversation history
 */
export async function runShoppingAgentWorkflow(userId, sessionId, message, lookupSimilarResponses) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Shopping Agent Workflow - Session: ${sessionId}`);
    console.log(`${'='.repeat(60)}\n`);

    // Get session memory from Redis Agent Memory
    const workingMemory = await getWorkingMemory(sessionId);

    // Convert working memory messages to LangChain message format
    const messages = (workingMemory.messages || []).map((msg) => {
        return msg.role === "user"
            ? new HumanMessage(msg.content)
            : new AIMessage(msg.content);
    });

    // Once the service summarizes a long session, older turns are only available via the
    // summary. It is passed to the graph as state and added to the shopper's system prompt.
    if (workingMemory.summary) {
        console.log(`📝 Conversation summary: ${workingMemory.summary.substring(0, 150)}...`);
    }
    console.log(`💬 Messages in session memory: ${messages.length}`);

    // Add the new user message
    const userMessage = new HumanMessage(message);
    messages.push(userMessage);

    // Run the workflow, adding up token usage across every model call in it
    const usageHandler = new UsageCallbackHandler();
    const result = await shoppingWorkflowGraph.invoke({
        userId,
        sessionId,
        messages,
        conversationSummary: workingMemory.summary || undefined,
        lookupSimilarResponses,
    }, {
        callbacks: [usageHandler],
        // Read by the tools (cart and memory) via config.configurable
        configurable: { userId, sessionId }
    });

    // Get execution summary for logging
    const executionSummary = getWorkflowExecutionSummary(result);

    const finalReply = result.messages.at(-1).content;

    const queryResult = {
        isCachedResponse: result.cacheStatus === "hit",
        content: finalReply,
        foundProducts: result.foundProducts || [],
        usage: usageHandler.usage,
    };

    // Save conversation turn to Agent Memory (session memory)
    console.log(`\n💾 Saving conversation to Agent Memory...`);

    await addConversationTurn(sessionId, userId, message, finalReply, queryResult.foundProducts);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Workflow Complete`);
    console.log(`${'='.repeat(60)}\n`);

    return queryResult;
}

async function visualizeGraph(graph) {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const imageBuffer = new Uint8Array(await image.arrayBuffer());

    // The graph differs by provider (guardrails add a front desk step), so each has its own image
    await fs.writeFile(`docs/technical-diagrams/agent-graph-${provider.name}.png`, imageBuffer);
}
