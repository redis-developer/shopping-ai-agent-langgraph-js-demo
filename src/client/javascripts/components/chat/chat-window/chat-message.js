import { MessageFormatter } from './message-formatter.js';
import { DOM_IDS } from '@utils/constants.js';

export class ChatMessage {
    /**
     * @param {string} message - The message text.
     * @param {'user' | 'assistant'} sender
     * @param {Object} [details] - Assistant response details: isCachedResponse, responseTime, usage, createdAt.
     */
    constructor(message, sender, details = {}) {
        this.message = message;
        this.sender = sender;
        this.isCached = details.isCachedResponse || false;
        this.responseTime = details.responseTime ?? null;
        this.usage = details.usage || null;
        this.createdAt = details.createdAt ? new Date(details.createdAt) : new Date();
    }

    createResponseInfo() {
        // Only responses that went through the server have a time (not local error messages)
        if (this.responseTime === null) return null;

        const usage = this.usage || {};
        const totalTokens = usage.totalTokens || 0;

        const detailRows = (counts) => Object.entries(counts || {})
            .map(([name, value]) => [`${name.charAt(0).toUpperCase()}${name.slice(1).replace(/_/g, ' ')}`, value.toLocaleString()]);

        const rows = [
            ['Response time', `${this.responseTime.toFixed(3)}s`],
            ['Input tokens', (usage.inputTokens || 0).toLocaleString()],
            ...detailRows(usage.inputTokenDetails),
            ['Output tokens', (usage.outputTokens || 0).toLocaleString()],
            ...detailRows(usage.outputTokenDetails),
            ['Total tokens', totalTokens.toLocaleString()]
        ];

        const responseInfo = document.getElementById(DOM_IDS.RESPONSE_INFO_TEMPLATE).content.firstElementChild.cloneNode(true);
        responseInfo.querySelector('.cached-message').hidden = !this.isCached;
        responseInfo.querySelector('.no-model-calls-message').hidden = totalTokens !== 0;

        const list = responseInfo.querySelector('ul');
        rows.forEach(([label, value]) => {
            const item = document.createElement('li');
            item.textContent = `${label}: ${value}`;
            list.appendChild(item);
        });

        return responseInfo;
    }

    createElement() {
        const isUser = this.sender === 'user';
        const messageDiv = document.getElementById(isUser ? DOM_IDS.USER_MESSAGE_TEMPLATE : DOM_IDS.ASSISTANT_MESSAGE_TEMPLATE).content.firstElementChild.cloneNode(true);

        messageDiv.querySelector('.message-text').innerHTML = MessageFormatter.formatMessage(this.message);

        const time = messageDiv.querySelector('.message-time');
        time.dateTime = this.createdAt.toISOString();
        time.textContent = MessageFormatter.formatTimestamp(this.createdAt);

        return messageDiv;
    }
}
