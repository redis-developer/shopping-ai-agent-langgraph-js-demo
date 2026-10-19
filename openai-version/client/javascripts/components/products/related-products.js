import { DOM_IDS } from '@utils/constants.js';

export class RelatedProducts {
    constructor(gridId = 'related-products-grid') {
        this.grid = document.getElementById(gridId);
    }

    async load(category, currentProductId, limit = 4) {
        if (!this.grid) {
            console.warn('Related products grid not found');
            return;
        }

        try {
            const response = await fetch('/api/cart/related', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    category: category,
                    excludeId: currentProductId,
                    limit: limit
                }),
            });

            if (response.ok) {
                const relatedProducts = await response.json();
                this.render(relatedProducts);
            } else {
                console.log('Related products API not yet implemented');
                this.showPlaceholder();
            }

        } catch (error) {
            console.error('Error loading related products:', error);
            this.showPlaceholder();
        }
    }

    render(products) {
        if (!Array.isArray(products) || products.length === 0) {
            this.showPlaceholder();
            return;
        }

        const cards = products.map((product) => {
            const card = document.getElementById(DOM_IDS.RELATED_PRODUCT_TEMPLATE).content.firstElementChild.cloneNode(true);
            card.querySelector('.product-emoji').textContent = this.getCategoryEmoji(product.category);
            card.querySelector('h4').textContent = product.name;
            card.querySelector('.product-price').textContent = `₹${product.salePrice}`;
            card.querySelector('.view-btn').href = `/products/${product.id}`;
            return card;
        });
        this.grid.replaceChildren(...cards);
    }

    showPlaceholder() {
        this.grid.replaceChildren(document.getElementById(DOM_IDS.RELATED_PLACEHOLDER_TEMPLATE).content.firstElementChild.cloneNode(true));
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Fruits & Vegetables': '🥗',
            'Bakery & Dairy': '🥛🍞',
            'Meat & Seafood': '🥩🐟',
            'Grains & Pulses': '🌾',
            'Snacks & Beverages': '🥘',
            'Household Items': '🧽'
        };
        return emojiMap[category] || '🛒';
    }
}
