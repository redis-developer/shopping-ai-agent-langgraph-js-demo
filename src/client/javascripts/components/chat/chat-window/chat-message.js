import { MessageFormatter } from './message-formatter.js';
import { DOM_IDS } from '@utils/constants.js';

export class ChatMessage {
    /**
     * @param {string} message - The message text.
     * @param {'user' | 'assistant'} sender
     * @param {Object} [details] - Assistant response details: isCachedResponse, responseTime, usage, createdAt, attachments.
     * @param {(productId: string, buttonElement: HTMLElement) => void} [onProductAction] - Called when a product card's add button is clicked.
     * @param {(productId: string) => void} [onProductOpen] - Called when a product card is clicked.
     */
    constructor(message, sender, details = {}, onProductAction = null, onProductOpen = null) {
        this.message = message;
        this.sender = sender;
        this.isCached = details.isCachedResponse || false;
        this.responseTime = details.responseTime ?? null;
        this.usage = details.usage || null;
        this.createdAt = details.createdAt ? new Date(details.createdAt) : new Date();
        this.attachments = details.attachments || [];
        this.onProductAction = onProductAction;
        this.onProductOpen = onProductOpen;
    }

    createProductCards() {
        const productSummaries = this.attachments
            .filter((attachment) => attachment.type === 'productSummary')
            .map((attachment) => attachment.data);
        if (productSummaries.length === 0) return null;

        const list = document.createElement('div');
        list.className = 'chat-product-list';

        productSummaries.forEach((product) => {
            const card = document.getElementById(DOM_IDS.PRODUCT_CARD_TEMPLATE).content.firstElementChild.cloneNode(true);
            card.querySelector('.chat-product-image').textContent = product.image;
            card.querySelector('.chat-product-name').textContent = product.name;
            card.querySelector('.chat-product-name').href = `/products/${product.id}`;
            card.querySelector('.chat-product-rating').textContent = product.rating ? ` · ⭐ ${product.rating}` : '';
            card.querySelector('.price').textContent = `₹${product.price}`;

            card.querySelector('.chat-product-add').addEventListener('click', async (event) => {
                await this.onProductAction?.(product.id, event.currentTarget);
            });

            // Clicking anywhere else on the card shows the product page
            card.addEventListener('click', (event) => {
                if (event.target.closest('button')) return;
                event.preventDefault();
                this.onProductOpen?.(product.id);
            });

            list.appendChild(card);
        });

        return list;
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
        time.textContent = MessageFormatter.formatTimestamp(this.createdAt);

        // Product cards and the usage breakdown go between the reply text and the time
        if (!isUser) {
            const productCards = this.createProductCards();
            if (productCards) time.before(productCards);

            const responseInfo = this.createResponseInfo();
            if (responseInfo) time.before(responseInfo);
        }

        return messageDiv;
    }
}
