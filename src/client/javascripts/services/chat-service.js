export let CHATS = {}; // In-memory store of sessionId → messages

/**
 * @typedef {Object} ChatMessage
 * @property {'user' | 'assistant'} role - Who sent the message.
 * @property {string} content - The actual message text.
 * @property {boolean} [isCached] - Whether the message came from cache.
 * @property {number|string} [responseTime] - Response time (optional).
 * @property {Object} [usage] - Token usage for this response (input, output, total and detail counts).
 * @property {Array<{id: string, name: string, price: number, image: string, rating: number}>} [foundProducts] - Products shown as cards with this response.
 */

export const chatData = {
    get chats() {
        return CHATS;
    },
    set chats(newChats) {
        CHATS = newChats;
    },

    /**
     * Adds a message to the conversation stored under a session ID.
     * @param {string} sessionId - The ID of the session.
     * @param {ChatMessage} message - The message to add.
     */
    addMessage(sessionId, message) {
        CHATS[sessionId] = CHATS[sessionId] || [];
        CHATS[sessionId].push(message);
    },

    /**
     * Returns the preview text of the first message in a conversation.
     * @param {string} sessionId 
     * @param {number} length 
     * @returns {string}
     */
    getPreview(sessionId, length = 25) {
        const firstMessage = CHATS[sessionId]?.[0]?.content || '';
        return firstMessage.length > 0 ? firstMessage.slice(0, length) + '...' : '';
    }
};

/**
 * Sends a chat message to the server.
 * 
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {string} message 
 * @param {Object} [options]
 * @param {() => void} [options.onLoad]                 - called before fetch
 * @param {(reply: string) => void} [options.onSuccess] - called with assistant reply
 * @param {(error: any) => void} [options.onError]      - called on fetch or server error
 * @param {boolean} [options.lookupSimilarResponses]      - whether to look up similar responses in the semantic cache (default: true)
 */
export async function sendChatMessage(userId, sessionId, message, options = {}) {
    const { onLoad, onSuccess, onError, lookupSimilarResponses = true } = options;

    try {
        onLoad?.();
        const startTime = performance.now();
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                sessionId,
                message,
                lookupSimilarResponses
            })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Unknown error');
        }

        const endTime = performance.now();
        const responseTime = (endTime - startTime) / 1000; // in seconds

        const data = await res.json();

        const chatMessageObject = {
            role: 'assistant',
            content: data.content,
            isCachedResponse: data.isCachedResponse,
            usage: data.usage,
            foundProducts: data.foundProducts,
            responseTime
        }
        chatData.addMessage(sessionId, chatMessageObject);
        
        onSuccess?.(chatMessageObject);

    } catch (error) {
        onError?.(error);
    }
}

