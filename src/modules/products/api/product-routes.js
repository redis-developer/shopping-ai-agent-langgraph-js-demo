import { Router } from 'express';
import { getProductById } from '../domain/product-service.js';
import { HttpStatusCode } from '#lib/errors.js';

const router = Router();

// Get product details for product page
router.get('/:productId', async function(req, res, next) {
    const { productId } = req.params;

    try {
        const product = await getProductById(productId);

        if (!product) {
            return res.status(HttpStatusCode.NOT_FOUND).json({
                success: false,
                error: 'Product not found'
            });
        }

        res.json({
            success: true,
            product: product
        });
    } catch (error) {
        next(error);
    }
});

export default router;
