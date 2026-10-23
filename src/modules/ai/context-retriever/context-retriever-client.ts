import { ContextRetrieverMCPClient } from "@redis-iris/context-retriever/mcp";

import CONFIG from "#config";

let client: ContextRetrieverMCPClient | null = null;
let connecting: Promise<ContextRetrieverMCPClient> | null = null;

/**
 * Get the connection to the Context Retriever surface, shared by every request.
 * The service ends a session after a while, so a connection that is no longer open is replaced.
 */
export async function getContextRetrieverClient() {
    if (client?.isOpen) {
        return client;
    }

    const { contextRetrieverMcpUrl, contextRetrieverAgentKey } = CONFIG;
    if (!contextRetrieverMcpUrl || !contextRetrieverAgentKey) {
        throw new Error("Set CONTEXT_RETRIEVER_MCP_URL and CONTEXT_RETRIEVER_AGENT_KEY to use Context Retriever");
    }

    // Requests that arrive while the connection is being made wait for it, instead of making their own
    connecting ??= ContextRetrieverMCPClient.connect({
        mcpURL: contextRetrieverMcpUrl,
        agentApiKey: contextRetrieverAgentKey,
        timeoutMs: 30_000
    }).then((connected) => {
        console.log("Context Retriever connected");
        client = connected;
        return connected;
    }).finally(() => {
        connecting = null;
    });

    return connecting;
}
