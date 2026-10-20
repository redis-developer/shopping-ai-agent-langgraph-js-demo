import { Router } from 'express';
import { getProductById, getProductImage } from '../domain/product-service.js';
import CONFIG from '#config';
import { HttpStatusCode } from '#lib/errors.js';

const router = Router();

/* GET product details page (HTML view) */
router.get('/:productId', async function(req, res, next) {
	const { productId } = req.params;
	
	try {
		const product = await getProductById(productId);
		
		if (!product) {
			return res.status(HttpStatusCode.NOT_FOUND).render('error', { 
				message: 'Product not found',
				error: { status: HttpStatusCode.NOT_FOUND }
			});
		}

		res.render('product', { 
			appName: CONFIG.appName || 'Redish',
			product: product,
			productImage: getProductImage(product.category)
		});
	} catch (error) {
		console.error('Error loading product page:', error);
		res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).render('error', {
			message: 'Failed to load product',
			error: { status: HttpStatusCode.INTERNAL_SERVER_ERROR }
		});
	}
});

export default router;

