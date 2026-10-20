import { fetchChatContext } from '@services/chat-service.js';
import { DOM_IDS } from '@utils/constants.js';

export class ContextPanel {
    /**
     * @param {() => {userId: string, sessionId: string}} getSession - Returns the current user and session.
     * @param {(sessionId: string) => void} onSessionSelect - Called when an earlier session is clicked.
     */
    constructor(getSession, onSessionSelect) {
        this.getSession = getSession;
        this.onSessionSelect = onSessionSelect;

        this.chatTab = document.getElementById(DOM_IDS.CHAT_TAB);
        this.contextTab = document.getElementById(DOM_IDS.CONTEXT_TAB);
        this.chatContent = document.getElementById(DOM_IDS.CHAT_CONTENT);
        this.panel = document.getElementById(DOM_IDS.CONTEXT_PANEL);
        this.preferences = document.getElementById(DOM_IDS.CONTEXT_PREFERENCES);
        this.summary = document.getElementById(DOM_IDS.CONTEXT_SUMMARY);
        this.sessions = document.getElementById(DOM_IDS.CONTEXT_SESSIONS);

        this.chatTab.addEventListener('click', () => this.showChat());
        this.contextTab.addEventListener('click', () => this.showContext());
    }

    showChat() {
        this.selectTab(this.chatTab, this.contextTab);
        this.chatContent.hidden = false;
        this.panel.hidden = true;
    }

    async showContext() {
        this.selectTab(this.contextTab, this.chatTab);
        this.chatContent.hidden = true;
        this.panel.hidden = false;

        const { userId, sessionId } = this.getSession();
        try {
            this.render(await fetchChatContext(userId, sessionId), sessionId);
        } catch (error) {
            console.error('Error loading the context:', error);
        }
    }

    selectTab(selected, other) {
        selected.classList.add('active');
        selected.setAttribute('aria-current', 'true');
        other.classList.remove('active');
        other.removeAttribute('aria-current');
    }

    render({ preferences, conversationSummary, sessions }, currentSessionId) {
        this.preferences.replaceChildren(...preferences.map((preference) => {
            const item = document.createElement('li');
            item.textContent = preference;
            return item;
        }));
        this.summary.textContent = conversationSummary || '';
        this.sessions.replaceChildren(...sessions.map((session) => this.createSessionItem(session, currentSessionId)));

        // Each list shows its empty message only when it has nothing to show
        this.preferences.nextElementSibling.hidden = preferences.length > 0;
        this.summary.nextElementSibling.hidden = Boolean(conversationSummary);
        this.sessions.nextElementSibling.hidden = sessions.length > 0;
    }

    createSessionItem(session, currentSessionId) {
        const item = document.getElementById(DOM_IDS.CONTEXT_SESSION_TEMPLATE).content.firstElementChild.cloneNode(true);
        const button = item.querySelector('.context-session');

        item.querySelector('.context-session-title').textContent = session.title || 'Empty session';
        if (session.startedAt) {
            const time = item.querySelector('.context-session-time');
            time.dateTime = session.startedAt;
            time.textContent = new Date(session.startedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
        }
        button.classList.toggle('current', session.sessionId === currentSessionId);
        button.addEventListener('click', () => this.onSessionSelect(session.sessionId));

        return item;
    }
}
