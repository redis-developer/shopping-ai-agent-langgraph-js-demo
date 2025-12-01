import { endSession as endChatSession } from '../chatService.js';

export class SessionService {
    constructor() {
        this.sessionId = null;
        this.currentChatId = null;
    }

    initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const userName = urlParams.get('name') || 'User';

        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = `Hello, ${userName}`;
        }

        // Try to get existing session ID from localStorage first
        const existingSessionId = localStorage.getItem('shopping_session_id');
        const existingUserName = localStorage.getItem('shopping_user_name');

        if (existingSessionId && existingUserName === userName.toLowerCase()) {
            // Use existing session for the same user
            this.sessionId = existingSessionId;
        } else {
            // Create new session ID and store it
            this.sessionId = `${userName.toLowerCase()}_${Date.now()}`;
            localStorage.setItem('shopping_session_id', this.sessionId);
            localStorage.setItem('shopping_user_name', userName.toLowerCase());
        }

        this.currentChatId = 'main_chat';

        return {
            sessionId: this.sessionId,
            currentChatId: this.currentChatId,
            userName
        };
    }

    async end(onSuccess = null, onError = null) {
        if (!confirm('Are you sure you want to end this session? This will clear all chat history and cart.')) {
            return;
        }

        await endChatSession(this.sessionId, {
            onSuccess: () => {
                // Clear localStorage when ending session
                localStorage.removeItem('shopping_session_id');
                localStorage.removeItem('shopping_user_name');

                this.sessionId = null;
                const newSession = this.initialize();

                if (onSuccess) {
                    onSuccess(newSession);
                }
            },
            onError: (error) => {
                console.error('Error ending session:', error);

                if (onError) {
                    onError(error);
                } else {
                    alert('Failed to end session. Please try again.');
                }
            }
        });
    }

    getSessionId() {
        return this.sessionId;
    }

    getCurrentChatId() {
        return this.currentChatId;
    }
}
