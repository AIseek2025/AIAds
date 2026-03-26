import * as crypto from 'crypto';
import { logger } from '../utils/logger';

export interface Config {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  redisUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  allowedOrigins: string[];
  logLevel: string;
}

/**
 * Generate a cryptographically secure random secret
 * @param length - Length in bytes (default 32 bytes = 64 hex chars)
 * @returns Hex-encoded secure random string
 */
export function generateSecureSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Validate JWT secret strength
 * @param secret - The secret to validate
 * @param name - Name of the secret for error messages
 * @throws Error if secret is invalid or too weak
 */
export function validateJwtSecret(secret: string | undefined, name: string): void {
  if (!secret) {
    throw new Error(`${name} is required`);
  }
  
  // JWT secret should be at least 32 characters (256 bits when hex-encoded)
  if (secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters. Current length: ${secret.length}. Consider using generateSecureSecret() to create a strong secret.`);
  }
  
  // Check for common weak patterns
  const weakPatterns = [
    /^secret/i,
    /^password/i,
    /^123456/,
    /^qwerty/i,
    /^admin/i,
    /^test/i,
    /^dev-/,
    /^change-me/i,
  ];
  
  for (const pattern of weakPatterns) {
    if (pattern.test(secret)) {
      throw new Error(`${name} contains weak patterns. Please use a randomly generated secret.`);
    }
  }
  
  logger.info(`${name} validation passed`, { length: secret.length });
}

function getEnvString(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Invalid number for environment variable: ${key}`);
  }
  return num;
}

function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.split(',').map((v) => v.trim());
}

// Load configuration
export const config: Config = {
  nodeEnv: getEnvString('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  databaseUrl: getEnvString('DATABASE_URL'),
  redisUrl: getEnvString('REDIS_URL', ''),
  jwtSecret: getEnvString('JWT_SECRET'),
  jwtRefreshSecret: getEnvString('JWT_REFRESH_SECRET'),
  jwtExpiresIn: getEnvString('JWT_EXPIRES_IN', '1h'),
  allowedOrigins: getEnvArray('ALLOWED_ORIGINS', ['http://localhost:3000']),
  logLevel: getEnvString('LOG_LEVEL', 'info'),
};

// Validate configuration
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Validate JWT secrets with strength checking
  try {
    validateJwtSecret(config.jwtSecret, 'JWT_SECRET');
  } catch (error) {
    errors.push((error as Error).message);
  }

  try {
    validateJwtSecret(config.jwtRefreshSecret, 'JWT_REFRESH_SECRET');
  } catch (error) {
    errors.push((error as Error).message);
  }

  if (errors.length > 0) {
    const errorMsg = `Configuration errors:\n${errors.join('\n')}`;
    logger.error(errorMsg);
    throw new Error(errorMsg);
  }

  logger.info('Configuration validated', {
    nodeEnv: config.nodeEnv,
    port: config.port,
    allowedOrigins: config.allowedOrigins,
  });
}

export default config;
