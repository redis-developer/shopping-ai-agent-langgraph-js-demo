import { createClient } from 'redis';
import CONFIG from '../../config.js';

let client = null;

/**
 * Get or create Redis client singleton
 * @returns {Promise<RedisClient>} Redis client instance
 */
export const getRedisClient = async () => {
    if (!client) {
        console.log('🔄 Creating new Redis client...');

        client = createClient({
            url: CONFIG.redisUrl
        });
        
        // Event handlers
        client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });
        
        client.on('connect', () => {
            console.log('Redis Client connected successfully');
        });
        
        client.on('disconnect', () => {
            console.log('🔌 Redis Client disconnected');
        });
        
        client.on('reconnecting', () => {
            console.log('🔄 Redis Client reconnecting...');
        });
        
        client.on('ready', () => {
            console.log('Redis Client ready');
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
 * @returns {Promise<void>}
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
 * @returns {boolean} Connection status
 */
export const isRedisConnected = () => {
    return client && client.isOpen;
};

/**
 * Get Redis client connection info
 * @returns {Object} Connection information
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
            error: error.message
        };
    }
};
