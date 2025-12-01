import { Router } from 'express';
import CONFIG from '../../config.js';
import { getProductById } from '../products/domain/product-service.js';

const router = Router();

/* GET home page - directly serve the chat interface */
router.get('/', function(req, res, next) {
	res.render('chat', { app_name: CONFIG.appName || 'Redish' });
});

router.get('/app', function(req, res, next) {
	res.render('chat', { app_name: CONFIG.appName || 'Redish' });
});

/* GET product details page */
router.get('/product/:productId', async function(req, res, next) {
	const { productId } = req.params;
	
	try {
		const product = await getProductById(productId);
		
		if (!product) {
			return res.status(404).render('error', { 
				message: 'Product not found',
				error: { status: 404 }
			});
		}

		res.render('product', { 
			app_name: CONFIG.appName || 'Redish',
			product: product
		});
	} catch (error) {
		console.error('Error loading product page:', error);
		res.status(500).render('error', {
			message: 'Failed to load product',
			error: { status: 500 }
		});
	}
});

export default router;
