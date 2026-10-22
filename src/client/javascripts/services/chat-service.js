export let CHATS = {}; // In-memory store of sessionId → messages

/**
 * @typedef {Object} ChatMessage
 * @property {'user' | 'assistant'} role - Who sent the message.
 * @property {string} content - The actual message text.
 * @property {boolean} [isCached] - Whether the message came from cache.
 * @property {number|string} [responseTime] - Response time (optional).
 * @property {Object} [usage] - Token usage for this response (input, output, total and detail counts).
 * @property {string[]} [suggestedFollowUps] - Short messages the shopper could send next, shown as buttons under the response.
 * @property {Array<{type: 'productSummary', data: {id: string, name: string, price: number, image: string, rating: number}}>} [attachments] - Content shown with this response, such as product cards.
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

async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Unknown error');
    }
    return res.json();
}

/**
 * Gets what the assistant knows about the shopper: saved preferences, the summary of the
 * current session, and the latest earlier sessions.
 * @param {string} userId
 * @param {string} sessionId - The current session.
 * @returns {Promise<{preferences: string[], conversationSummary: string|null, sessions: Array<{sessionId: string, title: string, startedAt?: string}>}>}
 */
export function fetchChatContext(userId, sessionId) {
    return getJson(`/api/ai/chat/context?${new URLSearchParams({ userId, sessionId })}`);
}

/**
 * Gets the messages of one of the shopper's earlier sessions.
 * @param {string} sessionId
 * @returns {Promise<{messages: Array<{role: string, content: string, createdAt?: string, attachments?: Array}>, summary: string|null}>}
 */
export function fetchSessionMessages(sessionId) {
    return getJson(`/api/ai/chat/sessions/${encodeURIComponent(sessionId)}`);
}

/**
 * Reads the server's stream of events and returns the last one, which carries the full reply.
 * What the assistant is doing and the reply's text arrive first, piece by piece.
 * @param {Response} res
 * @param {(text: string) => void} [onToken]
 * @param {(step: {label: string, status: 'started'|'finished', durationMs?: number}) => void} [onStep]
 * @returns {Promise<{content: string, attachments?: Array, suggestedFollowUps?: string[], usage?: Object, isCachedResponse: boolean}>}
 */
async function readReply(res, onToken, onStep) {
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let unread = '';
    let reply = null;

    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;

        // Each event is "event: <type>" and "data: <json>", followed by a blank line
        unread += value;
        const events = unread.split('\n\n');
        unread = events.pop();

        for (const event of events) {
            const [typeLine, dataLine] = event.split('\n');
            const type = typeLine.slice('event: '.length);
            const data = JSON.parse(dataLine.slice('data: '.length));

            if (type === 'token') {
                onToken?.(data.text);
            } else if (type === 'step') {
                onStep?.(data);
            } else if (type === 'done') {
                reply = data;
            } else if (type === 'error') {
                throw new Error(data.message);
            }
        }
    }

    if (!reply) throw new Error('The reply ended before it was complete');
    return reply;
}

/**
 * Sends a chat message to the server.
 * 
 * @param {string} userId 
 * @param {string} sessionId 
 * @param {string} message 
 * @param {Object} [options]
 * @param {() => void} [options.onLoad]                 - called before fetch
 * @param {(text: string) => void} [options.onToken]    - called with each piece of the reply as it is written
 * @param {(step: {label: string, status: 'started'|'finished', durationMs?: number}) => void} [options.onStep] - called when a step starts and finishes
 * @param {(reply: string) => void} [options.onSuccess] - called with assistant reply
 * @param {(error: any) => void} [options.onError]      - called on fetch or server error
 * @param {boolean} [options.lookupSimilarResponses]      - whether to look up similar responses in the semantic cache (default: true)
 */
export async function sendChatMessage(userId, sessionId, message, options = {}) {
    const { onLoad, onToken, onStep, onSuccess, onError, lookupSimilarResponses = true } = options;

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

        const data = await readReply(res, onToken, onStep);

        const endTime = performance.now();
        const responseTime = (endTime - startTime) / 1000; // in seconds

        const chatMessageObject = {
            role: 'assistant',
            content: data.content,
            isCachedResponse: data.isCachedResponse,
            usage: data.usage,
            attachments: data.attachments,
            suggestedFollowUps: data.suggestedFollowUps,
            responseTime
        }
        chatData.addMessage(sessionId, chatMessageObject);
        
        onSuccess?.(chatMessageObject);

    } catch (error) {
        onError?.(error);
    }
}

