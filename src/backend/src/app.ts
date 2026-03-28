import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import config from './config';
import routes from './routes';
import {
  errorHandler,
  notFoundHandler,
  addRequestId,
  csrfProtection,
  csrfErrorHandler,
  performanceMiddleware,
} from './middleware';
import { getCsrfToken } from './middleware/csrf';
import { auditLog } from './middleware/auditLog';
import { logger, httpLogger } from './utils/logger';
import { initRedis } from './config/redis';
import { setRedisInstance } from './services/cache.service';

// Create Express application
const app: Application = express();

// Security middleware - Helmet for security headers
app.use(
  helmet({
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", config.nodeEnv === 'production' ? 'https://' : 'http://localhost:3000'],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for development if needed
  })
);

// Force HTTPS redirect in production
app.use((req: Request, res: Response, next: NextFunction): void => {
  if (config.nodeEnv === 'production' && req.header('x-forwarded-proto') !== 'https') {
    logger.info('Redirecting to HTTPS', { path: req.path, ip: req.ip });
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// CORS configuration
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-CSRF-Token'],
    exposedHeaders: ['X-Request-ID', 'X-CSRF-Token'],
  })
);

// M05: Audit logging middleware (must be early for complete request tracking)
app.use(auditLog);

// Request ID middleware
app.use(addRequestId);

// Performance monitoring middleware
app.use(performanceMiddleware());

// M06: Cookie parser middleware (for HttpOnly token cookies)
app.use(cookieParser());

// Body parsing middleware (must be before CSRF)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CSRF protection (skipped under Jest / NODE_ENV=test so supertest can POST without X-CSRF-Token)
const csrfDisabled = process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';
if (!csrfDisabled) {
  app.use(csrfProtection);
  app.use(csrfErrorHandler);
}

// HTTP logging middleware
app.use(
  morgan('combined', {
    stream: {
      write: (message: string) => {
        const [ip, , method, url, status, duration] = message.split(' ');
        httpLogger.http('HTTP Request', {
          ip: ip.replace(/\[/g, '').replace(/\]/g, ''),
          method,
          url,
          status: parseInt(status),
          duration: parseInt(duration),
        });
      },
    },
  })
);

if (!csrfDisabled) {
  app.get('/api/v1/csrf-token', getCsrfToken);
}

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Graceful shutdown
let isShuttingDown = false;

export function gracefulShutdown(signal: string): void {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Close server
  server.close(() => {
    logger.info('Closed outbound connections');

    // Disconnect database
    import('./config/database').then(({ disconnectDatabase }) => {
      disconnectDatabase().then(() => {
        // Close Redis
        import('./config/redis').then(({ closeRedis }) => {
          closeRedis().then(() => {
            logger.info('All connections closed');
            process.exit(0);
          });
        });
      });
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 30000);
}

// Create server
const server = app.listen(config.port, () => {
  logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
  logger.info(`API available at http://localhost:${config.port}/api/v1`);
  logger.info(`Health check at http://localhost:${config.port}/health`);
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error('Unhandled Rejection', { reason: message });
  gracefulShutdown('unhandledRejection');
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Initialize Redis and set instance for cache service
const redis = initRedis();
setRedisInstance(redis);

export default app;
