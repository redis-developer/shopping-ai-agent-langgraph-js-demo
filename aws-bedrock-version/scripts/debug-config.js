/**
 * Debug script to verify configuration and guardrails setup
 * Usage: node scripts/debug-config.js
 */

import CONFIG from '../config.js';

console.log('🔍 Configuration Debug Information\n');

console.log('📋 Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`BEDROCK_CONVERSATION_GUARDRAIL_ID: ${process.env.BEDROCK_CONVERSATION_GUARDRAIL_ID || 'undefined'}`);
console.log(`BEDROCK_CACHE_GUARDRAIL_ID: ${process.env.BEDROCK_CACHE_GUARDRAIL_ID || 'undefined'}`);
console.log(`BEDROCK_GUARDRAIL_VERSION: ${process.env.BEDROCK_GUARDRAIL_VERSION || 'undefined'}`);
console.log(`BEDROCK_AWS_ACCESS_KEY_ID: ${process.env.BEDROCK_AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set'}`);
console.log(`BEDROCK_AWS_SECRET_ACCESS_KEY: ${process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set'}`);
console.log(`BEDROCK_AWS_REGION: ${process.env.BEDROCK_AWS_REGION || 'undefined'}`);
console.log(`BEDROCK_MODEL_ID: ${process.env.BEDROCK_MODEL_ID || 'undefined'}`);

console.log('\n🔧 Parsed CONFIG Object:');
console.log(`bedrockConversationGuardrailId: ${CONFIG.bedrockConversationGuardrailId || 'undefined'}`);
console.log(`bedrockCacheGuardrailId: ${CONFIG.bedrockCacheGuardrailId || 'undefined'}`);
console.log(`bedrockGuardrailVersion: ${CONFIG.bedrockGuardrailVersion || 'undefined'}`);
console.log(`bedrockModelId: ${CONFIG.bedrockModelId}`);
console.log(`awsRegion: ${CONFIG.awsRegion}`);
console.log(`awsAccessKeyId: ${CONFIG.awsAccessKeyId ? '✅ Set' : '❌ Not set'}`);
console.log(`awsSecretAccessKey: ${CONFIG.awsSecretAccessKey ? '✅ Set' : '❌ Not set'}`);

console.log('\n🛡️ Guardrails Configuration Check:');
if (CONFIG.bedrockConversationGuardrailId && CONFIG.bedrockCacheGuardrailId) {
    console.log('✅ Both guardrails configured');
    console.log(`   Conversation: ${CONFIG.bedrockConversationGuardrailId}`);
    console.log(`   Cache: ${CONFIG.bedrockCacheGuardrailId}`);
    console.log(`   Version: ${CONFIG.bedrockGuardrailVersion}`);
} else {
    console.log('❌ Guardrails not properly configured');
    if (!CONFIG.bedrockConversationGuardrailId) {
        console.log('   Missing: BEDROCK_CONVERSATION_GUARDRAIL_ID');
    }
    if (!CONFIG.bedrockCacheGuardrailId) {
        console.log('   Missing: BEDROCK_CACHE_GUARDRAIL_ID');
    }
}


if (!CONFIG.bedrockConversationGuardrailId || !CONFIG.bedrockCacheGuardrailId) {
    console.log('   1. Check your .env file exists in the project root');
    console.log('   2. Verify the environment variable names are correct');
    console.log('   3. Restart your application after updating .env');
}
