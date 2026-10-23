import { Router } from 'express';
import { processShoppingInquiry, getShopperContext } from '../domain/chat-service.ts';
import { getWorkingMemory } from '../domain/agent-memory-service.ts';
import { AppError, HttpStatusCode } from '#lib/errors';

const router = Router();

// POST /chat
router.post('/', async function(req, res, next) {
    const { message, userId, sessionId, lookupSimilarResponses = true } = req.body;

    if (!message || !userId || !sessionId) {
        return res.status(HttpStatusCode.BAD_REQUEST).json({ error: 'Missing message, userId or sessionId' });
    }

    // The reply is sent as a stream of events: what the assistant is doing, its text as the
    // agent writes it, then one last event with everything else. The stream starts with the first event, so an
    // error before that still gets the usual JSON error response.
    let streaming = false;
    const send = (event: string, data: object) => {
        if (!streaming) {
            streaming = true;
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no' });
        }
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
        const reply = await processShoppingInquiry(userId, sessionId, message, lookupSimilarResponses, (text) => send('token', { text }), (step) => send('step', step));
        send('done', {
            content: reply.content,
            attachments: reply.attachments,
            suggestedFollowUps: reply.suggestedFollowUps,
            isCachedResponse: reply.isCachedResponse,
            usage: reply.usage
        });
        res.end();
    } catch (error) {
        if (!streaming) {
            return next(error);
        }
        console.error('Error while streaming the reply:', error);
        send('error', { message: error instanceof AppError && error.publicMessage ? error.publicMessage : "We couldn't complete this action. Please try again in a bit." });
        res.end();
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
