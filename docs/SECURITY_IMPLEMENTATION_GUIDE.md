# AIAds 安全实现指南

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密
**关联文档**: SECURITY_ARCHITECTURE_V2.md

---

## 目录

1. [认证架构实现](#1-认证架构实现)
2. [数据保护实现](#2-数据保护实现)
3. [API 安全实现](#3-api 安全实现)
4. [监控响应实现](#4-监控响应实现)
5. [测试方法](#5-测试方法)
6. [部署检查清单](#6-部署检查清单)

---

## 1. 认证架构实现

### 1.1 JWT 配置优化

#### 1.1.1 环境变量配置

```bash
# .env.example

# JWT 配置（必须设置，至少 32 字符）
JWT_SECRET=your-super-secret-key-at-least-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-key-at-least-32-chars
JWT_ACCESS_EXPIRATION=900           # 15 分钟（秒）
JWT_REFRESH_EXPIRATION=604800       # 7 天（秒）

# bcrypt 配置
BCRYPT_ROUNDS=12

# Session 配置
SESSION_MAX_CONCURRENT=5            # 最大并发 Session 数
SESSION_TIMEOUT=900                 # Session 超时（秒）

# MFA 配置
MFA_ISSUER=AIAds
MFA_WINDOW=1                        # TOTP 验证窗口（前后 1 个周期）
```

#### 1.1.2 JWT 工具类实现

```typescript
// src/backend/src/utils/jwt.ts

import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { RedisService } from '../services/redis.service';

interface TokenPayload {
  sub: string;           // 用户 ID
  email: string;         // 邮箱
  role: string;          // 角色
  sessionId: string;     // 会话 ID
  deviceFingerprint?: string;  // 设备指纹
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

class JWTService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiration: number;
  private readonly refreshExpiration: number;
  private redisService: RedisService;

  constructor() {
    // 强制要求环境变量
    this.accessSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

    if (!this.accessSecret || this.accessSecret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 characters long');
    }

    this.accessExpiration = parseInt(process.env.JWT_ACCESS_EXPIRATION || '900', 10);
    this.refreshExpiration = parseInt(process.env.JWT_REFRESH_EXPIRATION || '604800', 10);
    this.redisService = RedisService.getInstance();
  }

  /**
   * 生成 Token 对
   */
  generateTokens(payload: Omit<TokenPayload, 'sessionId'>): TokenPair {
    const sessionId = randomUUID();
    const jti = randomUUID();

    const tokenPayload = {
      ...payload,
      sessionId,
      jti,
    };

    const accessToken = jwt.sign(tokenPayload, this.accessSecret, {
      algorithm: 'HS256',
      expiresIn: this.accessExpiration,
    });

    const refreshToken = jwt.sign(
      {
        sub: payload.sub,
        sessionId,
        jti: randomUUID(),
        rotationCount: 0,
      },
      this.refreshSecret,
      {
        algorithm: 'HS256',
        expiresIn: this.refreshExpiration,
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiration,
    };
  }

  /**
   * 验证 Access Token
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256'],
      }) as TokenPayload;

      // 检查 Session 是否有效
      const sessionValid = await this.redisService.exists(`session:${payload.sessionId}`);
      if (!sessionValid) {
        throw new Error('Session expired');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * 刷新 Token（带轮换机制）
   */
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = jwt.verify(refreshToken, this.refreshSecret, {
        algorithms: ['HS256'],
      }) as any;

      // 检查 Token 是否在黑名单（重用检测）
      const isBlacklisted = await this.redisService.exists(`token:blacklist:${payload.jti}`);
      if (isBlacklisted) {
        // 检测到重放攻击，吊销用户所有 Token
        await this.revokeAllUserTokens(payload.sub);
        throw new Error('Refresh token reused - possible attack');
      }

      // 获取用户信息
      const user = await this.getUserById(payload.sub);
      if (!user) {
        throw new Error('User not found');
      }

      // 生成新 Token 对
      const newTokens = this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
        deviceFingerprint: payload.deviceFingerprint,
      });

      // 将旧 Refresh Token 加入黑名单
      const decoded = jwt.decode(refreshToken) as any;
      const ttl = decoded.exp * 1000 - Date.now();
      if (ttl > 0) {
        await this.redisService.setex(
          `token:blacklist:${decoded.jti}`,
          Math.ceil(ttl / 1000),
          '1'
        );
      }

      return newTokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * 吊销用户所有 Token
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // 将所有活跃 Session 加入黑名单
    const sessions = await this.redisService.keys(`session:${userId}:*`);
    for (const session of sessions) {
      await this.redisService.del(session);
    }

    // 记录安全事件
    await this.logSecurityEvent('TOKEN_REVOKED', { userId });
  }

  /**
   * 登出
   */
  async logout(userId: string, sessionId: string): Promise<void> {
    await this.redisService.del(`session:${sessionId}`);
  }

  private async getUserById(id: string): Promise<any> {
    // 实现获取用户逻辑
    return null;
  }

  private async logSecurityEvent(event: string, data: any): Promise<void> {
    // 实现安全事件日志
    console.log('Security Event:', event, data);
  }
}

export const jwtService = new JWTService();
```

### 1.2 MFA 实现

#### 1.2.1 TOTP 实现

```typescript
// src/backend/src/services/mfa.service.ts

import { authenticator } from 'otplib';
import { toFileStream } from 'qrcode';
import { prisma } from '../config/database';

interface MFASetup {
  secret: string;
  otpauth: string;
  qrCodeUrl: string;
}

class MFAService {
  private readonly issuer = process.env.MFA_ISSUER || 'AIAds';
  private readonly window = parseInt(process.env.MFA_WINDOW || '1', 10);

  /**
   * 为用户启用 MFA
   */
  async enableMFA(userId: string, email: string): Promise<MFASetup> {
    // 生成密钥
    const secret = authenticator.generateSecret();

    // 生成 OTPAuth URL
    const otpauth = authenticator.keyuri(email, this.issuer, secret);

    // 生成二维码
    const qrCodeUrl = await this.generateQRCode(otpauth);

    // 存储密钥（未验证状态）
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: false,  // 需要验证后才启用
      },
    });

    return { secret, otpauth, qrCodeUrl };
  }

  /**
   * 验证 MFA 设置
   */
  async verifyMFASetup(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true },
    });

    if (!user?.mfaSecret) {
      throw new Error('MFA not initialized');
    }

    const isValid = authenticator.verify({
      token,
      secret: user.mfaSecret,
      window: this.window,
    });

    if (isValid) {
      // 生成恢复代码
      const recoveryCodes = this.generateRecoveryCodes();
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: true,
          mfaRecoveryCodes: JSON.stringify(recoveryCodes),
        },
      });

      return { valid: true, recoveryCodes };
    }

    return false;
  }

  /**
   * 验证 MFA Token
   */
  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mfaSecret: true, mfaEnabled: true, mfaRecoveryCodes: true },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      return false;
    }

    // 尝试使用恢复代码
    const recoveryCodes = JSON.parse(user.mfaRecoveryCodes || '[]');
    if (recoveryCodes.includes(token)) {
      // 使用并移除已使用的恢复代码
      const newCodes = recoveryCodes.filter((code: string) => code !== token);
      await prisma.user.update({
        where: { id: userId },
        data: { mfaRecoveryCodes: JSON.stringify(newCodes) },
      });
      return true;
    }

    // 验证 TOTP
    return authenticator.verify({
      token,
      secret: user.mfaSecret,
      window: this.window,
    });
  }

  /**
   * 禁用 MFA
   */
  async disableMFA(userId: string, token: string): Promise<boolean> {
    const isValid = await this.verifyMFAToken(userId, token);
    if (isValid) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaRecoveryCodes: null,
        },
      });
      return true;
    }
    return false;
  }

  /**
   * 生成恢复代码
   */
  private generateRecoveryCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from({ length: 8 }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(Math.floor(Math.random() * 36))
      ).join('-');
      codes.push(code);
    }
    return codes;
  }

  /**
   * 生成二维码
   */
  private async generateQRCode(otpauth: string): Promise<string> {
    // 实现二维码生成逻辑
    return `data:image/png;base64,...`;
  }
}

export const mfaService = new MFAService();
```

#### 1.2.2 MFA 中间件

```typescript
// src/backend/src/middleware/mfa.ts

import { Request, Response, NextFunction } from 'express';
import { mfaService } from '../services/mfa.service';

interface MFAOptions {
  required?: boolean;           // 是否必需
  conditional?: boolean;        // 条件触发
  skipRoles?: string[];         // 跳过角色
}

export function mfa(options: MFAOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user) {
      return next();  // 由 auth 中间件处理
    }

    // 检查是否跳过
    if (options.skipRoles?.includes(user.role)) {
      return next();
    }

    // 检查是否需要 MFA
    const requiresMFA = await checkMFARequirement(user, options);

    if (requiresMFA) {
      const mfaToken = req.headers['x-mfa-token'] as string;

      if (!mfaToken) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MFA_REQUIRED',
            message: '需要 MFA 验证',
            mfaMethods: ['totp', 'sms', 'email'],
          },
        });
      }

      const isValid = await mfaService.verifyMFAToken(user.id, mfaToken);
      if (!isValid) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'MFA_INVALID',
            message: 'MFA 验证码无效',
          },
        });
      }
    }

    next();
  };
}

async function checkMFARequirement(user: any, options: MFAOptions): Promise<boolean> {
  // 如果用户已启用 MFA，始终需要验证
  if (user.mfaEnabled) {
    return true;
  }

  // 条件触发检查
  if (options.conditional) {
    // 异地登录检测
    if (await isNewLocation(user)) {
      return true;
    }

    // 新设备检测
    if (await isNewDevice(user)) {
      return true;
    }

    // 敏感操作
    if (isSensitiveOperation(user)) {
      return true;
    }
  }

  return false;
}

async function isNewLocation(user: any): Promise<boolean> {
  // 实现异地登录检测
  return false;
}

async function isNewDevice(user: any): Promise<boolean> {
  // 实现新设备检测
  return false;
}

function isSensitiveOperation(user: any): boolean {
  // 实现敏感操作检测
  return false;
}
```

### 1.3 账户锁定实现

```typescript
// src/backend/src/services/account-lock.service.ts

import { prisma } from '../config/database';
import { RedisService } from '../services/redis.service';

interface LockConfig {
  maxAttempts: number;        // 最大失败次数
  lockDuration: number;       // 锁定时长（分钟）
  progressiveLock: boolean;   // 渐进式锁定
}

class AccountLockService {
  private readonly config: LockConfig = {
    maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
    lockDuration: parseInt(process.env.LOCK_DURATION || '15', 10),
    progressiveLock: true,
  };

  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  /**
   * 记录登录失败
   */
  async recordFailedAttempt(userId: string, ip: string): Promise<void> {
    const key = `login:attempts:${userId}`;
    const attempts = await this.redisService.incr(key);

    if (attempts === 1) {
      // 设置过期时间
      await this.redisService.expire(key, this.config.lockDuration * 60);
    }

    if (attempts >= this.config.maxAttempts) {
      await this.lockAccount(userId, ip);
    }
  }

  /**
   * 检查账户是否被锁定
   */
  async isLocked(userId: string): Promise<{ locked: boolean; unlockTime?: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lockedUntil: true },
    });

    if (user?.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return {
        locked: true,
        unlockTime: user.lockedUntil,
      };
    }

    return { locked: false };
  }

  /**
   * 重置失败计数
   */
  async resetFailedAttempts(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.redisService.del(`login:attempts:${userId}`);
  }

  /**
   * 锁定账户
   */
  private async lockAccount(userId: string, ip: string): Promise<void> {
    const lockUntil = new Date(Date.now() + this.config.lockDuration * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: lockUntil,
      },
    });

    // 记录安全事件
    await this.logSecurityEvent('ACCOUNT_LOCKED', { userId, ip, lockUntil });

    // 添加到 Redis 锁定集合
    await this.redisService.setex(
      `account:locked:${userId}`,
      this.config.lockDuration * 60,
      '1'
    );
  }

  /**
   * 手动解锁账户（管理员）
   */
  async unlockAccount(userId: string, adminId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    await this.redisService.del(`account:locked:${userId}`);
    await this.redisService.del(`login:attempts:${userId}`);

    await this.logSecurityEvent('ACCOUNT_UNLOCKED', { userId, adminId });
  }

  private async logSecurityEvent(event: string, data: any): Promise<void> {
    // 实现安全事件日志
    console.log('Security Event:', event, data);
  }
}

export const accountLockService = new AccountLockService();
```

---

## 2. 数据保护实现

### 2.1 数据加密实现

#### 2.1.1 AES-256 加密工具

```typescript
// src/backend/src/utils/encryption.ts

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
}

class EncryptionService {
  private readonly config: EncryptionConfig = {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    saltLength: 16,
  };

  private key: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY must be set');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * 加密敏感数据
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(this.config.ivLength);
    const salt = randomBytes(this.config.saltLength);

    // 派生密钥
    const derivedKey = scryptSync(
      this.key,
      salt,
      this.config.keyLength
    );

    const cipher = createCipheriv(
      this.config.algorithm,
      derivedKey,
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // 组合：salt + iv + authTag + encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * 解密敏感数据
   */
  decrypt(encryptedData: string): string {
    const [saltHex, ivHex, authTagHex, encrypted] = encryptedData.split(':');

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // 派生密钥
    const derivedKey = scryptSync(
      this.key,
      salt,
      this.config.keyLength
    );

    const decipher = createDecipheriv(
      this.config.algorithm,
      derivedKey,
      iv
    );

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// 简化版本（用于快速集成）
function scryptSync(password: Buffer, salt: Buffer, keylen: number): Buffer {
  // 实际实现使用 crypto.scryptSync
  return require('crypto').scryptSync(password, salt, keylen);
}

export const encryptionService = new EncryptionService();
```

#### 2.1.2 敏感字段加密装饰器

```typescript
// src/backend/src/decorators/encrypted-field.ts

import { encryptionService } from '../utils/encryption';

/**
 * 自动加密/解密字段装饰器
 */
export function EncryptedField() {
  return function (target: any, propertyKey: string) {
    const privateKey = `_${propertyKey}`;

    Object.defineProperty(target, propertyKey, {
      get() {
        const encrypted = this[privateKey];
        if (encrypted) {
          return encryptionService.decrypt(encrypted);
        }
        return null;
      },
      set(value: string) {
        if (value) {
          this[privateKey] = encryptionService.encrypt(value);
        } else {
          this[privateKey] = null;
        }
      },
      enumerable: true,
      configurable: true,
    });
  };
}

// 使用示例
class User {
  id: string;
  email: string;

  @EncryptedField()
  phone: string;

  @EncryptedField()
  idCard: string;
}
```

### 2.2 数据脱敏实现

#### 2.2.1 脱敏工具函数

```typescript
// src/backend/src/utils/masking.ts

/**
 * 脱敏工具类
 */
export class MaskingUtils {
  /**
   * 脱敏邮箱
   * 示例：test.user@gmail.com -> te***r@gmail.com
   */
  static maskEmail(email: string): string {
    if (!email) return '';

    const [username, domain] = email.split('@');
    if (username.length <= 2) {
      return `**@${domain}`;
    }

    const masked =
      username[0] +
      '*'.repeat(username.length - 2) +
      username[username.length - 1];

    return `${masked}@${domain}`;
  }

  /**
   * 脱敏手机号
   * 示例：13812345678 -> 138****5678
   */
  static maskPhone(phone: string): string {
    if (!phone) return '';

    // 移除空格和特殊字符
    const cleaned = phone.replace(/[\s-()]/g, '');

    if (cleaned.length < 11) {
      return cleaned;
    }

    return cleaned.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 脱敏身份证号
   * 示例：110101199001011234 -> 110101********1234
   */
  static maskIdCard(idCard: string): string {
    if (!idCard) return '';

    return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
  }

  /**
   * 脱敏银行卡号
   * 示例：6222021234567890123 -> 6222****0123
   */
  static maskBankCard(cardNumber: string): string {
    if (!cardNumber) return '';

    const cleaned = cardNumber.replace(/\s/g, '');

    if (cleaned.length < 8) {
      return cleaned;
    }

    return cleaned.replace(/(\d{4})\d+(\d{4})/, '$1****$2');
  }

  /**
   * 脱敏姓名
   * 示例：张三 -> 张*
   */
  static maskName(name: string): string {
    if (!name) return '';

    if (name.length === 1) {
      return '*';
    }

    return name[0] + '*'.repeat(name.length - 1);
  }

  /**
   * 脱敏地址
   * 示例：北京市朝阳区 xxx 街道 -> 北京市朝阳区***
   */
  static maskAddress(address: string): string {
    if (!address) return '';

    // 保留到区级
    const match = address.match(/.*?[市区县]/);
    if (match) {
      return match[0] + '***';
    }

    return address.substring(0, 5) + '***';
  }

  /**
   * 根据脱敏级别脱敏
   */
  static maskByLevel(data: any, level: 'full' | 'partial' | 'minimal'): any {
    if (!data) return data;

    switch (level) {
      case 'full':
        return {
          ...data,
          email: this.maskEmail(data.email),
          phone: this.maskPhone(data.phone),
          idCard: this.maskIdCard(data.idCard),
          bankCard: this.maskBankCard(data.bankCard),
          name: this.maskName(data.name),
          address: this.maskAddress(data.address),
        };

      case 'partial':
        return {
          ...data,
          email: this.maskEmail(data.email),
          phone: this.maskPhone(data.phone),
          idCard: this.maskIdCard(data.idCard),
        };

      case 'minimal':
        return data;  // 最小脱敏，返回原始数据

      default:
        return data;
    }
  }
}
```

#### 2.2.2 响应脱敏中间件

```typescript
// src/backend/src/middleware/response-masking.ts

import { Request, Response, NextFunction } from 'express';
import { MaskingUtils } from '../utils/masking';

interface MaskingOptions {
  level: 'full' | 'partial' | 'minimal';
  excludeFields?: string[];  // 排除字段
  includeFields?: string[];  // 包含字段
}

export function responseMasking(options: MaskingOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (data: any) => {
      // 检查是否需要脱敏
      const shouldMask = shouldMaskResponse(req, options);

      if (shouldMask && data.data) {
        data.data = MaskingUtils.maskByLevel(data.data, options.level);
      }

      return originalJson(data);
    };

    next();
  };
}

function shouldMaskResponse(req: Request, options: MaskingOptions): boolean {
  // 管理员请求不脱敏
  const user = (req as any).user;
  if (user?.role === 'admin' || user?.role === 'super_admin') {
    return false;
  }

  // 检查是否是敏感接口
  const sensitivePaths = ['/users', '/profile', '/account'];
  const isSensitivePath = sensitivePaths.some(path =>
    req.path.startsWith(path)
  );

  return isSensitivePath;
}
```

### 2.3 Row Level Security 实现

```sql
-- prisma/migrations/xxxx_add_rls_policies/migration.sql

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kols ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 用户表策略
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (
    id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (
    id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );

-- 广告主表策略
CREATE POLICY advertisers_select_own ON advertisers
  FOR SELECT
  USING (
    user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );

-- KOL 表策略（公开数据可查看所有）
CREATE POLICY kols_select_public ON kols
  FOR SELECT
  USING (
    is_public = true
    OR user_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );

-- 活动表策略
CREATE POLICY campaigns_select_own ON campaigns
  FOR SELECT
  USING (
    advertiser_id::text = current_setting('app.current_user_id', true)
    OR current_setting('app.current_user_role', true) IN ('admin', 'super_admin')
  );
```

```typescript
// src/backend/src/middleware/rls.ts

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

/**
 * 设置 RLS 上下文
 */
export function setRLSContext(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;

  if (user) {
    // 设置当前用户 ID 和角色
    prisma.$executeRawUnsafe(`
      SET LOCAL app.current_user_id = '${user.id}';
      SET LOCAL app.current_user_role = '${user.role}';
    `);
  }

  next();
}
```

---

## 3. API 安全实现

### 3.1 多级限流实现

```typescript
// src/backend/src/middleware/rate-limiter.ts

import { Request, Response, NextFunction } from 'express';
import { RedisService } from '../services/redis.service';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

class RateLimiterService {
  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  /**
   * 创建限流器
   */
  createLimiter(config: RateLimitConfig) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = this.generateKey(req, config);
        const now = Date.now();
        const windowStart = now - config.windowMs;

        // 使用 Redis 有序集合实现滑动窗口
        const redisKey = `ratelimit:${key}`;

        // 移除窗口外的请求
        await this.redisService.zremrangebyscore(redisKey, 0, windowStart);

        // 计算当前窗口内的请求数
        const requestCount = await this.redisService.zcard(redisKey);

        if (requestCount >= config.max) {
          // 获取重试时间
          const oldestRequest = await this.redisService.zrange(redisKey, 0, 0, 'WITHSCORES');
          const retryAfter = Math.ceil((windowStart + config.windowMs - oldestRequest[1]) / 1000);

          res.set('X-RateLimit-Limit', config.max.toString());
          res.set('X-RateLimit-Remaining', '0');
          res.set('X-RateLimit-Reset', Math.ceil((windowStart + config.windowMs) / 1000).toString());
          res.set('Retry-After', retryAfter.toString());

          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: config.message,
              retryAfter,
            },
          });
        }

        // 添加当前请求
        await this.redisService.zadd(redisKey, now, `${now}-${Math.random()}`);
        await this.redisService.expire(redisKey, Math.ceil(config.windowMs / 1000));

        res.set('X-RateLimit-Limit', config.max.toString());
        res.set('X-RateLimit-Remaining', (config.max - requestCount - 1).toString());
        res.set('X-RateLimit-Reset', Math.ceil((windowStart + config.windowMs) / 1000).toString());

        next();
      } catch (error) {
        // Redis 故障时降级到内存限流
        console.error('Redis rate limiter error:', error);
        return fallbackRateLimiter(req, res, next);
      }
    };
  }

  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // 默认使用 IP
    return req.ip || 'unknown';
  }
}

// 预定义限流器
const rateLimiterService = new RateLimiterService();

// IP 限流（最严格）
export const ipRateLimiter = rateLimiterService.createLimiter({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 1000,
  message: 'IP 请求过于频繁',
});

// 认证限流（严格）
export const authRateLimiter = rateLimiterService.createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: '操作过于频繁，请 15 分钟后再试',
  keyGenerator: (req) => `auth:${req.ip}`,
});

// 验证码限流（最严格）
export const verificationCodeRateLimiter = rateLimiterService.createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: '验证码发送过于频繁',
  keyGenerator: (req) => `verify:${req.body.email || req.body.phone || req.ip}`,
});

// 用户限流（中等）
export const userRateLimiter = rateLimiterService.createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: '请求过于频繁',
  keyGenerator: (req) => `user:${(req as any).user?.id || req.ip}`,
});

// API 限流（宽松）
export const apiRateLimiter = rateLimiterService.createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: 'API 请求过于频繁',
});

/**
 * 内存限流（降级方案）
 */
const fallbackLimiters = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 60;

  const limiter = fallbackLimiters.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > limiter.resetTime) {
    limiter.count = 0;
    limiter.resetTime = now + windowMs;
  }

  limiter.count++;
  fallbackLimiters.set(ip, limiter);

  if (limiter.count > maxRequests) {
    return res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: '请求过于频繁' },
    });
  }

  next();
}
```

### 3.2 输入验证实现

```typescript
// src/backend/src/middleware/validation.ts

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * 验证请求体
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }
      next(error);
    }
  };
}

/**
 * 验证查询参数
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数验证失败',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }
      next(error);
    }
  };
}

/**
 * 验证路径参数
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '路径参数验证失败',
            details: error.errors.map((e) => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
        });
      }
      next(error);
    }
  };
}
```

### 3.3 CSRF 防护实现

```typescript
// src/backend/src/middleware/csrf.ts

import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// CSRF 保护中间件
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],  // 这些方法不需要 CSRF Token
});

/**
 * CSRF 错误处理
 */
export function handleCSRFError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF Token 无效，请刷新页面后重试',
      },
    });
  }
  next(err);
}

/**
 * 应用 CSRF 保护
 */
export function applyCSRFProtection(app: any) {
  // 对 API 路由应用 CSRF 保护
  app.use('/api/v1', csrfProtection);

  // CSRF 错误处理
  app.use(handleCSRFError);
}
```

---

## 4. 监控响应实现

### 4.1 审计日志实现

```typescript
// src/backend/src/services/audit-log.service.ts

import { prisma } from '../config/database';
import { RedisService } from '../services/redis.service';

interface AuditLogData {
  userId?: string;
  action: string;
  resource: string;
  method: string;
  path: string;
  requestBody?: any;
  responseBody?: any;
  statusCode: number;
  ip: string;
  userAgent: string;
  sessionId: string;
  deviceFingerprint?: string;
  riskScore?: number;
  anomalies?: string[];
}

class AuditLogService {
  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  /**
   * 记录审计日志
   */
  async log(data: AuditLogData): Promise<void> {
    const logEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      ...data,
      // 脱敏敏感数据
      requestBody: this.maskSensitiveData(data.requestBody),
      responseBody: this.maskSensitiveData(data.responseBody),
    };

    // 异步写入数据库
    this.writeToDatabase(logEntry).catch(console.error);

    // 同时写入 Redis 用于实时分析
    await this.writeToRedis(logEntry);

    // 检查是否需要告警
    await this.checkAlerts(logEntry);
  }

  /**
   * 脱敏敏感数据
   */
  private maskSensitiveData(data: any): any {
    if (!data) return data;

    const masked = { ...data };

    // 脱敏密码
    if (masked.password) masked.password = '***';
    if (masked.passwordHash) masked.passwordHash = '***';

    // 脱敏 Token
    if (masked.token) masked.token = '***';
    if (masked.accessToken) masked.accessToken = '***';
    if (masked.refreshToken) masked.refreshToken = '***';

    // 脱敏手机号
    if (masked.phone) {
      masked.phone = masked.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    return masked;
  }

  /**
   * 写入数据库
   */
  private async writeToDatabase(logEntry: any): Promise<void> {
    await prisma.auditLog.create({
      data: logEntry,
    });
  }

  /**
   * 写入 Redis
   */
  private async writeToRedis(logEntry: any): Promise<void> {
    const key = `audit:log:${new Date().toISOString().split('T')[0]}`;
    await this.redisService.lpush(key, JSON.stringify(logEntry));
    await this.redisService.expire(key, 180 * 24 * 60 * 60);  // 180 天
  }

  /**
   * 检查告警
   */
  private async checkAlerts(logEntry: any): Promise<void> {
    // 实现告警检查逻辑
    const alerts = [];

    // 检查登录失败
    if (logEntry.action === 'LOGIN_FAILED') {
      const failedCount = await this.getFailedLoginCount(logEntry.userId, logEntry.ip);
      if (failedCount >= 5) {
        alerts.push({
          type: 'BRUTE_FORCE',
          severity: 'high',
          message: `检测到暴力破解：${logEntry.ip}`,
        });
      }
    }

    // 发送告警
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async getFailedLoginCount(userId?: string, ip?: string): Promise<number> {
    const key = `login:attempts:${userId || ip}`;
    const count = await this.redisService.get(key);
    return parseInt(count || '0', 10);
  }

  private async sendAlert(alert: any): Promise<void> {
    // 实现告警发送逻辑
    console.log('Alert:', alert);
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const auditLogService = new AuditLogService();
```

### 4.2 安全事件检测实现

```typescript
// src/backend/src/services/security-monitor.service.ts

import { RedisService } from '../services/redis.service';

interface SecurityEvent {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ip?: string;
  details: any;
  timestamp: string;
}

class SecurityMonitorService {
  private redisService: RedisService;

  constructor() {
    this.redisService = RedisService.getInstance();
  }

  /**
   * 检测登录失败
   */
  async detectLoginFailure(userId: string, ip: string): Promise<void> {
    const key = `security:login:fail:${ip}`;
    const count = await this.redisService.incr(key);
    await this.redisService.expire(key, 15 * 60);  // 15 分钟窗口

    if (count >= 5) {
      await this.reportEvent({
        type: 'BRUTE_FORCE_DETECTED',
        severity: 'high',
        userId,
        ip,
        details: { failedAttempts: count },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 检测异地登录
   */
  async detectUnusualLocation(
    userId: string,
    currentIP: string,
    lastLocation: any
  ): Promise<void> {
    const currentLocation = await this.getIPLocation(currentIP);

    if (lastLocation && currentLocation) {
      const distance = this.calculateDistance(lastLocation, currentLocation);

      // 1 小时内移动超过 500 公里
      if (distance > 500) {
        await this.reportEvent({
          type: 'UNUSUAL_LOCATION',
          severity: 'medium',
          userId,
          ip: currentIP,
          details: {
            distance,
            lastLocation,
            currentLocation,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * 检测异常数据访问
   */
  async detectAbnormalDataAccess(userId: string, recordCount: number): Promise<void> {
    const threshold = 1000;  // 单次查询超过 1000 条记录

    if (recordCount > threshold) {
      await this.reportEvent({
        type: 'ABNORMAL_DATA_ACCESS',
        severity: 'medium',
        userId,
        details: {
          recordCount,
          threshold,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 报告安全事件
   */
  private async reportEvent(event: SecurityEvent): Promise<void> {
    // 存储到 Redis
    const key = `security:events:${new Date().toISOString().split('T')[0]}`;
    await this.redisService.lpush(key, JSON.stringify(event));

    // 发送告警
    await this.sendAlert(event);
  }

  /**
   * 发送告警
   */
  private async sendAlert(event: SecurityEvent): Promise<void> {
    // 根据严重程度选择告警渠道
    const channels = this.getAlertChannels(event.severity);

    for (const channel of channels) {
      await this.sendToChannel(channel, event);
    }
  }

  private getAlertChannels(severity: string): string[] {
    switch (severity) {
      case 'critical':
        return ['phone', 'sms', 'slack', 'email'];
      case 'high':
        return ['sms', 'slack', 'email'];
      case 'medium':
        return ['slack', 'email'];
      case 'low':
        return ['email'];
      default:
        return ['email'];
    }
  }

  private async sendToChannel(channel: string, event: SecurityEvent): Promise<void> {
    // 实现发送逻辑
    console.log(`Sending alert to ${channel}:`, event);
  }

  private async getIPLocation(ip: string): Promise<any> {
    // 实现 IP 地理位置查询
    return null;
  }

  private calculateDistance(loc1: any, loc2: any): number {
    // 实现距离计算
    return 0;
  }
}

export const securityMonitorService = new SecurityMonitorService();
```

---

## 5. 测试方法

### 5.1 单元测试

```typescript
// tests/unit/jwt.test.ts

import { jwtService } from '../../src/utils/jwt';

describe('JWT Service', () => {
  test('should generate valid tokens', () => {
    const tokens = jwtService.generateTokens({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(900);
  });

  test('should verify valid access token', async () => {
    const tokens = jwtService.generateTokens({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    const payload = await jwtService.verifyAccessToken(tokens.accessToken);
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('test@example.com');
  });

  test('should reject expired token', async () => {
    // 使用 mock 过期时间
    jest.useFakeTimers();

    const tokens = jwtService.generateTokens({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    // 快进 16 分钟（超过 15 分钟有效期）
    jest.advanceTimersByTime(16 * 60 * 1000);

    await expect(jwtService.verifyAccessToken(tokens.accessToken))
      .rejects.toThrow('Access token expired');

    jest.useRealTimers();
  });

  test('should rotate refresh token', async () => {
    const tokens = jwtService.generateTokens({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    const newTokens = await jwtService.refreshTokens(tokens.refreshToken);

    expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    expect(newTokens.refreshToken).not.toBe(tokens.refreshToken);
  });

  test('should detect token reuse', async () => {
    const tokens = jwtService.generateTokens({
      sub: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    // 第一次刷新
    await jwtService.refreshTokens(tokens.refreshToken);

    // 第二次使用同一 Token（应该失败）
    await expect(jwtService.refreshTokens(tokens.refreshToken))
      .rejects.toThrow('Refresh token reused');
  });
});
```

### 5.2 集成测试

```typescript
// tests/integration/auth.test.ts

import request from 'supertest';
import { app } from '../../src/app';

describe('Authentication API', () => {
  describe('POST /api/v1/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'ValidPass123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    test('should lock account after 5 failed attempts', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      // 5 次失败登录
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send(credentials);
      }

      // 第 6 次应该被锁定
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(credentials);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });

    test('should require MFA when enabled', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'mfa-user@example.com',
          password: 'ValidPass123!',
        });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('MFA_REQUIRED');
    });
  });

  describe('Rate Limiting', () => {
    test('should rate limit authentication endpoints', async () => {
      // 发送 11 次请求（超过 10 次限制）
      for (let i = 0; i < 11; i++) {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrong',
          });

        if (i >= 10) {
          expect(response.status).toBe(429);
          expect(response.body.error.code).toBe('RATE_LIMITED');
        }
      }
    });
  });
});
```

### 5.3 安全测试

```typescript
// tests/security/security.test.ts

import request from 'supertest';
import { app } from '../../src/app';

describe('Security Tests', () => {
  describe('Input Validation', () => {
    test('should reject SQL injection attempt', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: "test@example.com' OR '1'='1",
          password: 'password',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject XSS attempt', async () => {
      const token = await getValidToken();

      const response = await request(app)
        .post('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '<script>alert("XSS")</script>',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    test('should prevent horizontal privilege escalation', async () => {
      const user1Token = await getTokenForUser('user1@example.com');
      const user2Id = getUserIdForEmail('user2@example.com');

      const response = await request(app)
        .get(`/api/v1/users/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    test('should prevent vertical privilege escalation', async () => {
      const userToken = await getTokenForUser('user@example.com');

      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Data Masking', () => {
    test('should mask sensitive data in response', async () => {
      const token = await getValidToken();

      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.phone).toMatch(/^\d{3}\*\*\*\d{4}$/);
      expect(response.body.data.email).toMatch(/^[a-z]\*\*.*@/);
    });
  });
});

async function getValidToken(): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test@example.com',
      password: 'ValidPass123!',
    });

  return response.body.data.accessToken;
}

