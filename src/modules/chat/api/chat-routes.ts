import { Router } from 'express';
import { processShoppingInquiry } from '../domain/chat-service.ts';
import { HttpStatusCode } from '#lib/errors';

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
            attachments: reply.attachments,
            isCachedResponse: reply.isCachedResponse,
            usage: reply.usage
        });
    } catch (error) {
        next(error);
    }
});

export default router;
