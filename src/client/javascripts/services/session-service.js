
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

        // Every page load is a new conversation. An earlier one is picked from the Context tab.
        this.sessionId = `${userName.toLowerCase()}-${Date.now()}`;
        this.userId = userName.toLowerCase();

        return {
            userId: this.userId,
            sessionId: this.sessionId,
            userName
        };
    }

    switchSession(sessionId) {
        this.sessionId = sessionId;
    }

    getSessionId() {
        return this.sessionId;
    }

}
