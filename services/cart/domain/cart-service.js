import CartRepository from '../data/cart-repository.js';

const cartRepository = new CartRepository();

/**
 * Add multiple items to cart
 * @param {string} sessionId - User session ID
 * @param {Array<string>} productIds - Array of product IDs
 * @param {Array<number>} quantities - Array of quantities
 * @returns {Promise<Object>} Cart operation result
 */
export async function addItemsToCart(sessionId, productIds, quantities) {
    const addedItems = [];
    let totalAdded = 0;
    
    for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const quantity = quantities[i] || 1;
        
        const result = await cartRepository.addToCart(sessionId, productId, quantity);
        
        if (result.success) {
            addedItems.push(result.addedItem);
            totalAdded++;
        }
    }
    
    if (totalAdded === 0) {
        return {
            success: false,
            error: "Could not add any items to cart. Please check product IDs."
        };
    }
    
    const cart = await cartRepository.getCart(sessionId);
    
    return {
        success: true,
        addedItems: addedItems,
        totalAdded: totalAdded,
        cartSummary: cart.summary,
        message: `Successfully added ${totalAdded} item(s) to your cart!`
    };
}

/**
 * Add single item to cart
 * @param {string} sessionId - User session ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add
 * @returns {Promise<Object>} Cart operation result
 */
export async function addItemToCart(sessionId, productId, quantity = 1) {
    return await cartRepository.addToCart(sessionId, productId, quantity);
}

/**
 * Get cart contents
 * @param {string} sessionId - User session ID
 * @returns {Promise<Object>} Cart contents
 */
export async function getCart(sessionId) {
    return await cartRepository.getCart(sessionId);
}

/**
 * Remove item from cart
 * @param {string} sessionId - User session ID
 * @param {string} productId - Product ID to remove
 * @returns {Promise<Object>} Cart operation result
 */
export async function removeItemFromCart(sessionId, productId) {
    return await cartRepository.removeFromCart(sessionId, productId);
}

/**
 * Clear entire cart
 * @param {string} sessionId - User session ID
 * @returns {Promise<Object>} Cart operation result
 */
export async function clearCart(sessionId) {
    return await cartRepository.clearCart(sessionId);
}
