# AIAds 安全修复建议清单

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**优先级**: 按高/中/低分类
**状态跟踪**: 待修复/修复中/已修复

---

## 高优先级（立即修复）

### H01 - 默认 JWT 密钥配置

**问题描述**:
代码中存在默认 JWT 密钥，如果生产环境未配置环境变量，将使用不安全的默认值。

**风险等级**: 🔴 高危

**影响范围**:
- `/src/backend/src/utils/crypto.ts` - JWT 签名密钥
- `/src/backend/src/utils/crypto.ts` - Refresh Token 密钥

**当前代码**:
```typescript
// ❌ 危险：默认密钥
const secret = type === 'access'
  ? process.env.JWT_SECRET || 'default-secret-key'
  : process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default-secret-key';
```

**修复方案**:
```typescript
// ✅ 修复：强制要求环境变量
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long');
}

const refreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;
if (!refreshSecret || refreshSecret.length < 32) {
  throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long');
}
```

**修复步骤**:
1. 修改 `src/backend/src/utils/crypto.ts`
2. 在应用启动时检查密钥配置
3. 更新 `.env.example` 说明
4. 生产环境配置强随机密钥

**验收标准**:
- [ ] 缺少 JWT_SECRET 时应用无法启动
- [ ] 密钥长度小于 32 字符时抛出错误
- [ ] 文档中说明密钥生成方法

---

### H02 - 敏感数据未脱敏

**问题描述**:
API 响应中返回完整的手机号、邮箱等敏感信息，存在隐私泄露风险。

**风险等级**: 🔴 高危

**影响范围**:
- `/src/backend/src/controllers/auth.controller.ts` - me 接口
- `/src/backend/src/controllers/users.controller.ts` - 用户查询接口

**当前代码**:
```typescript
// ❌ 返回完整敏感信息
me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,      // ❌ 完整邮箱
      phone: true,      // ❌ 完整手机号
      // ...
    },
  });
  
  const response: ApiResponse = {
    success: true,
    data: {
      email: user.email,    // ❌ 未脱敏
      phone: user.phone,    // ❌ 未脱敏
      // ...
    },
  };
});
```

**修复方案**:
```typescript
// ✅ 添加脱敏工具函数
// src/backend/src/utils/helpers.ts
export function maskEmail(email: string): string {
  if (!email) return '';
  const [username, domain] = email.split('@');
  if (username.length <= 2) {
    return `**@${domain}`;
  }
  const masked = username[0] + '*'.repeat(username.length - 2) + username[username.length - 1];
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return '';
  // 保留前 3 位和后 4 位
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// ✅ 在 Controller 中使用
const response: ApiResponse = {
  success: true,
  data: {
    email: maskEmail(user.email),
    phone: maskPhone(user.phone),
    // ...
  },
};
```

**修复步骤**:
1. 创建脱敏工具函数 `src/backend/src/utils/helpers.ts`
2. 修改所有返回用户信息的接口
3. 对于需要完整信息的场景（如用户设置页面），添加单独接口

**验收标准**:
- [ ] 所有 API 响应中的手机号已脱敏
- [ ] 所有 API 响应中的邮箱已脱敏
- [ ] 提供获取完整信息的授权接口

---

### H03 - 缺少 CSRF 防护

**问题描述**:
状态变更接口（POST/PUT/DELETE）未配置 CSRF Token 验证，存在跨站请求伪造风险。

**风险等级**: 🔴 高危

**影响范围**:
- 所有状态变更接口
- 前端 API 调用

**修复方案**:

**后端实现**:
```typescript
// 1. 安装依赖
// npm install csurf

// 2. 配置中间件 src/backend/src/app.ts
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// 3. 对需要 CSRF 保护的路由使用中间件
app.use('/api/v1', csrfProtection);

// 4. 错误处理
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF Token 无效',
      },
    });
  }
  next(err);
});
```

**前端实现**:
```typescript
// src/frontend/src/services/api.ts
import Cookies from 'js-cookie';

// 请求拦截器添加 CSRF Token
api.interceptors.request.use((config) => {
  const csrfToken = Cookies.get('XSRF-TOKEN');
  if (csrfToken) {
    config.headers['X-CSRF-TOKEN'] = csrfToken;
  }
  return config;
});
```

