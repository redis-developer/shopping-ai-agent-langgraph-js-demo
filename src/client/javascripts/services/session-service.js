
export class SessionService {
    constructor() {
        this.sessionId = null;
        this.userId = null;
    }

    initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const userName = urlParams.get('name') || 'User';

        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = `Hello, ${userName}`;
        }

        // Try to get existing session ID from localStorage first
        const existingSessionId = localStorage.getItem('shopping-session-id');
        const existingUserName = localStorage.getItem('shopping-user-name');

        if (existingSessionId && existingUserName === userName.toLowerCase()) {
            // Use existing session for the same user
            this.sessionId = existingSessionId;
        } else {
            // Create new session ID and store it
            this.sessionId = `${userName.toLowerCase()}-${Date.now()}`;
            localStorage.setItem('shopping-session-id', this.sessionId);
            localStorage.setItem('shopping-user-name', userName.toLowerCase());
        }

        this.userId = userName.toLowerCase();

        return {
            userId: this.userId,
            sessionId: this.sessionId,
            userName
        };
    }

    switchSession(sessionId) {
        this.sessionId = sessionId;
        localStorage.setItem('shopping-session-id', sessionId);
    }

    getSessionId() {
        return this.sessionId;
    }

}
