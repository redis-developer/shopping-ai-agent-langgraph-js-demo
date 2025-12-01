export class ChatToggle {
    constructor(toggleId, windowId, minimizeId) {
        this.chatToggle = document.getElementById(toggleId);
        this.chatWindow = document.getElementById(windowId);
        this.minimizeChat = document.getElementById(minimizeId);
        this.init();
    }

    init() {
        if (this.chatToggle && this.chatWindow) {
            this.chatToggle.addEventListener('click', () => {
                this.chatWindow.classList.toggle('active');
                const chatBubble = this.chatToggle.querySelector('.brutal-chat-bubble');
                if (chatBubble && this.chatWindow.classList.contains('active')) {
                    chatBubble.style.display = 'none';
                }
            });
        }

        if (this.minimizeChat && this.chatWindow) {
            this.minimizeChat.addEventListener('click', () => {
                this.chatWindow.classList.remove('active');
                const chatBubble = this.chatToggle.querySelector('.brutal-chat-bubble');
                if (chatBubble) {
                    chatBubble.style.display = 'block';
                }
            });
        }
    }

    open() {
        if (this.chatWindow) {
            this.chatWindow.classList.add('active');
        }
    }

    close() {
        if (this.chatWindow) {
            this.chatWindow.classList.remove('active');
        }
    }
}
