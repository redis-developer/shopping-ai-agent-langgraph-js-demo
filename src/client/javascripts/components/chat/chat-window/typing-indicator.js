import { DOM_IDS } from '@utils/constants.js';

export class TypingIndicator {
    constructor(messagesContainer) {
        this.messagesContainer = messagesContainer;
    }

    show() {
        if (!this.messagesContainer) return;

        this.messagesContainer.appendChild(document.getElementById(DOM_IDS.TYPING_INDICATOR_TEMPLATE).content.firstElementChild.cloneNode(true));
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    /**
     * Shows what the assistant is doing under the dots.
     * @param {string} label
     */
    setStatus(label) {
        const status = document.querySelector('.typing-status');
        if (status) {
            status.textContent = label;
        }
    }

    hide() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}
