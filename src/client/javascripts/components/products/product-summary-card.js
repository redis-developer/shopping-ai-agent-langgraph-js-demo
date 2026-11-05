import { DOM_IDS } from '@utils/constants.js';

/**
 * Draws a product the assistant found as a card, for the results view.
 * @param {(productId: string, buttonElement: HTMLElement) => void} onProductAction - Called when the card's add button is clicked.
 * @param {(product: {id: string, image: string}) => void} onProductOpen - Called with the product when its card is clicked.
 * @returns {(product: Object) => HTMLElement} The `productSummary` data of an attachment in, its card out.
 */
export function createProductSummaryCard(onProductAction, onProductOpen) {
    return (product) => {
        const card = document.getElementById(DOM_IDS.PRODUCT_CARD_TEMPLATE).content.firstElementChild.cloneNode(true);
        card.querySelector('.product-image').textContent = product.image;
        card.querySelector('.product-name').textContent = product.name;
        card.querySelector('.product-name').href = `/products/${product.id}`;
        card.querySelector('.product-card-rating').textContent = product.rating ? `⭐ ${product.rating}` : '';
        const price = card.querySelector('.price');
        price.value = product.price;
        price.textContent = `₹${product.price}`;

        card.querySelector('.add-btn').addEventListener('click', async (event) => {
            await onProductAction?.(product.id, event.currentTarget);
        });

        // Clicking anywhere else on the card shows the product page
        card.addEventListener('click', (event) => {
            if (event.target.closest('button')) return;
            event.preventDefault();
            onProductOpen?.(product);
        });

        return card;
    };
}
