import { SessionService } from '@services/session-service.js';
import { addToCart } from '@services/cart-service.js';

import { CartCount } from '@components/cart/cart-count.js';
import { CartButton } from '@components/cart/cart-button.js';

import { NotificationSystem } from '@components/notifications/notification-system.js';

import { ProductQuantity } from '@components/products/product-quantity.js';
import { RelatedProducts } from '@components/products/related-products.js';

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
        this.userId = session.userId;

        // Initialize components
        this.cartCount = new CartCount('.cart-count');
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
        const quantityBtns = document.querySelectorAll('.quantity-btn[data-quantity-change]');

        quantityBtns.forEach(btn => {
            const delta = parseInt(btn.dataset.quantityChange);
            btn.addEventListener('click', () => this.productQuantity.changeQuantity(delta));
        });

        // Add to cart form
        const addToCartForm = document.querySelector('.product-actions');
        if (addToCartForm) {
            addToCartForm.addEventListener('submit', (e) => this.handleAddToCart(e));
        }

        // Also handle the direct button click (fallback)
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
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
        await this.cartCount.load(this.userId);

        // Load related products
        if (this.productCategory) {
            await this.relatedProducts.load(this.productCategory, this.productId);
        }
    }

    async handleAddToCart(e) {
        e.preventDefault();

        const addBtn = document.querySelector('.add-to-cart-btn');
        const originalContent = addBtn.innerHTML;
        const quantity = this.productQuantity.getQuantity();

        // Show loading state
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ADDING...';

        try {
            await addToCart(this.userId, this.productId, quantity, {
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

        // When shown inside the home page, keep its cart count in step
        if (window.parent !== window) {
            window.parent.postMessage({ type: 'cart-count', totalItems: result.cartSummary.summary.totalItems }, window.location.origin);
        }
    }

    handleCartError(error) {
        NotificationSystem.error('❌ Failed to add to cart. Please try again.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Inside the home page, its own header is shown instead of this page's
    if (window.parent !== window) {
        document.body.classList.add('embedded');
    }

    // Extract product info from page
    const productId = document.querySelector('[data-product-id]')?.dataset.productId ||
                     new URLSearchParams(window.location.search).get('productId') ||
                     window.location.pathname.split('/').pop();

    const productCategory = document.querySelector('[data-product-category]')?.dataset.productCategory;

    // Initialize the product app
    window.productApp = new ProductApp(productId, productCategory);
});
