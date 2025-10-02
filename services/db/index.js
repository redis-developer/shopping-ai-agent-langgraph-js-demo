/**
 * Database layer exports
 * Centralized access to all database clients and utilities
 */

export { 
    getRedisClient, 
    closeRedisClient, 
    isRedisConnected, 
    getRedisInfo 
} from './redis-client.js';

// Future database clients can be exported here
// export { getPostgresClient } from './postgres-client.js';
// export { getMongoClient } from './mongo-client.js';