**修复步骤**:
1. 安装 csurf 和 js-cookie
2. 配置后端 CSRF 中间件
3. 前端添加 Token 提取和发送逻辑
4. 测试所有状态变更接口

**验收标准**:
- [ ] POST/PUT/DELETE 请求需要 CSRF Token
- [ ] 缺少或错误的 CSRF Token 返回 403
- [ ] GET 请求不需要 CSRF Token

---

### H04 - HTTP 默认配置

**问题描述**:
API 客户端默认使用 HTTP 协议，生产环境应强制使用 HTTPS。

**风险等级**: 🔴 高危

**影响范围**:
- `/src/frontend/src/services/api.ts`

**当前代码**:
```typescript
// ❌ 默认 HTTP
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
```

**修复方案**:
```typescript
// ✅ 根据环境判断
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  isDevelopment 
    ? 'http://localhost:8080/api/v1'
    : 'https://api.aiads.com/api/v1'  // 生产环境强制 HTTPS
);

// ✅ 生产环境检查
if (!isDevelopment && !API_BASE_URL.startsWith('https://')) {
  console.warn('Production API should use HTTPS');
}
```

**修复步骤**:
1. 修改 `src/frontend/src/services/api.ts`
2. 配置生产环境变量 `VITE_API_URL`
3. 添加 HTTPS 检查警告

**验收标准**:
- [ ] 生产环境构建使用 HTTPS
- [ ] 开发环境可使用 HTTP
- [ ] 非 HTTPS 配置有警告提示

---

### H05 - 验证码明文日志

**问题描述**:
开发环境日志中打印明文验证码，可能泄露到生产环境。

**风险等级**: 🔴 高危

**影响范围**:
- `/src/backend/src/services/auth.service.ts`

**当前代码**:
```typescript
// ❌ 生产环境不应打印验证码
logger.info(`Verification code (DEV): ${code}`);
```

**修复方案**:
```typescript
// ✅ 仅在开发环境打印
if (process.env.NODE_ENV === 'development') {
  logger.info(`Verification code (DEV ONLY): ${code}`);
} else {
  logger.info('Verification code sent', { type, target, purpose });
}
```

**修复步骤**:
1. 修改 `src/backend/src/services/auth.service.ts`
2. 移除所有生产环境的敏感信息日志
3. 审查其他日志输出

**验收标准**:
- [ ] 生产环境日志不包含验证码
- [ ] 开发环境验证码仅用于测试
- [ ] 日志中无其他敏感信息

---

## 中优先级（本周修复）

### M01 - bcrypt cost 过低

**问题描述**:
当前 bcrypt cost factor 为 10，建议提升至 12 以增强密码安全性。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/backend/src/utils/crypto.ts`

**当前代码**:
```typescript
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;  // ⚠️ 建议 12
  return bcrypt.hash(password, saltRounds);
}
```

**修复方案**:
```typescript
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
  return bcrypt.hash(password, saltRounds);
}
```

**修复步骤**:
1. 修改 `src/backend/src/utils/crypto.ts`
2. 添加环境变量 `BCRYPT_ROUNDS`
3. 更新 `.env.example`

**验收标准**:
- [ ] 默认 cost factor 为 12
- [ ] 可通过环境变量配置
- [ ] 性能测试通过

---

### M02 - 无账户锁定策略

**问题描述**:
虽然记录了登录失败次数，但未实现账户自动锁定机制。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/backend/src/services/auth.service.ts`

**修复方案**:
```typescript
// src/backend/src/services/auth.service.ts
async login(data: LoginRequest): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  
  if (!user) {
    throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
  }
  
  // ✅ 检查账户是否已锁定
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const unlockTime = new Date(user.lockedUntil).toLocaleString('zh-CN');
    throw new ApiError(`账户已锁定，请于${unlockTime}后重试`, 403, 'ACCOUNT_LOCKED');
  }
  
  const isValidPassword = await verifyPassword(data.password, user.passwordHash);
  
  if (!isValidPassword) {
    const failedAttempts = user.failedLoginAttempts + 1;
    
    // ✅ 连续失败 5 次锁定账户 15 分钟
    if (failedAttempts >= 5) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000),  // 15 分钟
        },
      });
      throw new ApiError('密码错误次数过多，账户已锁定 15 分钟', 403, 'ACCOUNT_LOCKED');
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: failedAttempts },
    });
    
    throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
  }
  
  // ✅ 登录成功，重置失败次数和锁定
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });
  
  // ... 生成 Token
}
```

