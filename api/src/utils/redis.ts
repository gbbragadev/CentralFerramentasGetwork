// ===========================================
// Redis Connection Utility
// ===========================================

import Redis from 'ioredis';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Necessário para BullMQ
      enableReadyCheck: false,
    });

    redisConnection.on('error', (err) => {
      console.error('❌ Redis Error:', err.message);
    });

    redisConnection.on('connect', () => {
      console.log('✅ Redis conectado');
    });
  }

  return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}
