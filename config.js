import dotenv from 'dotenv';
dotenv.config();

if (!process.env.OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not defined in environment variables.');
}

const CONFIG = {
    serverPort: process.env.SERVER_PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    openAiApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.MODEL_NAME || "gpt-4o-mini",
    langcacheApiKey: process.env.LANGCACHE_API_KEY,
    langcacheCacheId: process.env.LANGCACHE_CACHE_ID,
    langcacheApiBaseUrl: process.env.LANGCACHE_API_BASE_URL,
    appName: process.env.APP_NAME,
};

export default CONFIG;
