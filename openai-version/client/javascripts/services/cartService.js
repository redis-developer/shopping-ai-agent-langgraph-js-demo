export async function addToCart(sessionId, productId, quantity = 1, options = {}) {
    const { onLoad, onSuccess, onError } = options;

    try {
        onLoad?.();

        const res = await fetch('/api/cart/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId,
                productId,
                quantity
            }),
        });

        const result = await res.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to add to cart');
        }

        onSuccess?.(result);

    } catch (err) {
        console.error('Failed to add to cart:', err);
        onError?.(err);
    }
}

export async function loadCartCount(sessionId, options = {}) {
    const { onLoad, onSuccess, onError } = options;

    try {
        onLoad?.();

        const res = await fetch(`/api/cart/${sessionId}`);

        if (!res.ok) {
            onSuccess?.({ success: true, summary: { totalItems: 0 } });
            return;
        }

        const cart = await res.json();
        onSuccess?.(cart);

    } catch (err) {
        console.error('Failed to load cart count:', err);
        onError?.(err);
    }
}
