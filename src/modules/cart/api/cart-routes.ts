import { Router } from 'express';
import { addItemToCart, getCart, removeItemFromCart, clearCart } from '../domain/cart-service.ts';
import { HttpStatusCode } from '#lib/errors';

const router = Router();

// Add product to cart
router.post('/add', async function(req, res, next) {
    const { userId, productId, quantity = 1 } = req.body;

    if (!userId || !productId) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ 
            success: false, 
            error: 'Missing userId or productId' 
        });
    }

    try {
        const result = await addItemToCart(userId, productId, quantity);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get cart contents
router.get('/:userId', async function(req, res, next) {
    const { userId } = req.params;

    if (!userId) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ 
            success: false, 
            error: 'Missing userId' 
        });
    }

    try {
        const cart = await getCart(userId);
        res.json(cart);
    } catch (error) {
        next(error);
    }
});

// Remove item from cart
router.delete('/:userId/:productId', async function(req, res, next) {
    const { userId, productId } = req.params;

    try {
        const result = await removeItemFromCart(userId, productId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Clear entire cart
router.delete('/:userId', async function(req, res, next) {
    const { userId } = req.params;

    try {
        const result = await clearCart(userId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
