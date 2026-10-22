import { ContextRetrieverAdmin } from '../modules/ai/context-retriever/admin.ts';

async function main() {
    // With --new-key the surface is left as it is, and only a new agent key is made for it
    const newKeyOnly = process.argv.slice(2).includes('--new-key');

    const admin = new ContextRetrieverAdmin();
    const surfaceId = newKeyOnly ? await admin.findSurface() : await admin.createSurface();

    const toolNames = await admin.waitUntilActive(surfaceId);
    console.log(`✅ The surface is active. Tools: ${toolNames.join(', ')}`);

    const agentKey = await admin.createAgentKey(surfaceId, { uniqueName: newKeyOnly });

    // The key is only returned this once
    console.log('\nAdd these to your .env file:\n');
    console.log(`CONTEXT_RETRIEVER_MCP_URL="${agentKey.mcpUrl}"`);
    console.log(`CONTEXT_RETRIEVER_AGENT_KEY="${agentKey.key}"`);
}

main().then(() => process.exit(0)).catch((error) => {
    console.error('❌ Setting up Context Retriever failed:', error);
    process.exit(1);
});
