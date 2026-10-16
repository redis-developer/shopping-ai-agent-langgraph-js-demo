export class MessageFormatter {
    static formatMessage(message) {
        let formatted = message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/₹(\d+)/g, '<span class="price">₹$1</span>');

        const productIdPattern = /\(ID: ([^)]+)\)/g;
        const hasProductIds = productIdPattern.test(formatted);

        if (hasProductIds) {
            const productIdPatternReset = /\(ID: ([^)]+)\)/g;
            formatted = formatted.replace(productIdPatternReset, (match, productId) => {
                return `
                    <span class="product-actions">
                        <span class="product-id">${match}</span>
                        <button class="cart-icon-btn" data-product-id="${productId}" title="Add to Cart">
                            🛒
                        </button>
                        <a href="/products/${productId}" class="product-link" title="View Details" target="_blank">
                            🔗
                        </a>
                    </span>
                `;
            });
        }

        return formatted;
    }

    static formatTimestamp(date) {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }
}
