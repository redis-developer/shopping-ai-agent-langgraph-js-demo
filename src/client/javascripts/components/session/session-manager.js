import { SessionService } from '@services/session-service.js';

export class SessionManager {
    constructor(onNewChat = null) {
        this.sessionService = new SessionService();
        this.onNewChat = onNewChat;
        this.init();
    }

    init() {
        const newChatBtn = document.getElementById('new-chat');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.createNewChat());
        }
    }

    initializeSession() {
        return this.sessionService.initialize();
    }

    createNewChat() {
        if (this.onNewChat) {
            this.onNewChat();
        }
    }

    switchSession(sessionId) {
        this.sessionService.switchSession(sessionId);
    }

    getSessionId() {
        return this.sessionService.getSessionId();
    }

}