async function getTokenForUser(email: string): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email,
      password: 'ValidPass123!',
    });

  return response.body.data.accessToken;
}

function getUserIdForEmail(email: string): string {
  // 实现获取用户 ID 逻辑
  return 'user-id';
}
```

---

## 6. 部署检查清单

### 6.1 环境变量检查

```bash
# 安全检查清单

# JWT 配置
[ ] JWT_SECRET 已设置且长度 >= 32
[ ] JWT_REFRESH_SECRET 已设置
[ ] JWT_ACCESS_EXPIRATION = 900 (15 分钟)
[ ] JWT_REFRESH_EXPIRATION = 604800 (7 天)

# 加密配置
[ ] ENCRYPTION_KEY 已设置
[ ] BCRYPT_ROUNDS = 12

# MFA 配置
[ ] MFA_ISSUER 已设置
[ ] MFA_WINDOW = 1

# 账户锁定配置
[ ] MAX_LOGIN_ATTEMPTS = 5
[ ] LOCK_DURATION = 15 (分钟)

# Session 配置
[ ] SESSION_MAX_CONCURRENT = 5
[ ] SESSION_TIMEOUT = 900

# 数据库配置
[ ] 生产环境已关闭 query 日志
[ ] RLS 策略已启用

# Redis 配置
[ ] Redis 密码已设置
[ ] Redis 连接使用 TLS

