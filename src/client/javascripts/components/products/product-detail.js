import { addToCart } from '@services/cart-service.js';
import { ProductQuantity } from '@components/products/product-quantity.js';

/**
 * The details of a product, in the markup of the product_detail partial: the quantity stepper and the Add to cart button.
 * The product page gets its content from the server. The canvas shows one product after another in the same
 * markup, so it fills it in with fill().
 */
export class ProductDetail {
    /**
     * @param {string} userId - Owns the cart.
     * @param {(result: Object) => void} onAdded - Called with the result when the product was added to the cart.
     * @param {(error: Error) => void} onAddFailed - Called when it could not be added.
     */
    constructor(userId, onAdded, onAddFailed) {
        this.root = document.querySelector('.product-detail');
        this.userId = userId;
        this.onAdded = onAdded;
        this.onAddFailed = onAddFailed;
        this.quantity = new ProductQuantity('quantity', 1, 10);
        this.init();
    }

    init() {
        this.root.querySelectorAll('.quantity-btn').forEach((button) => {
            button.addEventListener('click', () => this.quantity.changeQuantity(parseInt(button.dataset.quantityChange)));
        });
        this.root.querySelector('.product-actions').addEventListener('submit', (event) => this.add(event));
    }

    /**
     * Shows a product in the markup.
     * @param {Object} product - As the server's product route returns it.
     * @param {string} image - The emoji standing in for a product image, which the product itself does not have.
     */
    fill(product, image) {
        this.root.querySelector('.product-info-section').dataset.productId = product.id;
        this.quantity.setQuantity(1);

        this.setText('.product-emoji', image);
        this.setText('.product-title', product.name);
        this.setText('.product-brand', product.brand ? `By ${product.brand}` : '');
        this.setText('.category-badge', product.category);
        this.setText('.subcategory-badge', product.subCategory);
        this.setText('.type-badge', product.type);
        // The stars are as many as the rating rounded up, as the server's template writes them
        this.setText('.rating-stars-icons', '⭐'.repeat(Math.ceil(product.rating)));
        this.setText('.rating-text', `${product.rating}/5`);
        this.setText('.product-description p', product.description);

        const price = this.root.querySelector('.current-price');
        price.value = product.salePrice;
        price.textContent = `₹${product.salePrice}`;

        // What a product may not have is hidden when it is missing
        this.root.querySelector('.product-brand').hidden = !product.brand;
        this.root.querySelector('.subcategory-badge').hidden = !product.subCategory;
        this.root.querySelector('.type-badge').hidden = !product.type;
        this.root.querySelector('.product-rating').hidden = !product.rating;
        this.root.querySelector('.sale-banner').hidden = !product.isOnSale;
        this.root.querySelector('.product-description').hidden = !product.description;
    }

    setText(selector, text) {
        this.root.querySelector(selector).textContent = text ?? '';
    }

    async add(event) {
        event.preventDefault();

        const button = this.root.querySelector('.add-to-cart-btn');
        const icon = button.querySelector('i');
        const label = button.querySelector('.add-to-cart-label');
        const originalIconClass = icon.className;
        const originalLabel = label.textContent;

        // Show loading state
        button.disabled = true;
        icon.className = 'fas fa-spinner fa-spin';
        label.textContent = 'Adding...';

        await addToCart(this.userId, this.root.querySelector('.product-info-section').dataset.productId, this.quantity.getQuantity(), {
            onSuccess: (result) => {
                icon.className = '';
                label.textContent = '✅ Added';
                this.onAdded(result);
            },
            onError: (error) => {
                icon.className = '';
                label.textContent = '❌ Error';
                this.onAddFailed(error);
            }
        });

        // Reset button state after delay
        setTimeout(() => {
            button.disabled = false;
            icon.className = originalIconClass;
            label.textContent = originalLabel;
        }, 2000);
    }
}
