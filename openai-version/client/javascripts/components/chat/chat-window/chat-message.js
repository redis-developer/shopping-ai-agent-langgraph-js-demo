import { MessageFormatter } from './message-formatter.js';

export class ChatMessage {
    constructor(message, sender, isCached = false, responseTime = null, usage = null, onProductAction = null) {
        this.message = message;
        this.sender = sender;
        this.isCached = isCached;
        this.responseTime = responseTime;
        this.usage = usage;
        this.onProductAction = onProductAction;
    }

    createResponseInfo() {
        // Only responses that went through the server have a time (not local error messages)
        if (this.responseTime === null) return '';

        const usage = this.usage || {};
        const totalTokens = usage.totalTokens || 0;

        const detailRows = (counts) => Object.entries(counts || {})
            .map(([name, value]) => `<li>${name.charAt(0).toUpperCase()}${name.slice(1).replace(/_/g, ' ')}: ${value.toLocaleString()}</li>`)
            .join('');

        const cachedMessage = this.isCached
            ? "<p>This seems familiar, so we've pulled in an earlier response. No waiting in line!</p>"
            : '';
        const noModelCallsMessage = totalTokens === 0
            ? '<p>No model calls were needed for this turn.</p>'
            : '';

        return `
            <div class="response-info">
                <details>
                    <summary>Usage breakdown</summary>
                    ${cachedMessage}
                    <ul>
                        <li>Response time: ${this.responseTime.toFixed(3)}s</li>
                        <li>Input tokens: ${(usage.inputTokens || 0).toLocaleString()}</li>
                        ${detailRows(usage.inputTokenDetails)}
                        <li>Output tokens: ${(usage.outputTokens || 0).toLocaleString()}</li>
                        ${detailRows(usage.outputTokenDetails)}
                        <li>Total tokens: ${totalTokens.toLocaleString()}</li>
                    </ul>
                    ${noModelCallsMessage}
                </details>
            </div>
        `;
    }

    createElement() {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${this.sender}-message`;

        const timestamp = MessageFormatter.formatTimestamp(new Date());

        if (this.sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content user-content">
                    ${MessageFormatter.formatMessage(this.message)}
                    <div class="message-time">${timestamp}</div>
                </div>
                <div class="user-avatar">👤</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="assistant-avatar">🤖</div>
                <div class="message-content assistant-content">
                    ${MessageFormatter.formatMessage(this.message)}
                    ${this.createResponseInfo()}
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        }

        if (this.sender === 'assistant') {
            this.attachProductInteractions(messageDiv);
        }

        return messageDiv;
    }

    attachProductInteractions(messageElement) {
        const cartBtns = messageElement.querySelectorAll('.cart-icon-btn');
        if (cartBtns.length === 0) {
            return;
        }

        cartBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.dataset.productId;
                if (productId && this.onProductAction) {
                    await this.onProductAction(productId, btn);
                }
            });
        });
    }
}
