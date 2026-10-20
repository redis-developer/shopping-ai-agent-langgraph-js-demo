import { loadCartCount } from '@services/cart-service.js';

export class CartCount {
    constructor(selector = '.cart-count') {
        this.element = document.querySelector(selector);
    }

    update(count) {
        if (this.element) {
            this.element.textContent = count || 0;
            this.element.style.transform = 'scale(1.3)';
            setTimeout(() => {
                this.element.style.transform = 'scale(1)';
            }, 200);
        }
    }

    async load(userId) {
        if (!userId) {
            console.log('No session ID yet, skipping cart count load');
            return;
        }

        await loadCartCount(userId, {
            onSuccess: (cart) => {
                if (cart.success && cart.summary) {
                    this.update(cart.summary.totalItems);
                }
            },
            onError: (error) => {
                console.error('Error loading cart count:', error);
            }
        });
    }
}
