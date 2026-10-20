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

    hide() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}
