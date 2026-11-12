import { sendChatMessage, fetchSessionMessages } from '@services/chat-service.js';
import { DOM_IDS, CSS_SELECTORS } from '@utils/constants.js';

import { ChatWindow } from '@components/chat/chat-window/chat-window.js';
import { ChatInput } from '@components/chat/chat-input/chat-input.js';
import { ContextPanel } from '@components/chat/context-panel/context-panel.js';
import { SuggestionButtons } from '@components/chat/chat-input/suggestion-buttons.js';

import { CartCount } from '@components/cart/cart-count.js';
import { CartButton } from '@components/cart/cart-button.js';

import { SearchBar } from '@components/search/search-bar.js';
import { ProductCard } from '@components/products/product-card.js';
import { ProductDetail } from '@components/products/product-detail.js';
import { ProductView } from '@components/products/product-view.js';
import { ResultsView } from '@components/results/results-view.js';
import { createProductSummaryCard } from '@components/products/product-summary-card.js';
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
            DOM_IDS.CANVAS,
            DOM_IDS.CLOSE_PRODUCT_VIEW,
            new ProductDetail(
                this.userId,
                (result) => this.handleCartSuccess(result),
                (error) => this.handleCartError(error)
            )
        );

        this.resultsView = new ResultsView(
            {
                productSummary: createProductSummaryCard(
                    (productId, buttonElement) => this.handleProductAction(productId, buttonElement),
                    (product) => this.productView.open(product)
                )
            },
            (messageElement) => this.chatWindow.scrollToMessage(messageElement)
        );

        this.chatWindow = new ChatWindow(DOM_IDS.CHAT_MESSAGES);

        this.contextPanel = new ContextPanel(
            () => ({ userId: this.userId, sessionId: this.sessionId }),
            (sessionId) => this.loadSession(sessionId)
        );

        this.chatInput = new ChatInput(
            DOM_IDS.CHAT_FORM,
            DOM_IDS.CHAT_INPUT,
            (message) => this.sendMessage(message)
        );

        this.suggestionButtons = new SuggestionButtons(DOM_IDS.CHAT_MESSAGES, (text) => {
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
        this.chatWindow.clearSuggestedFollowUps();
        this.chatWindow.addMessage(message, 'user');
        this.chatWindow.showTypingIndicator();

        const lookupSimilarResponses = document.getElementById(DOM_IDS.LOOKUP_SIMILAR_RESPONSES_TOGGLE)?.checked ?? true;

        // The cards come before the reply is finished, so they are not added again when it is
        let cardsShown = false;

        await sendChatMessage(this.userId, this.sessionId, message, {
            lookupSimilarResponses,
            onStep: (step) => this.chatWindow.showTask(step),
            onToken: (text) => {
                this.chatWindow.appendToReply(text);
            },
            onAttachments: (attachments) => {
                cardsShown = this.resultsView.add(message, attachments);
            },
            onSuccess: (chatMessage) => {
                this.chatWindow.hideTypingIndicator();
                const messageElement = this.chatWindow.addMessage(chatMessage.content, 'assistant', chatMessage);
                if (cardsShown) {
                    this.resultsView.linkMessage(messageElement);
                } else {
                    this.resultsView.add(message, chatMessage.attachments, messageElement);
                }
                this.chatWindow.showSuggestedFollowUps(chatMessage.suggestedFollowUps);

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

    async loadSession(sessionId) {
        if (sessionId !== this.sessionId) {
            try {
                const { messages } = await fetchSessionMessages(sessionId);

                this.sessionManager.switchSession(sessionId);
                this.sessionId = sessionId;

                this.chatWindow.clear();
                this.resultsView.clear();

                // The cards of an earlier answer are shown in the canvas, as they were when the answer came
                let question = '';
                messages.forEach((message) => {
                    if (message.role === 'user') {
                        question = message.content;
                        this.chatWindow.addMessage(message.content, 'user', message);
                    } else {
                        const messageElement = this.chatWindow.addMessage(message.content, 'assistant', message);
                        this.resultsView.add(question, message.attachments, messageElement);
                    }
                });
            } catch (error) {
                console.error('Error loading the session:', error);
                NotificationSystem.error('Could not load that session. Please try again.');
                return;
            }
        }

        this.contextPanel.showChat();
    }

    handleNewChat() {
        this.chatWindow.showNewChatMessage();
        this.resultsView.clear();
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
