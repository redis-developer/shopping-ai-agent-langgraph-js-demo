import { createClient } from 'redis';
import CONFIG from '../../../config.js';
import ProductRepository from '../../products/data/product-repository.js';

const client = await createClient({
    url: CONFIG.redisUrl,
}).on('error', (err) => console.log('Redis Client Error', err))
  .connect();

const productRepository = new ProductRepository();

export default class CartRepository {

    /**
     * Add product to user's cart
     * @param {string} sessionId - User session ID
     * @param {string} productId - Product ID to add
     * @param {number} quantity - Quantity to add (default: 1)
     */
    async addToCart(sessionId, productId, quantity = 1) {
        try {
            // Get product details first
            const product = await productRepository.getProductById(productId);
            
            if (!product) {
                return {
                    success: false,
                    error: `Product with ID ${productId} not found`
                };
            }

            const userKey = `users:${sessionId}`;
            
            // Check if item already exists in cart
            const existingItem = await client.json.get(userKey, {
                path: `$.cart.items[?(@.productId=='${productId}')]`
            });

            if (existingItem && existingItem.length > 0) {
                // Update quantity if item exists
                const currentQuantity = existingItem[0].quantity;
                await client.json.set(userKey, `$.cart.items[?(@.productId=='${productId}')].quantity`, currentQuantity + quantity);
            } else {
                // Add new item to cart
                const cartItem = {
                    productId: productId,
                    name: product.name,
                    brand: product.brand,
                    salePrice: product.salePrice,
                    marketPrice: product.marketPrice,
                    quantity: quantity,
                    addedAt: new Date().toISOString()
                };

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
            }

            // Set expiration (24 hours)
            await client.expire(userKey, 24 * 60 * 60);

            // Get updated cart summary
            const cart = await this.getCart(sessionId);
            
            return {
                success: true,
                message: `${product.name} added to cart!`,
                addedItem: {
                    productId: productId,
                    name: product.name,
                    quantity: quantity,
                    price: product.salePrice
                },
                cartSummary: cart
            };

        } catch (error) {
            console.error('Error adding to cart:', error);
            return {
                success: false,
                error: 'Failed to add item to cart'
            };
        }
    }

    /**
     * Get user's cart contents
     * @param {string} sessionId - User session ID
     */
    async getCart(sessionId) {
        try {
            const userKey = `users:${sessionId}`;
            const cartData = await client.json.get(userKey, { path: '$.cart' });
            
            // If no user or no cart data
            if (!cartData || cartData.length === 0 || !cartData[0]) {
                return {
                    success: true,
                    sessionId: sessionId,
                    items: [],
                    summary: {
                        totalItems: 0,
                        totalPrice: 0,
                        totalDiscount: 0
                    }
                };
            }

            const cart = cartData[0];
            
            // Calculate totals
            const items = cart.items || [];
            const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalPrice = items.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
            const totalMarketPrice = items.reduce((sum, item) => sum + ((item.marketPrice || item.salePrice) * item.quantity), 0);
            const totalDiscount = totalMarketPrice - totalPrice;

            return {
                success: true,
                sessionId: sessionId,
                items: items,
                summary: {
                    totalItems: totalItems,
                    totalPrice: Math.round(totalPrice * 100) / 100,
                    totalDiscount: Math.round(totalDiscount * 100) / 100,
                    totalMarketPrice: Math.round(totalMarketPrice * 100) / 100
                },
                updatedAt: cart.updatedAt
            };

        } catch (error) {
            console.error('Error getting cart:', error);
            return {
                success: false,
                error: 'Failed to get cart contents'
            };
        }
    }

    /**
     * Remove product from cart
     * @param {string} sessionId - User session ID
     * @param {string} productId - Product ID to remove
     */
    async removeFromCart(sessionId, productId) {
        try {
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
                removedItem: removedItem,
                cartSummary: await this.getCart(sessionId)
            };

        } catch (error) {
            console.error('Error removing from cart:', error);
            return {
                success: false,
                error: 'Failed to remove item from cart'
            };
        }
    }

    /**
     * Clear entire cart
     * @param {string} sessionId - User session ID
     */
    async clearCart(sessionId) {
        try {
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

        } catch (error) {
            console.error('Error clearing cart:', error);
            return {
                success: false,
                error: 'Failed to clear cart'
            };
        }
    }
}
