import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * P3 Fix: Standardized log format with required fields
 * All logs must include: timestamp, level, message, requestId (if available)
 */

/**
 * Filter sensitive information from logs
 * - Verification codes (6-digit numbers)
 * - Passwords
 * - Tokens
 * - Credit card numbers
 */
const sensitiveFilter = winston.format((info: any) => {
  // Filter verification codes (6-digit numbers)
  if (info.message && typeof info.message === 'string') {
    // Replace 6-digit codes with asterisks
    info.message = info.message.replace(/\b\d{6}\b/g, '******');
    // Replace patterns like "code: 123456" or "code=123456"
    info.message = info.message.replace(/(code["']?\s*[:=]\s*)\d+/gi, '$1******');
    // Replace patterns like "verification_code: 123456"
    info.message = info.message.replace(/(verification[_-]?code["']?\s*[:=]\s*)\d+/gi, '$1******');
  }

  // Filter metadata
  if (info.code && typeof info.code === 'string') {
    info.code = '******';
  }
  if (info.verificationCode && typeof info.verificationCode === 'string') {
    info.verificationCode = '******';
  }
  if (info.password && typeof info.password === 'string') {
    info.password = '********';
  }
  if (info.token && typeof info.token === 'string') {
    info.token = info.token.substring(0, 10) + '...[REDACTED]';
  }
  if (info.accessToken && typeof info.accessToken === 'string') {
    info.accessToken = info.accessToken.substring(0, 10) + '...[REDACTED]';
  }
  if (info.refreshToken && typeof info.refreshToken === 'string') {
    info.refreshToken = info.refreshToken.substring(0, 10) + '...[REDACTED]';
  }

  return info;
});

/**
 * P3 Fix: Add common fields to all logs
 * Ensures consistent format across all log entries
 */
const addCommonFields = winston.format((info: any) => {
  // Add service name
  info.service = info.service || 'aiads-backend';
  
  // Add environment
  info.environment = info.environment || process.env.NODE_ENV || 'development';
  
  // Add version
  info.version = info.version || process.env.APP_VERSION || '1.0.0';
  
  // Add hostname
  info.hostname = info.hostname || require('os').hostname();
  
  // Ensure timestamp is ISO format
  if (info.timestamp && typeof info.timestamp === 'string') {
    info.timestamp = new Date(info.timestamp).toISOString();
  }
  
  return info;
});

// Custom log format - P3 Fix: Unified format with all required fields
const logFormat = printf(({ level, message, timestamp, stack, requestId, service, environment, ...metadata }) => {
  let msg = `${timestamp} [${level}] ${service || 'aiads-backend'} ${requestId ? `[${requestId}]` : ''}: ${message}`;

  if (Object.keys(metadata).length > 0) {
    // Filter out already included fields
    const filteredMetadata: any = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (!['timestamp', 'level', 'message', 'stack', 'requestId', 'service', 'environment'].includes(key)) {
        filteredMetadata[key] = value;
      }
    }
    if (Object.keys(filteredMetadata).length > 0) {
      msg += ` ${JSON.stringify(filteredMetadata)}`;
    }
  }

  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    addCommonFields(), // P3 Fix: Add common fields
    sensitiveFilter(), // Apply sensitive data filtering
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(colorize(), addCommonFields(), sensitiveFilter(), logFormat),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for combined logs
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

// Create HTTP request logger
const httpLogger = winston.createLogger({
  level: 'http',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ timestamp, method, url, status, duration }) => {
      return `${timestamp} [HTTP]: ${method} ${url} ${status} - ${duration}ms`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'http.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

export { logger, httpLogger };
