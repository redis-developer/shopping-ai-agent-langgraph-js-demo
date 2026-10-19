import { randomUUID } from 'node:crypto';
import { AgentMemory } from '@redis-iris/agent-memory';
import CONFIG from '#config';

// Actor ID for assistant-authored events, distinct from the user's ID
const ASSISTANT_ACTOR_ID = 'redish-shopping-agent';

/**
 * Memory Repository - Interface to Redis Agent Memory
 *
 * Uses the @redis-iris/agent-memory SDK:
 *   - Session memory  -> conversation events (+ server-generated summary)
 *   - Long-term memory -> facts extracted by the service or saved by the agent
 */
class MemoryRepository {
    constructor() {
        this.client = new AgentMemory({
            serverURL: CONFIG.agentMemoryUrl,
            storeId: CONFIG.agentMemoryStoreId,
            apiKey: CONFIG.agentMemoryApiKey,
            timeoutMs: 30000
        });

        // Optional: bind sessions / memories to a namespace resource
        this.namespaceRef = CONFIG.agentMemoryNamespaceId
            ? { namespaceId: CONFIG.agentMemoryNamespaceId }
            : undefined;

        console.log(`Connecting to Redis Agent Memory`);
        console.log(`   Server: ${CONFIG.agentMemoryUrl}`);
        console.log(`   Store: ${CONFIG.agentMemoryStoreId}`);
        console.log(`   Namespace: ${CONFIG.agentMemoryNamespaceId || '(none)'}`);
    }

    /**
     * Get session memory (conversation history) for a session
     * @param {string} sessionId - Session identifier (uniquely identifies the conversation)
     * @returns {Promise<{messages: Array<{role: string, content: string, foundProducts?: Array}>, summary: string|null}>}
     */
    async getWorkingMemory(sessionId) {
        try {
            console.log(`📥 Fetching session memory for session: ${sessionId}`);

            const session = await this.client.getSessionMemory(sessionId);

            const messages = (session.events || []).map((event) => ({
                role: String(event.role).toLowerCase(),
                content: (event.content || []).map((part) => part.text).join('\n'),
                foundProducts: event.metadata?.foundProducts
            }));
            const summary = session.summary?.text || null;

            console.log(`✅ Session memory retrieved: ${messages.length} messages`);
            if (summary) {
                console.log(`📝 Summary: ${summary.substring(0, 100)}...`);
            }

            return { messages, summary };
        } catch (error) {
            // A session that doesn't exist yet is the normal first-turn case
            if (error?.statusCode !== 404) {
                console.error('❌ Error getting session memory:', error.message);
            }
            return { messages: [], summary: null };
        }
    }

    /**
     * Append one conversation turn (user message + assistant reply) to a session.
     * The service creates the session on first event and extracts long-term
     * memories from it asynchronously.
     * @param {string} sessionId - Session identifier
     * @param {string} userId - Actor/owner identifier
     * @param {string} userMessage
     * @param {string} assistantReply
     * @param {Array} foundProducts - Products shown with the reply, saved as metadata on the assistant event
     */
    async addConversationTurn(sessionId, userId, userMessage, assistantReply, foundProducts) {
        try {
            console.log(`💾 Appending conversation turn for session: ${sessionId}`);

            const base = { sessionId, namespaceRef: this.namespaceRef };
            const now = Date.now();

            // Events are appended in order; keep createdAt strictly increasing
            await this.client.addSessionEvent({
                ...base,
                actorId: userId,
                role: 'USER',
                content: [{ text: userMessage }],
                createdAt: new Date(now)
            });
            await this.client.addSessionEvent({
                ...base,
                actorId: ASSISTANT_ACTOR_ID,
                role: 'ASSISTANT',
                content: [{ text: assistantReply }],
                createdAt: new Date(now + 1),
                ...(foundProducts?.length && { metadata: { foundProducts } })
            });

            console.log(`✅ Conversation turn saved`);
        } catch (error) {
            console.error('❌ Error saving conversation turn:', error.message);
            throw error;
        }
    }

    /**
     * Search long-term memory
     * @param {Object} params - Search parameters
     * @returns {Promise<Array>} Array of memory records
     */
    async searchLongTermMemory(params) {
        try {
            const { text, limit = 15, userId, memoryType } = params;

            console.log(`🔍 Searching long-term memory: "${text?.substring(0, 50)}..."`);

            const filter = {
                ...(userId && { ownerId: { eq: userId } }),
                ...(memoryType && { memoryType: { eq: memoryType } }),
                ...(this.namespaceRef && { namespaceRef: { eq: this.namespaceRef.namespaceId } })
            };

            const results = await this.client.searchLongTermMemory({
                text,
                limit,
                filter
            });

            const count = results.items?.length || 0;
            console.log(`✅ Found ${count} relevant memories`);

            return results.items || [];
        } catch (error) {
            console.error('❌ Error searching long-term memory:', error.message);
            return [];
        }
    }

    /**
     * Create long-term memories
     * @param {Array} memories - Array of {text, topics, userId, id?, memoryType?, attributes?}
     * @returns {Promise<void>}
     */
    async createLongTermMemories(memories) {
        try {
            console.log(`💾 Creating ${memories.length} long-term memories`);

            await this.client.bulkCreateLongTermMemories({
                memories: memories.map((mem) => ({
                    id: mem.id || randomUUID(),
                    text: mem.text,
                    memoryType: mem.memoryType || 'semantic',
                    topics: mem.topics || [],
                    ownerId: mem.userId,
                    namespaceRef: this.namespaceRef,
                    ...(mem.attributes && { attributes: mem.attributes })
                }))
            });

            console.log(`✅ Long-term memories created successfully`);
        } catch (error) {
            console.error('❌ Error creating long-term memories:', error.message);
            if (error.statusCode) {
                console.error('Error statusCode:', error.statusCode);
            }
            if (error.body) {
                console.error('Error body:', error.body);
            }
            throw error;
        }
    }
}

const memoryRepository = new MemoryRepository();

export default memoryRepository;
