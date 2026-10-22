import { getRedisClient } from '../../db/redis-client.ts';

export type CartItem = {
    productId: string;
    name: string;
    brand?: string;
    salePrice: number;
    marketPrice: number;
    quantity: number;
    addedAt: string;
};

export type Cart = {
    items: CartItem[];
    createdAt: string;
    updatedAt: string;
};

/** What is stored for a shopper: their cart is a list of items inside one JSON document */
export type UserDocument = {
    userId: string;
    cart: Cart;
    createdAt: string;
    updatedAt: string;
};

/** A shopper's document is stored under a key made of this prefix and the user ID */
export const USER_KEY_PREFIX = 'users:';
export const USER_KEY_TEMPLATE = `${USER_KEY_PREFIX}{userId}`;

export default class CartRepository {

    /**
     * Check if item exists in cart and return its details
     * @param userId - User ID
     * @param productId - Product ID to check
     */
    async checkItemExistsInCart(userId: string, productId: string): Promise<CartItem | null> {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;
        const existingItem = await client.json.get(userKey, {
            path: `$.cart.items[?(@.productId=='${productId}')]`
        }) as CartItem[] | null;

        if (existingItem && existingItem.length > 0) {
            return existingItem[0];
        }
        return null;
    }

    /**
     * Update quantity of existing item in cart
     * @param userId - User ID
     * @param productId - Product ID
     * @param newQuantity - New quantity
     */
    async updateItemQuantity(userId: string, productId: string, newQuantity: number) {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;
        await client.json.set(userKey, `$.cart.items[?(@.productId=='${productId}')].quantity`, newQuantity);
        await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());
        await client.expire(userKey, 24 * 60 * 60);

        return { success: true };
    }

    /**
     * Add new item to cart
     * @param userId - User ID
     * @param cartItem - Cart item object
     */
    async addNewItemToCart(userId: string, cartItem: CartItem) {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;

        // Check if user document exists
        const userExists = await client.exists(userKey);

        if (!userExists) {
            // Create user document with cart at root level
            await client.json.set(userKey, '$', {
                userId: userId,
                cart: {
                    items: [cartItem],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        } else {
            // Check if cart exists in user data
            const cartData = await client.json.get(userKey, { path: '$.cart' }) as Cart[] | null;

            if (!cartData || cartData.length === 0 || !cartData[0] || !cartData[0].items) {
                // Initialize cart within existing user document
                await client.json.set(userKey, '$.cart', {
                    items: [cartItem],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            } else {
                // Add to existing cart
                await client.json.arrAppend(userKey, '$.cart.items', cartItem);
                await client.json.set(userKey, '$.cart.updatedAt', new Date().toISOString());
            }
        }

        // Set expiration (24 hours)
        await client.expire(userKey, 24 * 60 * 60);

        return { success: true };
    }

    /**
     * Get raw cart data from storage
     * @param userId - User ID
     */
    async getCartData(userId: string): Promise<Cart | null> {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;
        const cartData = await client.json.get(userKey, { path: '$.cart' }) as Cart[] | null;

        if (!cartData || cartData.length === 0 || !cartData[0]) {
            return null;
        }

        return cartData[0];
    }

    /**
     * Remove product from cart
     * @param userId - User ID
     * @param productId - Product ID to remove
     */
    async removeFromCart(userId: string, productId: string) {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;
        
        // Get current cart
        const cartData = await client.json.get(userKey, { path: '$.cart' }) as Cart[] | null;
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
            message: `${removedItem!.name} removed from cart`,
            removedItem: removedItem
        };

    }

    /**
     * Clear entire cart
     * @param userId - User ID
     */
    async clearCart(userId: string) {
        const client = await getRedisClient();
        const userKey = `${USER_KEY_PREFIX}${userId}`;
        
        const cartData = await client.json.get(userKey, { path: '$.cart' }) as Cart[] | null;

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
