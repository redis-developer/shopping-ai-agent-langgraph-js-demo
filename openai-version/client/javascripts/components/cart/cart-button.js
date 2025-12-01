import { addToCart } from '../../services/cartService.js';

export class CartButton {
    constructor(onSuccess = null, onError = null) {
        this.onSuccess = onSuccess;
        this.onError = onError;
    }

    async addToCartFromChat(sessionId, productId, buttonElement) {
        const originalContent = buttonElement.innerHTML;

        await addToCart(sessionId, productId, 1, {
            onLoad: () => {
                buttonElement.innerHTML = '⏳';
                buttonElement.disabled = true;
            },
            onSuccess: (result) => {
                buttonElement.innerHTML = '✅';

                if (this.onSuccess) {
                    this.onSuccess(result);
                }

                setTimeout(() => {
                    buttonElement.innerHTML = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            },
            onError: (error) => {
                console.error('Error adding to cart:', error);
                buttonElement.innerHTML = '❌';

                if (this.onError) {
                    this.onError(error);
                }

                setTimeout(() => {
                    buttonElement.innerHTML = originalContent;
                    buttonElement.disabled = false;
                }, 2000);
            }
        });
    }
}
