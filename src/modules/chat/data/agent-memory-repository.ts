import { randomUUID } from 'node:crypto';
import { AgentMemory } from '@redis-iris/agent-memory';
import CONFIG from '#config';
import type { Attachment } from '#modules/chat/domain/attachments';

export type SessionMessage = { role: string; content: string; createdAt?: Date; attachments?: Attachment[] };

type LongTermMemoryInput = {
    id?: string;
    text: string;
    topics?: string[];
    userId: string;
    memoryType?: string;
    attributes?: Record<string, string>;
};

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
    client: AgentMemory;
    namespaceRef: { namespaceId: string } | undefined;

    constructor() {
        this.client = new AgentMemory({
            serverURL: CONFIG.agentMemoryUrl!,
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
     * @param sessionId - Session identifier (uniquely identifies the conversation)
     */
    async getWorkingMemory(sessionId: string): Promise<{ messages: SessionMessage[]; summary: string | null }> {
        try {
            console.log(`📥 Fetching session memory for session: ${sessionId}`);

            const session = await this.client.getSessionMemory(sessionId);

            const messages = (session.events || []).map((event) => ({
                role: String(event.role).toLowerCase(),
                content: (event.content || []).map((part) => part.text).join('\n'),
                createdAt: event.createdAt,
                attachments: event.metadata?.attachments
            }));
            const summary = session.summary?.text || null;

            console.log(`✅ Session memory retrieved: ${messages.length} messages`);
            if (summary) {
                console.log(`📝 Summary: ${summary.substring(0, 100)}...`);
            }

            return { messages, summary };
        } catch (error) {
            // A session that doesn't exist yet is the normal first-turn case
            if ((error as { statusCode?: number }).statusCode !== 404) {
                console.error('❌ Error getting session memory:', (error as Error).message);
            }
            return { messages: [], summary: null };
        }
    }

    /**
     * List the IDs of a user's sessions
     * @param userId - Owner of the sessions
     */
    async listSessionIds(userId: string): Promise<string[]> {
        const result = await this.client.listSessions(100, undefined, userId);
        return result.items;
    }

    /**
     * Append one conversation turn (user message + assistant reply) to a session.
     * The service creates the session on first event and extracts long-term
     * memories from it asynchronously.
     * @param sessionId - Session identifier
     * @param userId - Actor/owner identifier
     * @param attachments - Content shown with the reply, saved as metadata on the assistant event
     */
    async addConversationTurn(sessionId: string, userId: string, userMessage: string, assistantReply: string, attachments: Attachment[]) {
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
                ...(attachments?.length && { metadata: { attachments } })
            });

            console.log(`✅ Conversation turn saved`);
        } catch (error) {
            console.error('❌ Error saving conversation turn:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Search long-term memory
     * @param params - Search parameters
     */
    async searchLongTermMemory(params: { text: string; limit?: number; userId?: string; memoryType?: string }) {
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
            console.error('❌ Error searching long-term memory:', (error as Error).message);
            return [];
        }
    }

    /**
     * Create long-term memories
     * @param memories - Array of {text, topics, userId, id?, memoryType?, attributes?}
     */
    async createLongTermMemories(memories: LongTermMemoryInput[]) {
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
            const sdkError = error as Error & { statusCode?: number; body?: unknown };
            console.error('❌ Error creating long-term memories:', sdkError.message);
            if (sdkError.statusCode) {
                console.error('Error statusCode:', sdkError.statusCode);
            }
            if (sdkError.body) {
                console.error('Error body:', sdkError.body);
            }
            throw error;
        }
    }
}

const memoryRepository = new MemoryRepository();

export default memoryRepository;
