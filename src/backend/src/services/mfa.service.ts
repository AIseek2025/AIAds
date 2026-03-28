import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import prisma from '../config/database';
import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// M07: MFA configuration
const MFA_WINDOW = 1; // Allow ±1 time window for clock skew
const VERIFICATION_CODE_TTL = 5 * 60; // 5 minutes

/**
 * Generate MFA secret for a user
 * Returns secret and QR code URL for Google Authenticator
 */
export async function generateMFASecret(userId: string): Promise<{
  secret: string;
  qrCodeUrl: string;
  otpauthUrl: string;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Generate TOTP secret
  const secret = speakeasy.generateSecret({
    name: `AIAds (${user.email})`,
    issuer: 'AIAds',
    length: 32,
  });

  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

  logger.info('MFA secret generated', { userId, email: user.email });

  return {
    secret: secret.base32!,
    qrCodeUrl,
    otpauthUrl: secret.otpauth_url!,
  };
}

/**
 * Verify and enable MFA for a user
 */
export async function enableMFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.mfaEnabled) {
    throw new Error('MFA already enabled');
  }

  if (!user.mfaSecret) {
    throw new Error('MFA secret not generated. Please generate secret first.');
  }

  // Verify the token
  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: MFA_WINDOW,
  });

  if (!isValid) {
    logger.warn('Invalid MFA verification token', { userId });
    return false;
  }

  // Enable MFA
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: true },
  });

  logger.info('MFA enabled', { userId });

  return true;
}

/**
 * Verify MFA token during login
 */
export async function verifyMFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user) {
    return false;
  }

  // If MFA not enabled, skip verification
  if (!user.mfaEnabled) {
    return true;
  }

  if (!user.mfaSecret) {
    logger.warn('MFA enabled but no secret found', { userId });
    return false;
  }

  return speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token,
    window: MFA_WINDOW,
  });
}

/**
 * Disable MFA for a user
 */
export async function disableMFA(userId: string, token: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.mfaEnabled) {
    throw new Error('MFA not enabled');
  }

  // Verify current MFA token
  const isValid = speakeasy.totp.verify({
    secret: user.mfaSecret!,
    encoding: 'base32',
    token,
    window: MFA_WINDOW,
  });

  if (!isValid) {
    logger.warn('Invalid MFA token when disabling', { userId });
    throw new Error('Invalid MFA token');
  }

  // Disable MFA
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  logger.info('MFA disabled', { userId });

  return true;
}

/**
 * Generate email/SMS verification code
 */
export async function generateVerificationCode(userId: string, type: 'email' | 'phone'): Promise<string> {
  const code = crypto.randomInt(100000, 999999).toString();
  const redis = getRedis();

  if (redis) {
    await redis.setex(`mfa:code:${type}:${userId}`, VERIFICATION_CODE_TTL, code);
  }

  logger.info('MFA verification code generated', { userId, type });

  return code;
}

/**
 * Verify email/SMS verification code
 */
export async function verifyVerificationCode(userId: string, type: 'email' | 'phone', code: string): Promise<boolean> {
  const redis = getRedis();

  if (!redis) {
    logger.warn('Redis not available for verification code');
    return false;
  }

  const storedCode = await redis.get(`mfa:code:${type}:${userId}`);

  if (!storedCode) {
    logger.warn('Verification code not found or expired', { userId, type });
    return false;
  }

  if (storedCode !== code) {
    logger.warn('Invalid verification code', { userId, type });
    return false;
  }

  // Delete used code
  await redis.del(`mfa:code:${type}:${userId}`);

  return true;
}

/**
 * Generate backup codes for MFA recovery
 */
export async function generateBackupCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex'));

  // Hash and store backup codes
  const hashedCodes = codes.map((code) => crypto.createHash('sha256').update(code).digest('hex'));

  await prisma.user.update({
    where: { id: userId },
    data: { mfaBackupCodes: hashedCodes },
  });

  logger.info('MFA backup codes generated', { userId });

  // Return plain codes (only time they're visible)
  return codes;
}

/**
 * Verify and consume a backup code
 */
export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaBackupCodes: true },
  });

  if (!user || !user.mfaBackupCodes) {
    return false;
  }

  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  const index = user.mfaBackupCodes.indexOf(hashedCode);

  if (index === -1) {
    return false;
  }

  // Remove used backup code
  const newCodes = user.mfaBackupCodes.filter((_: string, i: number) => i !== index);
  await prisma.user.update({
    where: { id: userId },
    data: { mfaBackupCodes: newCodes },
  });

  logger.info('MFA backup code used', { userId, remainingCodes: newCodes.length });

  return true;
}

/**
 * Check if MFA is required for a user
 */
export async function isMFARequired(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaEnabled: true },
  });

  return user?.mfaEnabled || false;
}
