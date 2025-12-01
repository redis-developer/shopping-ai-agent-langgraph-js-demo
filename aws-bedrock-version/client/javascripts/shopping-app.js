import { sendChatMessage } from './chatService.js';
import { DOM_IDS, CSS_SELECTORS } from './utils/constants.js';

import { ChatWindow } from './components/chat/chat-window/chat-window.js';
import { ChatInput } from './components/chat/chat-input/chat-input.js';
import { SuggestionButtons } from './components/chat/chat-input/suggestion-buttons.js';
import { ChatToggle } from './components/chat/chat-toggle.js';

import { CartCount } from './components/cart/cart-count.js';
import { CartButton } from './components/cart/cart-button.js';

import { SearchBar } from './components/search/search-bar.js';
import { ProductCard } from './components/products/product-card.js';
import { NotificationSystem } from './components/notifications/notification-system.js';
import { SessionManager } from './components/session/session-manager.js';

export class ShoppingApp {
    constructor() {
        this.isLoading = false;
        this.cartCountLoaded = false;
        this.init();
    }

    init() {
        this.sessionManager = new SessionManager(
            (newSession) => this.handleSessionEnd(newSession),
            () => this.handleNewChat()
        );

        const session = this.sessionManager.initializeSession();
        this.sessionId = session.sessionId;
        this.currentChatId = session.currentChatId;

        this.cartCount = new CartCount(CSS_SELECTORS.BRUTAL_CART_COUNT);
        this.cartButton = new CartButton(
            (result) => this.handleCartSuccess(result),
            (error) => this.handleCartError(error)
        );

        this.chatWindow = new ChatWindow(
            DOM_IDS.CHAT_MESSAGES,
            (productId, buttonElement) => this.handleProductAction(productId, buttonElement)
        );

        this.chatInput = new ChatInput(
            DOM_IDS.CHAT_FORM,
            DOM_IDS.CHAT_INPUT,
            (message) => this.sendMessage(message)
        );

        this.suggestionButtons = new SuggestionButtons((text) => {
            this.chatInput.setValue(text);
            this.sendMessage(text);
        });

        this.chatToggle = new ChatToggle(
            DOM_IDS.CHAT_TOGGLE,
            DOM_IDS.CHAT_WINDOW,
            DOM_IDS.MINIMIZE_CHAT
        );

        this.searchBar = new SearchBar(
            CSS_SELECTORS.BRUTAL_SEARCH_BAR,
            CSS_SELECTORS.BRUTAL_MAIN_SEARCH,
            (query) => this.handleMainSearch(query)
        );

        this.productCard = new ProductCard(
            (productName, categoryName) => this.handleProductCardAction(productName, categoryName)
        );
    }

    async sendMessage(message) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.chatWindow.addMessage(message, 'user');
        this.chatWindow.showTypingIndicator();

        const useSmartRecall = document.getElementById(DOM_IDS.MEMORY_TOGGLE)?.checked || false;

        await sendChatMessage(this.sessionId, this.currentChatId, message, {
            useSmartRecall,
            onSuccess: (chatMessage) => {
                this.chatWindow.hideTypingIndicator();
                this.chatWindow.addMessage(
                    chatMessage.content,
                    'assistant',
                    chatMessage.isCachedResponse,
                    chatMessage.responseTime
                );

                if (chatMessage.content && chatMessage.content.includes('ID:') && !this.cartCountLoaded) {
                    this.cartCount.load(this.sessionId);
                    this.cartCountLoaded = true;
                }
            },
            onError: (error) => {
                console.error('Error sending message:', error);
                this.chatWindow.hideTypingIndicator();
                this.chatWindow.addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            }
        });

        this.isLoading = false;
    }

    async handleProductAction(productId, buttonElement) {
        await this.cartButton.addToCartFromChat(this.sessionId, productId, buttonElement);
    }

    handleCartSuccess(result) {
        NotificationSystem.success(`${result.message}`);
        this.cartCount.update(result.cartSummary.summary.totalItems);
    }

    handleCartError(error) {
        NotificationSystem.error('Failed to add to cart. Please try again.');
    }

    handleSessionEnd(newSession) {
        this.chatWindow.showWelcomeMessage();
        this.cartCount.update(0);
        this.sessionId = newSession.sessionId;
    }

    handleNewChat() {
        this.chatWindow.showNewChatMessage();
    }

    handleMainSearch(query) {
        this.chatToggle.open();
        this.chatInput.setValue(`Find ${query}`);
        this.sendMessage(`Find ${query}`);
    }

    handleProductCardAction(productName, categoryName) {
        if (categoryName) {
            this.chatToggle.open();
            this.chatInput.setValue(`Show me products in ${categoryName}`);
            this.chatInput.focus();
        } else if (productName) {
            NotificationSystem.show(`${productName} added to cart! 🛒`);

            const cartCountElement = document.querySelector(CSS_SELECTORS.BRUTAL_CART_COUNT);
            if (cartCountElement) {
                const currentCount = parseInt(cartCountElement.textContent) || 0;
                cartCountElement.textContent = currentCount + 1;
            }
        }
    }
}
