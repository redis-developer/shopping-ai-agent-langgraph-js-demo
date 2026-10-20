import { createClient } from 'redis';
import CONFIG from '../../config.ts';

let client: ReturnType<typeof createClient> | null = null;
let isConnectionLost = false;

/**
 * Get or create Redis client singleton
 */
export const getRedisClient = async () => {
    if (!client) {
        console.log('🔄 Creating new Redis client...');

        client = createClient({
            url: CONFIG.redisUrl
        });
        
        // Event handlers
        client.on('error', (error) => {
            // node-redis keeps retrying on its own, so log the outage once instead of on every retry
            if (!isConnectionLost) {
                isConnectionLost = true;
                console.error(`❌ Redis connection lost (${error.code || error.message}), reconnecting automatically...`);
            }
        });
        
        client.on('connect', () => {
            console.log('Redis Client connected successfully');
        });
        
        client.on('disconnect', () => {
            console.log('🔌 Redis Client disconnected');
        });
        
        client.on('ready', () => {
            if (isConnectionLost) {
                isConnectionLost = false;
                console.log('✅ Redis connection restored');
            } else {
                console.log('Redis Client ready');
            }
        });
        
        try {
            await client.connect();
            console.log('🎉 Redis client connection established');
        } catch (error) {
            console.error('❌ Failed to connect to Redis:', error);
            client = null;
            throw error;
        }
    }
    
    return client;
};

/**
 * Close Redis client connection
 */
export const closeRedisClient = async () => {
    if (client) {
        try {
            await client.disconnect();
            console.log('✅ Redis client disconnected successfully');
        } catch (error) {
            console.error('❌ Error disconnecting Redis client:', error);
        } finally {
            client = null;
        }
    }
};

/**
 * Check if Redis client is connected
 */
export const isRedisConnected = () => {
    return client && client.isOpen;
};

/**
 * Get Redis client connection info
 */
export const getRedisInfo = async () => {
    if (!client) {
        return { connected: false, info: null };
    }
    
    try {
        const info = await client.info();
        return {
            connected: client.isOpen,
            url: CONFIG.redisUrl,
            info: info
        };
    } catch (error) {
        return {
            connected: false,
            error: error instanceof Error ? error.message : String(error)
        };
    }
};
