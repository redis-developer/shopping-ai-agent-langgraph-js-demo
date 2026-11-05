import { SessionService } from '@services/session-service.js';

import { CartCount } from '@components/cart/cart-count.js';
import { NotificationSystem } from '@components/notifications/notification-system.js';
import { ProductDetail } from '@components/products/product-detail.js';

export class ProductApp {
    constructor() {
        this.sessionService = new SessionService();
        this.init();
    }

    init() {
        // Initialize session
        const session = this.sessionService.initialize();
        this.userId = session.userId;

        // Initialize components
        this.cartCount = new CartCount('.cart-count');
        this.productDetail = new ProductDetail(
            this.userId,
            (result) => this.handleCartSuccess(result),
            (error) => this.handleCartError(error)
        );

        // Load initial data
        this.loadInitialData();
    }

    async loadInitialData() {
        // Load cart count
        await this.cartCount.load(this.userId);
    }

    handleCartSuccess(result) {
        NotificationSystem.success(`✅ ${result.message}`);
        this.cartCount.update(result.cartSummary.summary.totalItems);
    }

    handleCartError(error) {
        NotificationSystem.error('❌ Failed to add to cart. Please try again.');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    window.productApp = new ProductApp();
});
