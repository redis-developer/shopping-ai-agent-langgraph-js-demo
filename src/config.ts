import dotenv from 'dotenv';
dotenv.config();

const aiProvider = process.env.AI_PROVIDER || 'openai';

const CONFIG = {
    serverPort: process.env.SERVER_PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

    // Which AI provider to use: "openai" or "aws-bedrock"
    aiProvider,

    // OpenAI (AI_PROVIDER=openai)
    openai: {
        apiKey: process.env.OPENAI_API_KEY,
        modelName: process.env.MODEL_NAME || "gpt-4o-mini",
    },

    // AWS Bedrock (AI_PROVIDER=aws-bedrock)
    awsBedrock: {
        modelId: process.env.BEDROCK_MODEL_ID || "global.anthropic.claude-opus-4-7",
        region: process.env.BEDROCK_AWS_REGION || "us-east-1",
        accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,
        // Bedrock Guardrails
        conversationGuardrailId: process.env.BEDROCK_CONVERSATION_GUARDRAIL_ID,
        cacheGuardrailId: process.env.BEDROCK_CACHE_GUARDRAIL_ID,
        guardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION,
    },

    langcacheApiKey: process.env.LANGCACHE_API_KEY,
    langcacheCacheId: process.env.LANGCACHE_CACHE_ID,
    langcacheApiBaseUrl: process.env.LANGCACHE_API_BASE_URL,

    // Redis Agent Memory Configuration (@redis-iris/agent-memory)
    agentMemoryUrl: process.env.AGENT_MEMORY_URL,
    agentMemoryStoreId: process.env.AGENT_MEMORY_STORE_ID,
    agentMemoryApiKey: process.env.AGENT_MEMORY_API_KEY,
    // Optional: ID of a namespace resource to scope sessions / long-term memories
    agentMemoryNamespaceId: process.env.AGENT_MEMORY_NAMESPACE_ID,

    appName: process.env.APP_NAME,

    // Used for the GitHub links in the pages. Set GITHUB_URL if you run your own fork.
    githubUrl: process.env.GITHUB_URL || 'https://github.com/redis-developer/shopping-ai-agent-langgraph-js-demo',
};

// The environment variables each AI provider needs
const REQUIRED_BY_PROVIDER: Record<string, Record<string, string | undefined>> = {
    'openai': {
        OPENAI_API_KEY: CONFIG.openai.apiKey,
    },
    'aws-bedrock': {
        BEDROCK_AWS_ACCESS_KEY_ID: CONFIG.awsBedrock.accessKeyId,
        BEDROCK_AWS_SECRET_ACCESS_KEY: CONFIG.awsBedrock.secretAccessKey,
        BEDROCK_CONVERSATION_GUARDRAIL_ID: CONFIG.awsBedrock.conversationGuardrailId,
        BEDROCK_CACHE_GUARDRAIL_ID: CONFIG.awsBedrock.cacheGuardrailId,
        BEDROCK_GUARDRAIL_VERSION: CONFIG.awsBedrock.guardrailVersion,
    },
};

if (!REQUIRED_BY_PROVIDER[aiProvider]) {
    throw new Error(`Unknown AI_PROVIDER "${aiProvider}". Use one of: ${Object.keys(REQUIRED_BY_PROVIDER).join(', ')}`);
}

for (const [name, value] of Object.entries(REQUIRED_BY_PROVIDER[aiProvider])) {
    if (!value) {
        console.warn(`Warning: ${name} is not defined. AI_PROVIDER=${aiProvider} needs it.`);
    }
}

export default CONFIG;
