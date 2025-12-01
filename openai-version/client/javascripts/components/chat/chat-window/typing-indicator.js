export class TypingIndicator {
    constructor(messagesContainer) {
        this.messagesContainer = messagesContainer;
    }

    show() {
        if (!this.messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message typing-indicator';
        typingDiv.innerHTML = `
            <div class="brutal-assistant-avatar">🤖</div>
            <div class="brutal-message-content typing-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;

        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    hide() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
}
