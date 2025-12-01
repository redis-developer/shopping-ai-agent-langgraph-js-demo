import { SessionService } from './services/sessionService.js';
import { addToCart } from './services/cartService.js';

import { CartCount } from './components/cart/cart-count.js';
import { CartButton } from './components/cart/cart-button.js';

import { NotificationSystem } from './components/notifications/notification-system.js';

import { ProductQuantity } from './components/products/product-quantity.js';
import { RelatedProducts } from './components/products/related-products.js';

export class ProductApp {
    constructor(productId, productCategory) {
        this.productId = productId;
        this.productCategory = productCategory;
        this.sessionService = new SessionService();
        this.init();
    }

    init() {
        // Initialize session
        const session = this.sessionService.initialize();
        this.sessionId = session.sessionId;

        // Initialize components
        this.cartCount = new CartCount('.brutal-cart-count');
        this.cartButton = new CartButton(
            (result) => this.handleCartSuccess(result),
            (error) => this.handleCartError(error)
        );

        this.productQuantity = new ProductQuantity('quantity', 1, 10);
        this.relatedProducts = new RelatedProducts('related-products-grid');

        // Setup event handlers
        this.setupEventHandlers();

        // Load initial data
        this.loadInitialData();
    }

    setupEventHandlers() {
        // Quantity controls
        const quantityBtns = document.querySelectorAll('.brutal-quantity-btn[data-quantity-change]');

        quantityBtns.forEach(btn => {
            const delta = parseInt(btn.dataset.quantityChange);
            btn.addEventListener('click', () => this.productQuantity.changeQuantity(delta));
        });

        // Add to cart form
        const addToCartForm = document.querySelector('.brutal-product-actions');
        if (addToCartForm) {
            addToCartForm.addEventListener('submit', (e) => this.handleAddToCart(e));
        }

        // Also handle the direct button click (fallback)
        const addToCartBtn = document.querySelector('.brutal-add-to-cart-btn');
        if (addToCartBtn) {
            addToCartBtn.removeAttribute('onclick');
            addToCartBtn.addEventListener('click', (e) => {
                if (e.target.type !== 'submit') {
                    this.handleAddToCart(e);
                }
            });
        }
    }

    async loadInitialData() {
        // Load cart count
        await this.cartCount.load(this.sessionId);

        // Load related products
        if (this.productCategory) {
            await this.relatedProducts.load(this.productCategory, this.productId);
        }
    }

    async handleAddToCart(e) {
        e.preventDefault();

        const addBtn = document.querySelector('.brutal-add-to-cart-btn');
        const originalContent = addBtn.innerHTML;
        const quantity = this.productQuantity.getQuantity();

        // Show loading state
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ADDING...';

        try {
            await addToCart(this.sessionId, this.productId, quantity, {
                onSuccess: (result) => {
                    addBtn.innerHTML = '✅ ADDED';
                    this.handleCartSuccess(result);
                },
                onError: (error) => {
                    addBtn.innerHTML = '❌ ERROR';
                    this.handleCartError(error);
                }
            });

        } catch (error) {
            console.error('Error adding to cart:', error);
            addBtn.innerHTML = '❌ ERROR';
            this.handleCartError(error);
        }

        // Reset button state after delay
        setTimeout(() => {
            addBtn.disabled = false;
            addBtn.innerHTML = originalContent;
        }, 2000);
    }

    handleCartSuccess(result) {
        NotificationSystem.success(`✅ ${result.message}`);
        this.cartCount.update(result.cartSummary.summary.totalItems);
    }

    handleCartError(error) {
        NotificationSystem.error('❌ Failed to add to cart. Please try again.');
    }
}
