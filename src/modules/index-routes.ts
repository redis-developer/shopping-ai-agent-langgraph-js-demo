import { Router } from 'express';
import CONFIG from '../config.ts';

const router = Router();

/* GET home page - directly serve the chat interface */
router.get('/', function(req, res, next) {
	res.render('chat', { appName: CONFIG.appName || 'Redish' });
});

router.get('/app', function(req, res, next) {
	res.render('chat', { appName: CONFIG.appName || 'Redish' });
});

export default router;
