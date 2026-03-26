import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from './logger';

// M01: bcrypt cost factor configuration
// Cost factor of 12 provides strong security while maintaining reasonable performance
const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12', 10);

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// JWT Token types
export interface JwtPayload {
  sub: string;          // User ID
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  jti: string;          // Unique token ID
}

// Admin JWT Token payload
export interface AdminJwtPayload {
  sub: string;          // Admin ID
  email: string;
  role: string;
  permissions: string[];
  iat?: number;
  exp?: number;
  jti: string;          // Unique token ID
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Admin Token Pair
export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Generate JWT tokens
export function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): TokenPair {
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // P1 Fix: Validate JWT secret before using it
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 32) {
    logger.error('Invalid JWT secret - must be at least 32 characters');
    throw new Error('JWT secret configuration error');
  }

  // Access token (1 hour)
  const accessTokenExpiresIn = 3600; // 1 hour
  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      jti,
      iat: now,
      exp: now + accessTokenExpiresIn,
    },
    jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: accessTokenExpiresIn,
    }
  );

  // Refresh token (7 days)
  const refreshTokenExpiresIn = 604800; // 7 days
  const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;
  
  // P1 Fix: Validate refresh secret
  if (!refreshSecret || refreshSecret.length < 32) {
    logger.error('Invalid JWT refresh secret - must be at least 32 characters');
    throw new Error('JWT refresh secret configuration error');
  }

  const refreshToken = jwt.sign(
    {
      sub: payload.sub,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + refreshTokenExpiresIn,
    },
    refreshSecret,
    {
      algorithm: 'HS256',
      expiresIn: refreshTokenExpiresIn,
    }
  );

  logger.info('Generated JWT tokens', { userId: payload.sub, jti });

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiresIn,
  };
}

// Generate admin JWT tokens
export function generateAdminTokens(payload: Omit<AdminJwtPayload, 'iat' | 'exp' | 'jti'>): AdminTokenPair {
  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // P1 Fix: Validate admin JWT secret before using it
  const adminJwtSecret = process.env.ADMIN_JWT_SECRET;
  if (!adminJwtSecret || adminJwtSecret.length < 32) {
    logger.error('Invalid admin JWT secret - must be at least 32 characters');
    throw new Error('Admin JWT secret configuration error');
  }

  // Admin access token (8 hours)
  const accessTokenExpiresIn = 28800; // 8 hours
  const accessToken = jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      permissions: payload.permissions,
      jti,
      iat: now,
      exp: now + accessTokenExpiresIn,
    },
    adminJwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: accessTokenExpiresIn,
    }
  );

  // Admin refresh token (7 days)
  const refreshTokenExpiresIn = 604800; // 7 days
  const adminRefreshSecret = process.env.ADMIN_JWT_REFRESH_SECRET || adminJwtSecret;
  
  // P1 Fix: Validate admin refresh secret
  if (!adminRefreshSecret || adminRefreshSecret.length < 32) {
    logger.error('Invalid admin JWT refresh secret - must be at least 32 characters');
    throw new Error('Admin JWT refresh secret configuration error');
  }

  const refreshToken = jwt.sign(
    {
      sub: payload.sub,
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + refreshTokenExpiresIn,
    },
    adminRefreshSecret,
    {
      algorithm: 'HS256',
      expiresIn: refreshTokenExpiresIn,
    }
  );

  logger.info('Generated admin JWT tokens', { adminId: payload.sub, jti });

  return {
    accessToken,
    refreshToken,
    expiresIn: accessTokenExpiresIn,
  };
}

// Verify JWT token
export function verifyToken(token: string, type: 'access' | 'refresh' | 'admin_access' | 'admin_refresh' = 'access'): JwtPayload | AdminJwtPayload {
  try {
    let secret: string | undefined;

    if (type === 'admin_access') {
      secret = process.env.ADMIN_JWT_SECRET;
      // P1 Fix: Validate secret before use
      if (!secret || secret.length < 32) {
        logger.error('Invalid admin JWT secret configuration');
        throw new Error('Admin JWT secret configuration error');
      }
    } else if (type === 'admin_refresh') {
      secret = process.env.ADMIN_JWT_REFRESH_SECRET || process.env.ADMIN_JWT_SECRET;
      // P1 Fix: Validate secret before use
      if (!secret || secret.length < 32) {
        logger.error('Invalid admin JWT refresh secret configuration');
        throw new Error('Admin JWT refresh secret configuration error');
      }
    } else if (type === 'refresh') {
      secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
      // P1 Fix: Validate secret before use
      if (!secret || secret.length < 32) {
        logger.error('Invalid JWT refresh secret configuration');
        throw new Error('JWT refresh secret configuration error');
      }
    } else {
      secret = process.env.JWT_SECRET;
      // P1 Fix: Validate secret before use
      if (!secret || secret.length < 32) {
        logger.error('Invalid JWT secret configuration');
        throw new Error('JWT secret configuration error');
      }
    }

    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256'],
    }) as JwtPayload | AdminJwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenError('Token 已过期', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenError('Token 无效', 'TOKEN_INVALID');
    }
    // P1 Fix: Re-throw configuration errors
    if (error instanceof Error && error.message.includes('configuration error')) {
      throw error;
    }
    throw error;
  }
}

// Decode JWT token without verification
export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
}

// Generate verification code
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// Hash verification code (for storage)
export function hashVerificationCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

// Verify verification code
export function verifyVerificationCode(code: string, hash: string): boolean {
  const codeHash = hashVerificationCode(code);
  return crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hash));
}

// Generate random string
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Custom error class for token errors
export class TokenError extends Error {
  code: string;

  constructor(message: string, code: string = 'TOKEN_INVALID') {
    super(message);
    this.name = 'TokenError';
    this.code = code;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
