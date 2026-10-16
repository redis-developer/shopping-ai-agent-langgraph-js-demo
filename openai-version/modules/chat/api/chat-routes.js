import { Router } from 'express';
import { processShoppingInquiry } from '../domain/chat-service.js';
import { HttpStatusCode } from '#lib/errors.js';

const router = Router();

// POST /chat
router.post('/', async function(req, res, next) {
    const { message, userId, sessionId, lookupSimilarResponses = true } = req.body;

    if (!message || !userId || !sessionId) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ error: 'Missing message, userId or sessionId' });
    }

    try {
        const reply = await processShoppingInquiry(userId, sessionId, message, lookupSimilarResponses);
        res.json({ 
            content: reply.content,
            isCachedResponse: reply.isCachedResponse,
            usage: reply.usage
        });
    } catch (error) {
        next(error);
    }
});

export default router;
