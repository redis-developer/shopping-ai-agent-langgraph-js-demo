import { ChatMessage } from './chat-message.js';
import { TypingIndicator } from './typing-indicator.js';
import { DOM_IDS } from '@utils/constants.js';

export class ChatWindow {
    constructor(messagesContainerId, onProductAction = null, onProductOpen = null) {
        this.messagesContainer = document.getElementById(messagesContainerId);
        this.typingIndicator = new TypingIndicator(this.messagesContainer);
        this.onProductAction = onProductAction;
        this.onProductOpen = onProductOpen;
    }

    /**
     * @param {string} message - The message text.
     * @param {'user' | 'assistant'} sender
     * @param {Object} [details] - Assistant response details: isCachedResponse, responseTime, usage, attachments.
     */
    addMessage(message, sender, details = {}) {
        if (!this.messagesContainer) return;

        const chatMessage = new ChatMessage(
            message,
            sender,
            details,
            this.onProductAction,
            this.onProductOpen
        );

        const messageElement = chatMessage.createElement();
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        this.typingIndicator.show();
    }

    hideTypingIndicator() {
        this.typingIndicator.hide();
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    clear() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }

    showNewChatMessage() {
        if (this.messagesContainer) {
            this.messagesContainer.replaceChildren(document.getElementById(DOM_IDS.NEW_CHAT_MESSAGE_TEMPLATE).content.firstElementChild.cloneNode(true));
        }
    }
}
