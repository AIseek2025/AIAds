import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { prismaPerformanceMiddleware } from '../middleware/performance';

// M08: Production environment query log configuration
// In production, only log errors to avoid performance impact and information leakage
const isProduction = process.env.NODE_ENV === 'production';

// Connection pool configuration
const connectionPoolConfig = {
  // Maximum number of connections in the pool
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  // Minimum number of connections in the pool
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  // Maximum time a connection can be idle before being removed
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
  // Maximum time to wait for a connection from the pool
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000', 10),
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || '',
  max: connectionPoolConfig.max,
  connectionTimeoutMillis: connectionPoolConfig.connectionTimeoutMillis,
  idleTimeoutMillis: connectionPoolConfig.idleTimeoutMillis,
});

// Create Prisma client instance with proper typing and connection pool optimization
const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['query', 'error', 'warn'],
});

const prismaWithHooks = prisma as PrismaClient & {
  $use?: (middleware: unknown) => void;
  $on?: (event: string, cb: (e: any) => void) => void;
};

// Register performance monitoring middleware
if (typeof prismaWithHooks.$use === 'function') {
  prismaWithHooks.$use(prismaPerformanceMiddleware());
}

// Only log slow queries in production (threshold: 100ms)
if (typeof prismaWithHooks.$on === 'function' && isProduction) {
  // @ts-ignore - Prisma event typing
  prismaWithHooks.$on('query', (e: any) => {
    const duration = e.duration;
    if (duration > 100) {
      logger.warn('Slow query detected', {
        query: e.query,
        params: e.params,
        duration: `${duration}ms`,
      });
    }
  });
} else if (typeof prismaWithHooks.$on === 'function') {
  // Development: log all queries
  // @ts-ignore - Prisma event typing
  prismaWithHooks.$on('query', (e: any) => {
    logger.debug('Query executed', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log errors
if (typeof prismaWithHooks.$on === 'function') {
  // @ts-ignore - Prisma event typing
  prismaWithHooks.$on('error', (e: any) => {
    logger.error('Prisma error', {
      target: e.target,
      message: e.message,
    });
  });
}

// Log warnings
if (typeof prismaWithHooks.$on === 'function') {
  // @ts-ignore - Prisma event typing
  prismaWithHooks.$on('warn', (e: any) => {
    logger.warn('Prisma warning', {
      target: e.target,
      message: e.message,
    });
  });
}

// Graceful shutdown
export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully', {
      poolConfig: connectionPoolConfig,
    });
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error('Error disconnecting database', { error });
  }
}

// Export connection pool configuration for reference
export { connectionPoolConfig };

export default prisma;
