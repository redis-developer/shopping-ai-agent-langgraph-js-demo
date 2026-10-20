import CONFIG from '#config';

// Each AI provider is its own workspace package, and only the chosen one is loaded.
// The package names are written out in full (not built from a variable) so that tools which
// bundle the app, such as Vercel, can find the packages and include them.
const PROVIDERS = {
    'openai': {
        packageName: '@redish/ai-provider-openai',
        load: () => import('@redish/ai-provider-openai'),
        settings: CONFIG.openai,
    },
    'aws-bedrock': {
        packageName: '@redish/ai-provider-aws-bedrock',
        load: () => import('@redish/ai-provider-aws-bedrock'),
        settings: CONFIG.awsBedrock,
    },
};

const { packageName, load, settings } = PROVIDERS[CONFIG.aiProvider];

let providerPackage;
try {
    providerPackage = await load();
} catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND') {
        throw new Error(`AI_PROVIDER=${CONFIG.aiProvider} needs ${packageName}. Install it with: npm run install:${CONFIG.aiProvider}`, { cause: error });
    }
    throw error;
}

/**
 * The AI provider chosen by AI_PROVIDER. What the app uses from it:
 *   createChatModel(options)  - a LangChain chat model
 *   embed(texts)              - embedding vectors for product search
 *   embeddingDimensions       - the size of those vectors
 *   sanitizeForCache(text)    - removes personal information before text is saved to the knowledge bank
 *   guardrails                - optional, screens requests before the shopping agent (checkInput(text))
 */
export const provider = providerPackage.createProvider(settings);

export const { createChatModel, embed, embeddingDimensions, sanitizeForCache, guardrails } = provider;
