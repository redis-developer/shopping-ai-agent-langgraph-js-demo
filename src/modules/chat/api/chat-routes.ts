import { Router } from 'express';
import { processShoppingInquiry, getShopperContext } from '../domain/chat-service.ts';
import { getWorkingMemory } from '../domain/agent-memory-service.ts';
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

// GET /chat/context
router.get('/context', async function(req, res, next) {
    const { userId, sessionId } = req.query;

    if (typeof userId !== 'string' || typeof sessionId !== 'string') {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ error: 'Missing userId or sessionId' });
    }

    try {
        res.json(await getShopperContext(userId, sessionId));
    } catch (error) {
        next(error);
    }
});

// GET /chat/sessions/:sessionId
router.get('/sessions/:sessionId', async function(req, res, next) {
    try {
        res.json(await getWorkingMemory(req.params.sessionId));
    } catch (error) {
        next(error);
    }
});

export default router;
