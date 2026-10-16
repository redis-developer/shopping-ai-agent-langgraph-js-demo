import { ChatMessage } from './chat-message.js';
import { TypingIndicator } from './typing-indicator.js';

export class ChatWindow {
    constructor(messagesContainerId, onProductAction = null) {
        this.messagesContainer = document.getElementById(messagesContainerId);
        this.typingIndicator = new TypingIndicator(this.messagesContainer);
        this.onProductAction = onProductAction;
    }

    addMessage(message, sender, isCached = false, responseTime = null, usage = null) {
        if (!this.messagesContainer) return;

        const chatMessage = new ChatMessage(
            message,
            sender,
            isCached,
            responseTime,
            usage,
            this.onProductAction
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
            this.messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="assistant-avatar">🤖</div>
                    <div class="message-content">
                        <p>New chat started! 🎉</p>
                        <p>I can help you with:</p>
                        <ul>
                            <li>🥘 Recipe ingredients</li>
                            <li>🔍 Finding products</li>
                            <li>🛒 Managing your cart</li>
                            <li>💡 Cooking suggestions</li>
                        </ul>
                        <p>What would you like to cook today?</p>
                    </div>
                </div>
            `;
        }
    }
}