**修复步骤**:
1. 修改登录逻辑添加账户锁定
2. 数据库添加 `locked_until` 字段（已有）
3. 添加账户解锁接口（管理员）

**验收标准**:
- [ ] 连续失败 5 次锁定 15 分钟
- [ ] 锁定期间无法登录
- [ ] 锁定时间过后自动解锁
- [ ] 登录成功重置失败计数

---

### M03 - Refresh Token 无轮换

**问题描述**:
Refresh Token 可重复使用，存在 Token 劫持风险。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/backend/src/services/auth.service.ts`

**修复方案**:
```typescript
// src/backend/src/services/auth.service.ts
async refreshToken(refreshToken: string): Promise<TokenPair> {
  const payload = verifyToken(refreshToken, 'refresh');
  
  // ✅ 检查 Token 是否在黑名单（防止重放）
  const isBlacklisted = await cacheService.exists(`blacklist:${payload.jti}`);
  if (isBlacklisted) {
    // 检测到重放攻击，吊销用户所有 Token
    await this.revokeAllUserTokens(payload.sub);
    throw new ApiError('Refresh Token 已被使用，请重新登录', 401, 'TOKEN_REUSED');
  }
  
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
  });
  
  if (!user) {
    throw new ApiError('用户不存在', 401, 'USER_NOT_FOUND');
  }
  
  // ✅ 生成新 Token 对
  const newTokens = generateTokens({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  
  // ✅ 将旧 Token 加入黑名单
  const exp = payload.exp ? payload.exp * 1000 - Date.now() : 604800000;
  if (exp > 0) {
    await cacheService.set(`blacklist:${payload.jti}`, '1', Math.ceil(exp / 1000));
  }
  
  return newTokens;
}

async revokeAllUserTokens(userId: string): Promise<void> {
  // 将所有该用户的 Token 加入黑名单
  // 实际实现需要记录用户的所有活跃 Token
  logger.warn('All user tokens revoked', { userId });
}
```

**修复步骤**:
1. 修改 Refresh Token 逻辑实现轮换
2. 添加 Token 重放检测
3. 添加 Token 吊销机制

**验收标准**:
- [ ] 每次刷新生成新 Refresh Token
- [ ] 旧 Refresh Token 立即失效
- [ ] 重复使用旧 Token 触发安全警报

---

### M04 - 限流故障时放行

**问题描述**:
Redis 限流在 Redis 故障时直接放行请求，可能被利用进行 DDoS 攻击。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/backend/src/middleware/rateLimiter.ts`

**当前代码**:
```typescript
} catch (error) {
  logger.error('Redis rate limiter error', { error });
  next();  // ❌ Redis 故障时放行
}
```

**修复方案**:
```typescript
} catch (error) {
  logger.error('Redis rate limiter error', { error });
  
  // ✅ 降级到内存限流
  return fallbackRateLimiter(req, res, next);
}

// ✅ 内存限流作为后备
const fallbackLimiters = new Map<string, { count: number; resetTime: number }>();

function fallbackRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60000;  // 1 分钟
  const maxRequests = 60;
  
  const limiter = fallbackLimiters.get(ip) || { count: 0, resetTime: now + windowMs };
  
  if (now > limiter.resetTime) {
    limiter.count = 0;
    limiter.resetTime = now + windowMs;
  }
  
  limiter.count++;
  fallbackLimiters.set(ip, limiter);
  
  if (limiter.count > maxRequests) {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message: '请求过于频繁' },
    });
    return;
  }
  
  next();
}
```

**修复步骤**:
1. 修改 Redis 限流中间件添加降级逻辑
2. 实现内存限流作为后备
3. 测试 Redis 故障场景

**验收标准**:
- [ ] Redis 故障时自动降级到内存限流
- [ ] 降级后仍有限流保护
- [ ] 日志记录降级事件

---

### M05 - 日志缺少审计信息

**问题描述**:
日志未包含足够的审计信息（如用户 ID、IP），不利于安全事件溯源。

**风险等级**: 🟡 中危

**影响范围**:
- 所有日志记录点

**修复方案**:
```typescript
// src/backend/src/utils/logger.ts
import { logger } from './logger';

// ✅ 创建请求上下文
interface LogContext {
  requestId: string;
  userId?: string;
  userIp?: string;
  [key: string]: any;
}

// ✅ 统一日志方法
export function logInfo(message: string, context: LogContext) {
  logger.info(message, {
    requestId: context.requestId,
    userId: context.userId,
    userIp: context.userIp,
    timestamp: new Date().toISOString(),
    ...context,
  });
}

// ✅ 在中间件中添加上下文
export function addRequestLogger(req: Request, res: Response, next: NextFunction) {
  (req as any).logger = {
    info: (msg: string, ctx: any) => logInfo(msg, {
      requestId: (req as any).requestId,
      userId: req.user?.id,
      userIp: req.ip,
      ...ctx,
    }),
    error: (msg: string, ctx: any) => logger.error(msg, {
      requestId: (req as any).requestId,
      userId: req.user?.id,
      userIp: req.ip,
      ...ctx,
    }),
  };
  next();
}
```

**修复步骤**:
1. 创建请求上下文工具
2. 在所有日志记录点添加上下文
3. 配置日志收集系统

**验收标准**:
- [ ] 所有日志包含 requestId
- [ ] 认证请求日志包含 userId
- [ ] 所有日志包含 userIp

---

### M06 - Token 存储 localStorage

**问题描述**:
前端使用 localStorage 存储 Token，存在 XSS 攻击风险。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/frontend/src/services/api.ts`
- `/src/frontend/src/stores/authStore.ts`

**修复方案**:

**方案 A: httpOnly Cookie（推荐）**
```typescript
// 后端设置
res.cookie('accessToken', accessToken, {
  httpOnly: true,  // 前端不可访问
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000,  // 1 小时
});

// 前端无需手动添加 Token，浏览器自动携带
```

**方案 B: 内存存储（当前可接受）**
```typescript
// src/frontend/src/stores/authStore.ts
class AuthStore {
  private accessToken: string | null = null;  // 内存存储
  
  setToken(token: string) {
    this.accessToken = token;
    // 不存储到 localStorage
  }
  
  getToken(): string | null {
    return this.accessToken;
  }
}
```

**修复步骤**:
1. 评估使用 httpOnly Cookie 方案
2. 如使用 Cookie，修改后端设置逻辑
3. 修改前端 Token 获取方式

**验收标准**:
- [ ] Token 不存储在 localStorage
- [ ] XSS 攻击无法窃取 Token
- [ ] 刷新页面后需重新认证（内存方案）

---

### M07 - 无 MFA 支持

**问题描述**:
仅使用密码认证，缺少双因素认证（MFA）支持。

**风险等级**: 🟡 中危

**影响范围**:
- 认证模块

**修复方案**:
```typescript
// 1. 数据库添加字段
// ALTER TABLE users ADD COLUMN mfa_enabled BOOLEAN DEFAULT FALSE;
// ALTER TABLE users ADD COLUMN mfa_secret VARCHAR(255);

// 2. 生成 MFA 密钥
import { authenticator } from 'otplib';

async enableMFA(userId: string) {
  const secret = authenticator.generateSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { mfaEnabled: false, mfaSecret: secret },  // 先存储但不启用
  });
  
  // 生成二维码 URL
  const otpauth = authenticator.keyuri(userId, 'AIAds', secret);
  return { secret, otpauth };
}

