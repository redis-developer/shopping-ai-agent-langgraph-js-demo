export let CURRENT_CHAT_ID = null;
export let CHATS = {}; // In-memory store of chatId → messages

/**
 * @typedef {Object} ChatMessage
 * @property {'user' | 'assistant'} role - Who sent the message.
 * @property {string} content - The actual message text.
 * @property {boolean} [isCached] - Whether the message came from cache.
 * @property {number|string} [responseTime] - Response time (optional).
 */

export const chatData = {
    get currentChatId() {
        return CURRENT_CHAT_ID;
    },
    set currentChatId(id) {
        CURRENT_CHAT_ID = id;
    },
    get chats() {
        return CHATS;
    },
    set chats(newChats) {
        CHATS = newChats;
    },

    /**
     * Adds a message to the chat by chatId.
     * @param {string} chatId - The ID of the chat session.
     * @param {ChatMessage} message - The message to add.
     */
    addMessage(chatId, message) {
        CHATS[chatId] = CHATS[chatId] || [];
        CHATS[chatId].push(message);
    },

    /**
     * Returns the preview text of the first message in a chat.
     * @param {string} chatId 
     * @param {number} length 
     * @returns {string}
     */
    getPreview(chatId, length = 25) {
        const firstMessage = CHATS[chatId]?.[0]?.content || '';
        return firstMessage.length > 0 ? firstMessage.slice(0, length) + '...' : '';
    }
};

/**
 * Sends a chat message to the server.
 * 
 * @param {string} sessionId 
 * @param {string} chatId 
 * @param {string} message 
 * @param {Object} [options]
 * @param {() => void} [options.onLoad]                 - called before fetch
 * @param {(reply: string) => void} [options.onSuccess] - called with assistant reply
 * @param {(error: any) => void} [options.onError]      - called on fetch or server error
 * @param {boolean} [options.useSmartRecall]      - called on fetch or server error
 */
export async function sendChatMessage(sessionId, chatId, message, options = {}) {
    const { onLoad, onSuccess, onError, useSmartRecall } = options;

    try {
        onLoad?.();
        const startTime = performance.now();
        const res = await fetch('/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chatId,
                sessionId,
                message,
                ...(useSmartRecall && {
                    useSmartRecall: true
                })
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
            responseTime
        }
        chatData.addMessage(chatId, chatMessageObject);
        
        onSuccess?.(chatMessageObject);

    } catch (error) {
        onError?.(error);
    }
}

/**
 * Ends a user session and deletes their chat history from Redis.
 *
 * @param {string} sessionId - The user's session identifier.
 * @param {Object} [options]
 * @param {() => void} [options.onLoad]      - Called before the request starts.
 * @param {() => void} [options.onSuccess]   - Called on successful deletion.
 * @param {(error: any) => void} [options.onError] - Called on failure.
 */
export async function endSession(sessionId, options = {}) {
    const { onLoad, onSuccess, onError } = options;

    try {
        onLoad?.();

        const res = await fetch('/ai/chat/end-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Unknown error');
        }

        const data = await res.json();
        onSuccess?.(data);

    } catch (err) {
        console.error('Failed to end session:', err);
        onError?.(err);
    }
}

