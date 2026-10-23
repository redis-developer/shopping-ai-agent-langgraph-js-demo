import { ChatMessage } from './chat-message.js';
import { MessageFormatter } from './message-formatter.js';
import { TypingIndicator } from './typing-indicator.js';
import { DOM_IDS } from '@utils/constants.js';

export class ChatWindow {
    constructor(messagesContainerId, onProductAction = null, onProductOpen = null) {
        this.messagesContainer = document.getElementById(messagesContainerId);
        this.typingIndicator = new TypingIndicator(this.messagesContainer);
        this.onProductAction = onProductAction;
        this.onProductOpen = onProductOpen;
        this.streamingReply = null; // The assistant's reply while it is still being written
        this.replyFooter = null; // The footer after the latest assistant message: its follow-ups and usage breakdown
        this.streamingText = '';
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
        if (sender === 'assistant' && this.streamingReply) {
            // The reply was shown as it was written. Swap it for the finished message, with its cards.
            this.streamingReply.replaceWith(messageElement);
            this.streamingReply = null;
        } else {
            this.messagesContainer.appendChild(messageElement);
        }

        const responseInfo = chatMessage.createResponseInfo();
        if (responseInfo) {
            this.replyFooter = document.getElementById(DOM_IDS.REPLY_FOOTER_TEMPLATE).content.firstElementChild.cloneNode(true);
            this.replyFooter.appendChild(responseInfo);
            messageElement.after(this.replyFooter);
        }
        this.scrollToBottom();
    }

    /**
     * Adds a piece of the assistant's reply, as it is written, to a message that is built up on screen.
     * @param {string} text
     */
    appendToReply(text) {
        if (!this.messagesContainer) return;

        if (!this.streamingReply) {
            this.streamingReply = new ChatMessage('', 'assistant').createElement();
            this.streamingText = '';
            // The typing indicator stays below the reply until the whole workflow is done
            this.messagesContainer.insertBefore(this.streamingReply, this.messagesContainer.querySelector('.typing-indicator'));
        }

        this.streamingText += text;
        this.streamingReply.querySelector('.message-text').innerHTML = MessageFormatter.formatMessage(this.streamingText);
        this.scrollToBottom();
    }

    /**
     * Shows buttons under the latest reply, each sending its text as the shopper's next message.
     * @param {string[]} [followUps]
     */
    showSuggestedFollowUps(followUps = []) {
        // Every reply that came from the server has a footer
        if (!this.replyFooter) return;

        this.replyFooter.querySelector('.quick-suggestions').replaceChildren(...this.createSuggestionItems(followUps));
        this.scrollToBottom();
    }

    /**
     * Builds one list item with a button for each text. Clicking a button sends its text as the shopper's message.
     * @param {string[]} texts
     * @returns {HTMLLIElement[]}
     */
    createSuggestionItems(texts) {
        return texts.map((text) => {
            const item = document.getElementById(DOM_IDS.SUGGESTION_TEMPLATE).content.firstElementChild.cloneNode(true);
            const button = item.querySelector('.suggestion-btn');
            button.dataset.text = text;
            button.textContent = text;
            return item;
        });
    }

    clearSuggestedFollowUps() {
        this.replyFooter?.querySelector('.quick-suggestions').replaceChildren();
    }

    showTypingIndicator() {
        this.typingIndicator.show();
    }

    showStatus(label) {
        this.typingIndicator.setStatus(label);
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
        this.streamingReply = null;
        this.replyFooter = null;
        if (this.messagesContainer) {
            this.messagesContainer.replaceChildren();
        }
    }

    showNewChatMessage() {
        if (this.messagesContainer) {
            this.messagesContainer.replaceChildren(document.getElementById(DOM_IDS.NEW_CHAT_MESSAGE_TEMPLATE).content.firstElementChild.cloneNode(true));
        }
    }
}
