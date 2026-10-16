import CartRepository from '../data/cart-repository.js';
import ProductRepository from '#modules/products/data/product-repository.js';

const cartRepository = new CartRepository();
const productRepository = new ProductRepository();

/**
 * Add multiple items to cart
 * @param {string} userId - User ID
 * @param {Array<string>} productIds - Array of product IDs
 * @param {Array<number>} quantities - Array of quantities
 */
export async function addItemsToCart(userId, productIds, quantities) {
    const addedItems = [];
    let totalAdded = 0;

    for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const quantity = quantities[i] || 1;

        const result = await addItemToCart(userId, productId, quantity);

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

    const cart = await getCart(userId);

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
 * @param {string} userId - User ID
 * @param {string} productId - Product ID
 * @param {number} quantity - Quantity to add
 */
export async function addItemToCart(userId, productId, quantity = 1) {
    // Get and validate product
    const product = await productRepository.getProductById(productId);

    if (!product) {
        return {
            success: false,
            error: `Product with ID ${productId} not found`
        };
    }

    // Check if item already exists in cart
    const existingItem = await cartRepository.checkItemExistsInCart(userId, productId);

    let result;
    if (existingItem) {
        // Update existing item quantity
        result = await cartRepository.updateItemQuantity(userId, productId, existingItem.quantity + quantity);
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
        result = await cartRepository.addNewItemToCart(userId, cartItem);
    }

    if (!result.success) {
        return result;
    }

    // Get updated cart summary
    const cart = await getCart(userId);

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
}

/**
 * Get cart contents with business logic calculations
 * @param {string} userId - User ID
 */
export async function getCart(userId) {
    const cartData = await cartRepository.getCartData(userId);

    // If no cart data, return empty cart
    if (!cartData) {
        return {
            success: true,
            userId: userId,
            items: [],
            summary: {
                totalItems: 0,
                totalPrice: 0,
                totalDiscount: 0,
                totalMarketPrice: 0
            }
        };
    }

    // Calculate cart summary
    const items = cartData.items || [];
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
    const totalMarketPrice = items.reduce((sum, item) => sum + ((item.marketPrice || item.salePrice) * item.quantity), 0);
    const totalDiscount = totalMarketPrice - totalPrice;

    return {
        success: true,
        userId: userId,
        items: items,
        summary: {
            totalItems: totalItems,
            totalPrice: Math.round(totalPrice * 100) / 100,
            totalDiscount: Math.round(totalDiscount * 100) / 100,
            totalMarketPrice: Math.round(totalMarketPrice * 100) / 100
        },
        updatedAt: cartData.updatedAt
    };
}

/**
 * Remove item from cart
 * @param {string} userId - User ID
 * @param {string} productId - Product ID to remove
 */
export async function removeItemFromCart(userId, productId) {
    const result = await cartRepository.removeFromCart(userId, productId);

    if (result.success) {
        // Get updated cart summary
        const cartSummary = await getCart(userId);

        return {
            ...result,
            cartSummary: cartSummary
        };
    }

    return result;
}

/**
 * Clear entire cart
 * @param {string} userId - User ID
 */
export async function clearCart(userId) {
    return cartRepository.clearCart(userId);
}
