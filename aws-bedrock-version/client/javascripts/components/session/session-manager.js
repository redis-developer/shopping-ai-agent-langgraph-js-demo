import { SessionService } from '../../services/sessionService.js';

export class SessionManager {
    constructor(onSessionEnd = null, onNewChat = null) {
        this.sessionService = new SessionService();
        this.onSessionEnd = onSessionEnd;
        this.onNewChat = onNewChat;
        this.init();
    }

    init() {
        const endSessionBtn = document.getElementById('end-session');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endSession());
        }

        const newChatBtn = document.getElementById('new-chat');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.createNewChat());
        }
    }

    initializeSession() {
        return this.sessionService.initialize();
    }

    async endSession() {
        await this.sessionService.end(
            (newSession) => {
                if (this.onSessionEnd) {
                    this.onSessionEnd(newSession);
                }
            },
            (error) => {
                console.error('Session end failed:', error);
            }
        );
    }

    createNewChat() {
        if (this.onNewChat) {
            this.onNewChat();
        }
    }

    getSessionId() {
        return this.sessionService.getSessionId();
    }

    getCurrentChatId() {
        return this.sessionService.getCurrentChatId();
    }
}
