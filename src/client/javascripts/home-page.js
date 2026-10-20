import { sendChatMessage } from '@services/chat-service.js';
import { DOM_IDS, CSS_SELECTORS } from '@utils/constants.js';

import { ChatWindow } from '@components/chat/chat-window/chat-window.js';
import { ChatInput } from '@components/chat/chat-input/chat-input.js';
import { SuggestionButtons } from '@components/chat/chat-input/suggestion-buttons.js';

import { CartCount } from '@components/cart/cart-count.js';
import { CartButton } from '@components/cart/cart-button.js';

import { SearchBar } from '@components/search/search-bar.js';
import { ProductCard } from '@components/products/product-card.js';
import { ProductView } from '@components/products/product-view.js';
import { NotificationSystem } from '@components/notifications/notification-system.js';
import { SessionManager } from '@components/session/session-manager.js';

export class ShoppingApp {
    constructor() {
        this.isLoading = false;
        this.cartCountLoaded = false;
        this.init();
    }

    init() {
        this.sessionManager = new SessionManager(
            () => this.handleNewChat()
        );

        const session = this.sessionManager.initializeSession();
        this.userId = session.userId;
        this.sessionId = session.sessionId;

        this.cartCount = new CartCount(CSS_SELECTORS.CART_COUNT);
        this.cartButton = new CartButton(
            (result) => this.handleCartSuccess(result),
            (error) => this.handleCartError(error)
        );

        this.productView = new ProductView(
            DOM_IDS.CANVAS_HOME,
            DOM_IDS.PRODUCT_VIEW,
            DOM_IDS.PRODUCT_FRAME,
            DOM_IDS.CLOSE_PRODUCT_VIEW
        );

        // The product page shown in the canvas tells us when it changed the cart
        window.addEventListener('message', (event) => {
            if (event.origin === window.location.origin && event.data?.type === 'cart-count') {
                this.cartCount.update(event.data.totalItems);
            }
        });

        this.chatWindow = new ChatWindow(
            DOM_IDS.CHAT_MESSAGES,
            (productId, buttonElement) => this.handleProductAction(productId, buttonElement),
            (productId) => this.productView.open(productId)
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

        this.searchBar = new SearchBar(
            CSS_SELECTORS.SEARCH_BAR,
            CSS_SELECTORS.MAIN_SEARCH,
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

        const lookupSimilarResponses = document.getElementById(DOM_IDS.LOOKUP_SIMILAR_RESPONSES_TOGGLE)?.checked ?? true;

        await sendChatMessage(this.userId, this.sessionId, message, {
            lookupSimilarResponses,
            onSuccess: (chatMessage) => {
                this.chatWindow.hideTypingIndicator();
                this.chatWindow.addMessage(chatMessage.content, 'assistant', chatMessage);

                if (chatMessage.attachments?.length && !this.cartCountLoaded) {
                    this.cartCount.load(this.userId);
                    this.cartCountLoaded = true;
                }
            },
            onError: (error) => {
                console.error('Error sending message:', error);
                this.chatWindow.hideTypingIndicator();
                this.chatWindow.addMessage(error.message, 'assistant');
            }
        });

        this.isLoading = false;
    }

    async handleProductAction(productId, buttonElement) {
        await this.cartButton.addToCartFromChat(this.userId, productId, buttonElement);
    }

    handleCartSuccess(result) {
        NotificationSystem.success(`${result.message}`);
        this.cartCount.update(result.cartSummary.summary.totalItems);
    }

    handleCartError(error) {
        NotificationSystem.error('Failed to add to cart. Please try again.');
    }

    handleNewChat() {
        this.chatWindow.showNewChatMessage();
    }

    handleMainSearch(query) {
        this.chatInput.setValue(`Find ${query}`);
        this.sendMessage(`Find ${query}`);
    }

    handleProductCardAction(productName, categoryName) {
        if (categoryName) {
            this.chatInput.setValue(`Show me products in ${categoryName}`);
            this.chatInput.focus();
        } else if (productName) {
            NotificationSystem.show(`${productName} added to cart! 🛒`);

            const cartCountElement = document.querySelector(CSS_SELECTORS.CART_COUNT);
            if (cartCountElement) {
                const currentCount = parseInt(cartCountElement.textContent) || 0;
                cartCountElement.textContent = currentCount + 1;
            }
        }
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingApp = new ShoppingApp();
});
