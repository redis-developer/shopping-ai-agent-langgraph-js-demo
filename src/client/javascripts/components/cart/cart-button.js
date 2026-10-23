import { addToCart } from '@services/cart-service.js';

export class CartButton {
    constructor(onSuccess = null, onError = null) {
        this.onSuccess = onSuccess;
        this.onError = onError;
    }

    async addToCartFromChat(userId, productId, buttonElement) {
        const originalContent = buttonElement.textContent;

        await addToCart(userId, productId, 1, {
            onLoad: () => {
                buttonElement.textContent = '⏳';
                buttonElement.disabled = true;
            },
            onSuccess: (result) => {
                buttonElement.textContent = '✅';

                if (this.onSuccess) {
                    this.onSuccess(result);
                }

                setTimeout(() => {
                    buttonElement.textContent = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            },
            onError: (error) => {
                console.error('Error adding to cart:', error);
                buttonElement.textContent = '❌';

                if (this.onError) {
                    this.onError(error);
                }

                setTimeout(() => {
                    buttonElement.textContent = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            }
        });
    }
}
