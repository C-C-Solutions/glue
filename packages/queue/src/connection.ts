import Redis from 'ioredis';

let redisConnection: Redis | null = null;

/**
 * Get or create Redis connection
 */
export function getRedisConnection(url: string): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(url, {
      maxRetriesPerRequest: null,
    });
    
    redisConnection.on('connect', () => {
      console.log('Connected to Redis');
    });
    
    redisConnection.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }
  
  return redisConnection;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('Disconnected from Redis');
  }
}
