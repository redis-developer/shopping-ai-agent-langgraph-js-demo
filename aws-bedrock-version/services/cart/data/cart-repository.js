import CONFIG from '../../../config.js';
import { getRedisClient } from '../../db/redis-client.js';

export default class CartRepository {

    /**
     * Check if item exists in cart and return its details
     * @param {string} sessionId - User session ID
     * @param {string} productId - Product ID to check
     */
    async checkItemExistsInCart(sessionId, productId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        const existingItem = await client.json.get(userKey, {
            path: `$.cart.items[?(@.productId=='${productId}')]`
        });

        if (existingItem && existingItem.length > 0) {
            return existingItem[0];
        }
        return null;
    }

    /**
     * Update quantity of existing item in cart
     * @param {string} sessionId - User session ID
     * @param {string} productId - Product ID
     * @param {number} newQuantity - New quantity
     */
    async updateItemQuantity(sessionId, productId, newQuantity) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        await client.json.set(userKey, `$.cart.items[?(@.productId=='${productId}')].quantity`, newQuantity);
        await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());
        await client.expire(userKey, 24 * 60 * 60);

        return { success: true };
    }

    /**
     * Add new item to cart
     * @param {string} sessionId - User session ID
     * @param {Object} cartItem - Cart item object
     */
    async addNewItemToCart(sessionId, cartItem) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;

        // Check if cart exists in user data, initialize if needed
        const cartData = await client.json.get(userKey, { path: '$.cart' });

        if (!cartData || cartData.length === 0 || !cartData[0].items) {
            // Initialize cart within existing user document
            await client.json.set(userKey, '$.cart', {
                items: [cartItem],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } else {
            await client.json.arrAppend(userKey, '$.cart.items', cartItem);
            await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());
        }

        // Set expiration (24 hours)
        await client.expire(userKey, 24 * 60 * 60);

        return { success: true };
    }

    /**
     * Get raw cart data from storage
     * @param {string} sessionId - User session ID
     */
    async getCartData(sessionId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;
        const cartData = await client.json.get(userKey, { path: '$.cart' });

        if (!cartData || cartData.length === 0 || !cartData[0]) {
            return null;
        }

        return cartData[0];
    }

    /**
     * Remove product from cart
     * @param {string} sessionId - User session ID
     * @param {string} productId - Product ID to remove
     */
    async removeFromCart(sessionId, productId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;

        // Get current cart
        const cartData = await client.json.get(userKey, { path: '$.cart' });
        if (!cartData || cartData.length === 0 || !cartData[0] || !cartData[0].items) {
            return {
                success: false,
                error: 'Cart is empty or does not exist'
            };
        }
        
        const cart = cartData[0];

        // Find and remove the item
        const filteredItems = cart.items.filter(item => item.productId !== productId);
        
        if (filteredItems.length === cart.items.length) {
            return {
                success: false,
                error: 'Product not found in cart'
            };
        }

        // Update cart
        await client.json.set(userKey, '$.cart.items', filteredItems);
        await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());

        const removedItem = cart.items.find(item => item.productId === productId);
        
        return {
            success: true,
            message: `${removedItem.name} removed from cart`,
            removedItem: removedItem
        };

    }

    /**
     * Clear entire cart
     * @param {string} sessionId - User session ID
     */
    async clearCart(sessionId) {
        const client = await getRedisClient();
        const userKey = `users:${sessionId}`;

        const cartData = await client.json.get(userKey, { path: '$.cart' });

        if (!cartData || cartData.length === 0 || !cartData[0] || !cartData[0].items || cartData[0].items.length === 0) {
            return {
                success: true,
                message: 'Cart is already empty',
                itemsCleared: 0
            };
        }
        
        const cart = cartData[0];

        const itemCount = cart.items.length;
        
        // Clear the cart items only (keep user data)
        await client.json.set(userKey, '$.cart.items', []);
        await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());
        
        return {
            success: true,
            message: `Cart cleared! ${itemCount} items removed.`,
            itemsCleared: itemCount
        };

    }
}
