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

        this.grid.innerHTML = products.map(product => `
            <div class="brutal-product-card" role="listitem">
                <div class="brutal-product-image">
                    <span class="brutal-product-emoji">${this.getCategoryEmoji(product.category)}</span>
                </div>
                <div class="brutal-product-info">
                    <h4>${product.name}</h4>
                    <p class="brutal-product-price">₹${product.salePrice}</p>
                    <a href="/product/${product.id}" class="brutal-view-btn">VIEW PRODUCT</a>
                </div>
            </div>
        `).join('');
    }

    showPlaceholder() {
        this.grid.innerHTML = `
            <div class="brutal-placeholder-message">
                <p>Related products feature coming soon!</p>
            </div>
        `;
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Fruits & Vegetables': '🥬',
            'Bakery & Dairy': '🥛',
            'Meat & Seafood': '🐟',
            'Grains & Pulses': '🌾',
            'Snacks & Beverages': '🍪',
            'Household Items': '🧽'
        };
        return emojiMap[category] || '🛒';
    }
}
