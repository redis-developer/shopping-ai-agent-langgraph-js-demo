import { Router } from 'express';
import { addItemToCart, getCart, removeItemFromCart, clearCart } from '../domain/cart-service.js';

const router = Router();

// Add product to cart
router.post('/add', async function(req, res, next) {
    const { sessionId, productId, quantity = 1 } = req.body;

    if (!sessionId || !productId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing sessionId or productId' 
        });
    }

    try {
        const result = await addItemToCart(sessionId, productId, quantity);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Get cart contents
router.get('/:sessionId', async function(req, res, next) {
    const { sessionId } = req.params;

    if (!sessionId) {
        return res.status(400).json({ 
            success: false, 
            error: 'Missing sessionId' 
        });
    }

    try {
        const cart = await getCart(sessionId);
        res.json(cart);
    } catch (error) {
        next(error);
    }
});

// Remove item from cart
router.delete('/:sessionId/:productId', async function(req, res, next) {
    const { sessionId, productId } = req.params;

    try {
        const result = await removeItemFromCart(sessionId, productId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Clear entire cart
router.delete('/:sessionId', async function(req, res, next) {
    const { sessionId } = req.params;

    try {
        const result = await clearCart(sessionId);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

export default router;
