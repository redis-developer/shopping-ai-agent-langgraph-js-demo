import dotenv from 'dotenv';
dotenv.config();

if (!process.env.BEDROCK_AWS_ACCESS_KEY_ID) {
    console.warn('Warning: BEDROCK_AWS_ACCESS_KEY_ID is not defined. Bedrock is required for LLM functionality.');
}

const CONFIG = {
    serverPort: process.env.SERVER_PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

    // AWS Bedrock Configuration
    bedrockModelId: process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-5-sonnet-20241022-v2:0",
    awsRegion: process.env.BEDROCK_AWS_REGION || "us-east-1",
    awsAccessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY,

    // Bedrock Guardrails Configuration
    bedrockConversationGuardrailId: process.env.BEDROCK_CONVERSATION_GUARDRAIL_ID,
    bedrockCacheGuardrailId: process.env.BEDROCK_CACHE_GUARDRAIL_ID,
    bedrockGuardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION,

    // Redis Configuration
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

    // Redis LangCache Configuration (unchanged)
    langcacheApiKey: process.env.LANGCACHE_API_KEY,
    langcacheCacheId: process.env.LANGCACHE_CACHE_ID,
    langcacheApiBaseUrl: process.env.LANGCACHE_API_BASE_URL,

    appName: process.env.APP_NAME,
};

export default CONFIG;
