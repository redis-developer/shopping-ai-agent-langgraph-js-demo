/**
 * Gets the details of one product.
 * @param {string} productId
 * @returns {Promise<{id: string, name: string, category: string, brand?: string, salePrice: number, rating: number, description?: string}>}
 */
export async function fetchProduct(productId) {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}`);
    const result = await res.json();

    if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to load the product');
    }

    return result.product;
}