# 监控配置
[ ] Sentry DSN 已设置
[ ] 日志级别 = warn/error
```

### 6.2 安全配置检查

```bash
# HTTPS 检查
[ ] 生产环境强制 HTTPS
[ ] TLS 1.3 已启用
[ ] HSTS 头已配置

# 安全头检查
[ ] Content-Security-Policy 已配置
[ ] X-Frame-Options 已配置
[ ] X-Content-Type-Options 已配置
[ ] X-XSS-Protection 已配置
[ ] Strict-Transport-Security 已配置

# CORS 检查
[ ] 只允许信任的域名
[ ] credentials = true
[ ] 预检请求缓存已配置

# 限流检查
[ ] IP 限流已启用
[ ] 认证限流已启用
[ ] API 限流已启用

# 日志检查
[ ] 敏感数据已脱敏
[ ] 审计日志已启用
[ ] 日志保留策略已配置
```

### 6.3 渗透测试清单

```bash
# 认证测试
[ ] 暴力破解测试
[ ] Token 重放测试
[ ] Session 固定测试
[ ] JWT 篡改测试

# 授权测试
[ ] 水平越权测试
[ ] 垂直越权测试
[ ] 条件竞争测试

# 输入验证测试
[ ] SQL 注入测试
[ ] XSS 测试
[ ] CSRF 测试
[ ] 命令注入测试

