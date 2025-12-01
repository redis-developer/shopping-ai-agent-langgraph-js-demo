import { ChatMessage } from './chat-message.js';
import { TypingIndicator } from './typing-indicator.js';

export class ChatWindow {
    constructor(messagesContainerId, onProductAction = null) {
        this.messagesContainer = document.getElementById(messagesContainerId);
        this.typingIndicator = new TypingIndicator(this.messagesContainer);
        this.onProductAction = onProductAction;
    }

    addMessage(message, sender, isCached = false, responseTime = null) {
        if (!this.messagesContainer) return;

        const chatMessage = new ChatMessage(
            message,
            sender,
            isCached,
            responseTime,
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

    showWelcomeMessage() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `
                <div class="brutal-welcome-message">
                    <div class="brutal-assistant-avatar">🤖</div>
                    <div class="brutal-message-content">
                        <p>Session ended! 👋 Starting fresh...</p>
                        <p>What would you like to cook today?</p>
                    </div>
                </div>
            `;
        }
    }

    showNewChatMessage() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = `
                <div class="brutal-welcome-message">
                    <div class="brutal-assistant-avatar">🤖</div>
                    <div class="brutal-message-content">
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