// 3. 验证 MFA 代码
async verifyMFA(userId: string, token: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mfaSecret: true, mfaEnabled: true },
  });
  
  if (!user.mfaEnabled || !user.mfaSecret) {
    throw new Error('MFA 未启用');
  }
  
  const isValid = authenticator.verify({
    token,
    secret: user.mfaSecret,
  });
  
  if (!isValid) {
    throw new Error('MFA 代码无效');
  }
  
  return true;
}

// 4. 登录时检查 MFA
async login(data: LoginRequest, mfaToken?: string) {
  // ... 验证密码
  
  if (user.mfaEnabled) {
    if (!mfaToken) {
      throw new ApiError('需要 MFA 验证码', 401, 'MFA_REQUIRED');
    }
    await this.verifyMFA(user.id, mfaToken);
  }
  
  // ... 生成 JWT
}
```

**修复步骤**:
1. 数据库添加 MFA 字段
2. 实现 MFA 启用/禁用接口
3. 实现 MFA 验证接口
4. 修改登录流程支持 MFA

**验收标准**:
- [ ] 用户可启用/禁用 MFA
- [ ] 启用 MFA 后登录需要验证码
- [ ] 支持备用验证码（恢复代码）

---

### M08 - 数据库查询日志

**问题描述**:
生产环境开启查询日志，可能泄露敏感数据。

**风险等级**: 🟡 中危

**影响范围**:
- `/src/backend/src/config/database.ts`

**当前代码**:
```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },  // ❌ 生产环境应关闭
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});
```

**修复方案**:
```typescript
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production'
    ? [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ]
    : [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
});
```

**修复步骤**:
1. 修改数据库配置
2. 生产环境关闭 query 日志
3. 如需要慢查询日志，添加阈值过滤

**验收标准**:
- [ ] 生产环境不记录查询日志
- [ ] 开发环境保留查询日志
- [ ] 可配置慢查询日志

---

## 低优先级（后续迭代）

### L01 - 缺少 WAF 配置

**问题描述**: 未配置 Web 应用防火墙规则
**建议**: 使用 Cloudflare WAF 或 AWS WAF
**工作量**: 2 天

### L02 - 无密钥轮换机制

**问题描述**: 密钥长期不变，泄露风险高
**建议**: 实现密钥定期轮换（90 天）
**工作量**: 3 天

### L03 - 缺少备份策略

**问题描述**: 文档未提及数据库备份
**建议**: 配置每日自动备份
**工作量**: 1 天

### L04 - 无应急预案

**问题描述**: 缺少安全事件应急预案
**建议**: 编写应急预案文档
**工作量**: 2 天

### L05 - 监控告警不完善

**问题描述**: 配置了 Sentry 但无安全事件告警
**建议**: 配置安全事件告警规则
**工作量**: 2 天

### L06 - 依赖漏洞未知

**问题描述**: 未定期扫描依赖漏洞
**建议**: CI/CD 集成 npm audit
**工作量**: 0.5 天

### L07 - 请求超时过长

**问题描述**: API 超时 30 秒，可能被用于 DoS
**建议**: 缩短至 10 秒
**工作量**: 0.5 天

### L08 - 无请求签名

**问题描述**: 请求可被篡改
**建议**: 实现请求签名机制
**工作量**: 3 天

### L09 - CORS 配置宽松

**问题描述**: 允许所有子域名
**建议**: 限制具体子域名
**工作量**: 0.5 天

### L10 - 缺少 CSP 配置

**问题描述**: 未配置 Content-Security-Policy
**建议**: 配置 CSP 头
**工作量**: 1 天

### L11 - 安全头不完善

**问题描述**: Helmet 配置不完整
**建议**: 完善所有安全头
**工作量**: 1 天

### L12 - 文档不完善

**问题描述**: 安全配置文档缺失
**建议**: 完善安全配置文档
**工作量**: 2 天

---

## 修复进度跟踪

| 编号 | 问题 | 优先级 | 状态 | 负责人 | 预计完成 | 实际完成 |
|-----|------|--------|------|--------|---------|---------|
| H01 | 默认 JWT 密钥 | 高 | 待修复 | - | - | - |
| H02 | 敏感数据未脱敏 | 高 | 待修复 | - | - | - |
| H03 | 缺少 CSRF 防护 | 高 | 待修复 | - | - | - |
| H04 | HTTP 默认配置 | 高 | 待修复 | - | - | - |
| H05 | 验证码明文日志 | 高 | 待修复 | - | - | - |
| M01 | bcrypt cost 过低 | 中 | 待修复 | - | - | - |
| M02 | 无账户锁定策略 | 中 | 待修复 | - | - | - |
| M03 | Refresh Token 无轮换 | 中 | 待修复 | - | - | - |
| M04 | 限流故障时放行 | 中 | 待修复 | - | - | - |
| M05 | 日志缺少审计信息 | 中 | 待修复 | - | - | - |
| M06 | Token 存储 localStorage | 中 | 待修复 | - | - | - |
| M07 | 无 MFA 支持 | 中 | 待修复 | - | - | - |
| M08 | 数据库查询日志 | 中 | 待修复 | - | - | - |

---

*此文档应定期更新，修复完成后及时标记状态*