# 数据保护测试
[ ] 敏感数据泄露测试
[ ] 数据脱敏验证
[ ] 加密验证
```

---

## 附录

### A. 快速参考

| 配置项 | 推荐值 | 说明 |
|-------|-------|------|
| JWT_ACCESS_EXPIRATION | 900s | 15 分钟 |
| JWT_REFRESH_EXPIRATION | 604800s | 7 天 |
| BCRYPT_ROUNDS | 12 | 密码加密强度 |
| MAX_LOGIN_ATTEMPTS | 5 | 登录失败锁定阈值 |
| LOCK_DURATION | 15m | 账户锁定时间 |
| SESSION_MAX_CONCURRENT | 5 | 最大并发 Session |

### B. 故障排除

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| Token 验证失败 | 密钥不匹配 | 检查 JWT_SECRET 配置 |
| 限流不生效 | Redis 连接失败 | 检查 Redis 配置和连接 |
| MFA 验证失败 | 时间不同步 | 同步服务器时间 |
| 加密失败 | 密钥格式错误 | 检查 ENCRYPTION_KEY 格式 |

### C. 相关文档

- [SECURITY_ARCHITECTURE_V2.md](./SECURITY_ARCHITECTURE_V2.md) - 安全架构设计
- [SECURITY_AUDIT_REPORT.md](./SECURITY_AUDIT_REPORT.md) - 安全审计报告
- [SECURITY_BEST_PRACTICES.md](./SECURITY_BEST_PRACTICES.md) - 安全最佳实践

---

*本文件为 AIAds 内部机密文档，未经授权不得外传*
