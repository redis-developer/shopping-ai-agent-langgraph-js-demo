/**
 * Debug script to verify the AI provider configuration (and guardrails for AWS Bedrock)
 * Usage: npm run debug-config
 */

import CONFIG from '../config.ts';

console.log('🔍 Configuration Debug Information\n');

console.log(`AI provider: ${CONFIG.aiProvider}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}\n`);

if (CONFIG.aiProvider === 'openai') {
    console.log('🔧 OpenAI:');
    console.log(`modelName: ${CONFIG.openai.modelName}`);
    console.log(`apiKey: ${CONFIG.openai.apiKey ? '✅ Set' : '❌ Not set (OPENAI_API_KEY)'}`);
}

if (CONFIG.aiProvider === 'aws-bedrock') {
    const bedrock = CONFIG.awsBedrock;

    console.log('🔧 AWS Bedrock:');
    console.log(`modelId: ${bedrock.modelId}`);
    console.log(`region: ${bedrock.region}`);
    console.log(`accessKeyId: ${bedrock.accessKeyId ? '✅ Set' : '❌ Not set (BEDROCK_AWS_ACCESS_KEY_ID)'}`);
    console.log(`secretAccessKey: ${bedrock.secretAccessKey ? '✅ Set' : '❌ Not set (BEDROCK_AWS_SECRET_ACCESS_KEY)'}`);

    console.log('\n🛡️ Guardrails Configuration Check:');
    if (bedrock.conversationGuardrailId && bedrock.cacheGuardrailId) {
        console.log('✅ Both guardrails configured');
        console.log(`   Conversation: ${bedrock.conversationGuardrailId}`);
        console.log(`   Cache: ${bedrock.cacheGuardrailId}`);
        console.log(`   Version: ${bedrock.guardrailVersion}`);
    } else {
        console.log('❌ Guardrails not properly configured');
        if (!bedrock.conversationGuardrailId) {
            console.log('   Missing: BEDROCK_CONVERSATION_GUARDRAIL_ID');
        }
        if (!bedrock.cacheGuardrailId) {
            console.log('   Missing: BEDROCK_CACHE_GUARDRAIL_ID');
        }

        console.log('   1. Check your .env file exists in the project root');
        console.log('   2. Verify the environment variable names are correct');
        console.log('   3. Restart your application after updating .env');
    }
}
