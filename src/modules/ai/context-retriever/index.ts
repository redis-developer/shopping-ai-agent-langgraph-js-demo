import { tool } from "@langchain/core/tools";

import CONFIG from "../../../config.ts";
import { getContextRetrieverClient } from "./context-retriever-client.ts";
import { toProductsResult } from "./entities/product-entity.ts";

/**
 * The tools of the Context Retriever surface, as tools for the agent. The surface generates them
 * from the data model (search, filter and fetch for each entity), so their names and arguments
 * are read from the surface, and not written here.
 * The agent keeps working with its own tools if Context Retriever is not set up, or cannot be reached.
 */
export async function getContextRetrieverTools() {
    if (!CONFIG.contextRetrieverMcpUrl || !CONFIG.contextRetrieverAgentKey) {
        console.log("Context Retriever is not set up, so the agent uses only its own tools");
        return [];
    }

    try {
        const mcpTools = await (await getContextRetrieverClient()).listTools();

        console.log(`📕 Context Retriever tools (${mcpTools.length}): ${mcpTools.map((mcpTool) => mcpTool.name).join(", ")}`);

        return mcpTools.map((mcpTool) => tool(
            async (args) => {
                console.log(`📕 Context Retriever: ${mcpTool.name}`, args);

                // The connection is fetched again for each call, since a session can end
                const result = await (await getContextRetrieverClient()).callTool(mcpTool.name, args as Record<string, unknown>);

                // A tool that failed tells the model why. Its result is data for the model to read, never instructions.
                const productsResult = result.isError ? undefined : toProductsResult(mcpTool.name, result.content);
                return JSON.stringify(productsResult ?? (result.isError ? result.content : result.structuredContent ?? result.content));
            },
            {
                name: mcpTool.name,
                description: mcpTool.description ?? mcpTool.name,
                schema: mcpTool.inputSchema,
                // Says where the tool comes from, so that the step shown for its calls can be chosen by source
                metadata: { source: "context-retriever" }
            }
        ));
    } catch (error) {
        console.error("❌ Could not load the Context Retriever tools, so the agent uses only its own tools:", error);
        return [];
    }
}
