import { MessageFormatter } from './message-formatter.js';

export class ChatMessage {
    constructor(message, sender, isCached = false, responseTime = null, onProductAction = null) {
        this.message = message;
        this.sender = sender;
        this.isCached = isCached;
        this.responseTime = responseTime;
        this.onProductAction = onProductAction;
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
            const cacheIndicator = this.isCached ? `
                <div class="cache-notice">
                    <i class="fas fa-clock"></i>
                    <span>${this.responseTime?.toFixed(3) || '0.000'}s</span>
                    This seems familiar - we've pulled in an earlier response. No waiting in line!
                </div>
            ` : '';

            messageDiv.innerHTML = `
                <div class="brutal-assistant-avatar">🤖</div>
                <div class="brutal-message-content assistant-content">
                    ${MessageFormatter.formatMessage(this.message)}
                    ${cacheIndicator}
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
