import { sendChatMessage, endSession, addToCart, loadCartCount } from './chatService.js';

// Shopping Website Chat Integration
class ShoppingChatApp {
    constructor() {
        this.currentChatId = null;
        this.sessionId = null;
        this.isLoading = false;
        this.cartCountLoaded = false; // Track if we've loaded cart count yet
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSession();
        this.setupChatToggle();
        this.setupSuggestions();
        // Don't load cart count immediately - wait for user session to be established
    }

    setupEventListeners() {
        // Chat form submission
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => this.handleChatSubmit(e));
        }

        // End session
        const endSessionBtn = document.getElementById('end-session');
        if (endSessionBtn) {
            endSessionBtn.addEventListener('click', () => this.endSession());
        }

        // New chat
        const newChatBtn = document.getElementById('new-chat');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.createNewChat());
        }

        // Category cards
        const categoryCards = document.querySelectorAll('.brutal-category-card');
        categoryCards.forEach(card => {
            card.addEventListener('click', (e) => this.handleCategoryClick(e));
        });

        // Product add buttons
        const addBtns = document.querySelectorAll('.brutal-add-btn');
        addBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleProductAdd(e));
        });

        // Main search
        const mainSearchForm = document.querySelector('.brutal-search-bar');
        if (mainSearchForm) {
            mainSearchForm.addEventListener('submit', (e) => this.handleMainSearch(e));
        }
    }

    setupChatToggle() {
        const chatToggle = document.getElementById('chatToggle');
        const chatWindow = document.getElementById('chatWindow');
        const minimizeChat = document.getElementById('minimizeChat');

        if (chatToggle && chatWindow) {
            chatToggle.addEventListener('click', () => {
                chatWindow.classList.toggle('active');
                const chatBubble = chatToggle.querySelector('.brutal-chat-bubble');
                if (chatBubble && chatWindow.classList.contains('active')) {
                    chatBubble.style.display = 'none';
                }
            });
        }

        if (minimizeChat && chatWindow) {
            minimizeChat.addEventListener('click', () => {
                chatWindow.classList.remove('active');
                const chatBubble = chatToggle.querySelector('.brutal-chat-bubble');
                if (chatBubble) {
                    chatBubble.style.display = 'block';
                }
            });
        }
    }

    setupSuggestions() {
        const suggestionBtns = document.querySelectorAll('.brutal-suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const text = e.target.getAttribute('data-text');
                const chatInput = document.getElementById('chat-input');
                if (chatInput && text) {
                    chatInput.value = text;
                    this.sendMessage(text);
                }
            });
        });
    }

    initializeSession() {
        // Get user name from URL parameters or generate one
        const urlParams = new URLSearchParams(window.location.search);
        const userName = urlParams.get('name') || 'User';
        
        // Update display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = `Hello, ${userName}`;
        }

        // Generate consistent session ID (don't regenerate on every action)
        if (!this.sessionId) {
            this.sessionId = `${userName.toLowerCase()}_${Date.now()}`;
        }
        this.currentChatId = 'main_chat';
    }

    handleChatSubmit(e) {
        e.preventDefault();
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();
        
        if (!message || this.isLoading) return;

        chatInput.value = '';
        this.sendMessage(message);
    }

    async sendMessage(message) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.addMessageToChat(message, 'user');
        this.showTypingIndicator();

        const useSmartRecall = document.getElementById('memory-toggle')?.checked || false;
        
        await sendChatMessage(this.sessionId, this.currentChatId, message, {
            useSmartRecall,
            onSuccess: (chatMessage) => {
                this.hideTypingIndicator();
                this.addMessageToChat(chatMessage.content, 'assistant', chatMessage.isCachedResponse, chatMessage.responseTime);
                
                // Only load cart count if the response contains product information
                if (chatMessage.content && chatMessage.content.includes('ID:') && !this.cartCountLoaded) {
                    this.loadCartCountAsync();
                    this.cartCountLoaded = true;
                }
            },
            onError: (error) => {
                console.error('Error sending message:', error);
                this.hideTypingIndicator();
                this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'assistant');
            },
            onLoad: () => {
                // Loading already handled above
            }
        });
        
        this.isLoading = false;
    }

    addMessageToChat(message, sender, isCached = false, responseTime = null) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        const timestamp = this.formatTimestamp(new Date());

        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content user-content">
                    ${this.formatMessage(message)}
                    <div class="message-time">${timestamp}</div>
                </div>
                <div class="user-avatar">👤</div>
            `;
        } else {
            const cacheIndicator = isCached ? `
                <div class="cache-notice">
                    <i class="fas fa-clock"></i>
                    <span>${responseTime?.toFixed(3) || '0.000'}s</span>
                    This seems familiar - we've pulled in an earlier response. No waiting in line!
                </div>
            ` : '';
            
            messageDiv.innerHTML = `
                <div class="brutal-assistant-avatar">🤖</div>
                <div class="brutal-message-content assistant-content">
                    ${this.formatMessage(message)}
                    ${cacheIndicator}
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Attach product interactions for assistant messages
        if (sender === 'assistant') {
            this.attachProductInteractions(messageDiv);
        }
    }

    formatMessage(message) {
        // Enhanced formatting with product interactions - but only if product IDs exist
        let formatted = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/₹(\d+)/g, '<span class="price">₹$1</span>');
        
        // Only add cart icons if the message actually contains product IDs
        const productIdPattern = /\(ID: ([^)]+)\)/g;
        const hasProductIds = productIdPattern.test(formatted);
        
        if (hasProductIds) {
            // Reset the regex since test() consumed it
            const productIdPatternReset = /\(ID: ([^)]+)\)/g;
            formatted = formatted.replace(productIdPatternReset, (match, productId) => {
                return `
                    <span class="product-actions">
                        <span class="product-id">${match}</span>
                        <button class="cart-icon-btn" data-product-id="${productId}" title="Add to Cart">
                            🛒
                        </button>
                        <a href="/product/${productId}" class="product-link" title="View Details" target="_blank">
                            👁️
                        </a>
                    </span>
                `;
            });
        }
        
        return formatted;
    }

    /**
     * Attach event listeners for product interactions in chat
     */
    attachProductInteractions(messageElement) {
        // Only attach if there are actually cart buttons in this message
        const cartBtns = messageElement.querySelectorAll('.cart-icon-btn');
        if (cartBtns.length === 0) {
            return; // No product interactions needed
        }
        
        cartBtns.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = btn.dataset.productId;
                if (productId) {
                    await this.addToCartFromChat(productId, btn);
                }
            });
        });
    }

    /**
     * Add product to cart from chat interface
     */
    async addToCartFromChat(productId, buttonElement) {
        const originalContent = buttonElement.innerHTML;
        
        await addToCart(this.sessionId, productId, 1, {
            onLoad: () => {
                buttonElement.innerHTML = '⏳';
                buttonElement.disabled = true;
            },
            onSuccess: (result) => {
                buttonElement.innerHTML = '✅';
                this.showNotification(`${result.message}`, 'success');
                this.updateCartCount(result.cartSummary.summary.totalItems);
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            },
            onError: (error) => {
                console.error('Error adding to cart:', error);
                buttonElement.innerHTML = '❌';
                this.showNotification('Failed to add to cart. Please try again.', 'error');
                
                setTimeout(() => {
                    buttonElement.innerHTML = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            }
        });
    }

    /**
     * Update cart count in header
     */
    updateCartCount(count) {
        const cartCountElement = document.querySelector('.brutal-cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = count || 0;
            cartCountElement.style.transform = 'scale(1.3)';
            setTimeout(() => {
                cartCountElement.style.transform = 'scale(1)';
            }, 200);
        }
    }

    /**
     * Load cart count only when user performs cart-related actions
     */
    async loadCartCountAsync() {
        if (!this.sessionId) {
            console.log('No session ID yet, skipping cart count load');
            return;
        }
        
        await loadCartCount(this.sessionId, {
            onSuccess: (cart) => {
                if (cart.success && cart.summary) {
                    this.updateCartCount(cart.summary.totalItems);
                }
            },
            onError: (error) => {
                console.error('Error loading cart count:', error);
                // Don't show user-facing error for cart count loading
            }
        });
    }

    formatTimestamp(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    showTypingIndicator() {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message typing-indicator';
        typingDiv.innerHTML = `
            <div class="brutal-assistant-avatar">🤖</div>
            <div class="brutal-message-content typing-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(typingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async endSession() {
        if (!confirm('Are you sure you want to end this session? This will clear all chat history and cart.')) {
            return;
        }

        await endSession(this.sessionId, {
            onSuccess: () => {
                // Clear chat messages
                const messagesContainer = document.getElementById('chat-messages');
                if (messagesContainer) {
                    messagesContainer.innerHTML = `
                        <div class="brutal-welcome-message">
                            <div class="brutal-assistant-avatar">🤖</div>
                            <div class="brutal-message-content">
                                <p>Session ended! 👋 Starting fresh...</p>
                                <p>What would you like to cook today?</p>
                            </div>
                        </div>
                    `;
                }
                
                // Reset cart count
                this.updateCartCount(0);
                
                // Generate new session
                this.sessionId = null;
                this.initializeSession();
            },
            onError: (error) => {
                console.error('Error ending session:', error);
                alert('Failed to end session. Please try again.');
            }
        });
    }

    createNewChat() {
        // Clear current chat but keep session
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="brutal-welcome-message">
                    <div class="brutal-assistant-avatar">🤖</div>
                    <div class="brutal-message-content">
                        <p>New chat started! 🎉</p>
                        <p>I can help you with:</p>
                        <ul>
                            <li>🥘 Recipe ingredients</li>
                            <li>🔍 Finding products</li>
                            <li>🛒 Managing your cart</li>
                            <li>💡 Cooking suggestions</li>
                        </ul>
                        <p>What would you like to cook today?</p>
                    </div>
                </div>
            `;
        }
    }

    handleCategoryClick(e) {
        const categoryName = e.currentTarget.querySelector('span').textContent;
        const chatWindow = document.getElementById('chatWindow');
        const chatInput = document.getElementById('chat-input');
        
        // Open chat and suggest search
        if (chatWindow) {
            chatWindow.classList.add('active');
        }
        
        if (chatInput) {
            chatInput.value = `Show me products in ${categoryName}`;
            chatInput.focus();
        }
    }

    async handleProductAdd(e) {
        e.preventDefault();
        const productCard = e.target.closest('.brutal-product-card');
        const productName = productCard.querySelector('h4').textContent;
        
        // Since these are sample products, just show notification
        this.showNotification(`${productName} added to cart! 🛒`);
        
        // Update cart count
        const cartCount = document.querySelector('.brutal-cart-count');
        if (cartCount) {
            const currentCount = parseInt(cartCount.textContent) || 0;
            cartCount.textContent = currentCount + 1;
        }
        
        // Animate button
        e.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            e.target.style.transform = 'scale(1)';
        }, 150);
    }

    handleMainSearch(e) {
        e.preventDefault();
        const searchInput = document.querySelector('.brutal-main-search');
        const query = searchInput.value.trim();
        
        if (!query) return;
        
        // Open chat and search
        const chatWindow = document.getElementById('chatWindow');
        const chatInput = document.getElementById('chat-input');
        
        if (chatWindow) {
            chatWindow.classList.add('active');
        }
        
        if (chatInput) {
            chatInput.value = `Find ${query}`;
            this.sendMessage(`Find ${query}`);
        }
        
        searchInput.value = '';
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#DCFF1C' : type === 'error' ? '#f44336' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'};
            color: black;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}


// Initialize the app and make it globally accessible
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingApp = new ShoppingChatApp();
});