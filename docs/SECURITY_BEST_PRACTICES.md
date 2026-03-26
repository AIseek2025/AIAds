# AIAds 安全最佳实践指南

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**适用对象**: 全体开发人员
**保密级别**: 内部公开

---

## 目录

1. [密码安全](#1-密码安全)
2. [Token 安全](#2-token 安全)
3. [API 安全](#3-api 安全)
4. [数据安全](#4-数据安全)
5. [前端安全](#5-前端安全)
6. [日志与监控](#6-日志与监控)
7. [部署安全](#7-部署安全)
8. [应急响应](#8-应急响应)

---

## 1. 密码安全

### 1.1 密码策略

**最低要求**:
- ✅ 最小长度：8 位（建议 12 位）
- ✅ 包含大写字母 (A-Z)
- ✅ 包含小写字母 (a-z)
- ✅ 包含数字 (0-9)
- ✅ 包含特殊字符 (!@#$%^&*)

**代码实现**:
```typescript
// src/backend/src/utils/validator.ts
export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 位')
  .max(50, '密码长度不能超过 50 个字符')
  .regex(/[A-Z]/, '密码必须包含大写字母')
  .regex(/[a-z]/, '密码必须包含小写字母')
  .regex(/[0-9]/, '密码必须包含数字')
  .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符');
```

### 1.2 密码加密

**bcrypt 配置**:
```typescript
// ✅ 推荐配置
const saltRounds = 12;  // 生产环境建议使用 12 或更高
return bcrypt.hash(password, saltRounds);
```

**注意事项**:
- ⚠️ cost factor 每增加 1，计算时间翻倍
- ⚠️ 开发环境可使用 10 以加快测试
- ⚠️ 生产环境必须使用 12 或更高

### 1.3 密码存储

**禁止行为**:
- ❌ 明文存储密码
- ❌ 使用 MD5/SHA1 等弱哈希
- ❌ 在日志中记录密码
- ❌ 通过邮件发送密码

**正确做法**:
```typescript
// ✅ 密码验证
const isValid = await verifyPassword(plainPassword, hashedPassword);
if (!isValid) {
  // 记录失败尝试，但不记录密码
  logger.warn('Password verification failed', { userId, attempt });
}
```

---

## 2. Token 安全

### 2.1 JWT 配置

**推荐配置**:
```typescript
// ✅ Access Token: 1 小时
const accessTokenExpiresIn = 3600;

// ✅ Refresh Token: 7 天
const refreshTokenExpiresIn = 604800;

// ✅ 使用 HS256 或 RS256 算法
const algorithm = 'HS256';

// ✅ 强密钥（至少 32 字符）
const JWT_SECRET = crypto.randomBytes(32).toString('hex');
```

### 2.2 Token 存储

**前端存储方案对比**:

| 方案 | 优点 | 缺点 | 推荐场景 |
|-----|------|------|---------|
| localStorage | 简单 | XSS 风险 | 内部系统 |
| sessionStorage | 会话级 | XSS 风险 | 临时操作 |
| httpOnly Cookie | 防 XSS | CSRF 风险 | 高安全系统 |
| Memory | 最安全 | 刷新丢失 | Access Token |

**推荐实践**:
```typescript
// ✅ Access Token 存内存（刷新丢失可接受）
let accessToken = null;

// ✅ Refresh Token 存 httpOnly Cookie（需后端配合）
// Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict
```

### 2.3 Token 轮换

**Refresh Token 轮换机制**:
```typescript
// ✅ 每次刷新时生成新的 Refresh Token
async refreshToken(oldRefreshToken: string) {
  // 1. 验证旧 Token
  const payload = verifyToken(oldRefreshToken, 'refresh');
  
  // 2. 检查是否在黑名单（防止重放）
  const isBlacklisted = await isTokenBlacklisted(oldRefreshToken);
  if (isBlacklisted) {
    // 检测到重放攻击，吊销用户所有 Token
    await revokeAllUserTokens(payload.sub);
    throw new Error('Refresh Token reused');
  }
  
  // 3. 生成新 Token 对
  const newTokens = generateTokens(payload);
  
  // 4. 将旧 Token 加入黑名单
  await blacklistToken(oldRefreshToken);
  
  return newTokens;
}
```

### 2.4 Token 黑名单

**实现方式**:
```typescript
// ✅ 使用 Redis 实现 Token 黑名单
async logout(userId: string, token: string) {
  const decoded = verifyToken(token, 'access');
  const jti = decoded.jti;
  const exp = decoded.exp;
  
  // 计算剩余有效期
  const ttl = exp * 1000 - Date.now();
  
  if (ttl > 0) {
    // 在 Redis 中存储至 Token 过期
    await redis.setex(`blacklist:${jti}`, Math.ceil(ttl / 1000), '1');
  }
}
```

---

## 3. API 安全

### 3.1 认证要求

**所有 API 必须认证**:
```typescript
// ✅ 使用 auth 中间件
router.get('/users/me', auth(), userController.me);

// ✅ 需要特定角色
router.get('/admin/users', auth({ allowedRoles: ['admin'] }), adminController.listUsers);

// ✅ 需要邮箱验证
router.post('/orders', auth({ requireVerified: true }), orderController.create);
```

**例外情况（公开 API）**:
- 用户注册 `/auth/register`
- 用户登录 `/auth/login`
- 发送验证码 `/auth/verification-code`
- 健康检查 `/health`

### 3.2 限流配置

**推荐配置**:
```typescript
// ✅ 认证接口：严格限流
strictRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 10,  // 10 次请求
  message: '操作过于频繁，请 15 分钟后再试',
});

// ✅ 普通 API：中等限流
moderateRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 分钟
  max: 30,  // 30 次请求
});

// ✅ 公开 API：宽松限流
lightRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,  // 1 分钟
  max: 60,  // 60 次请求
});
```

**验证码限流**:
```typescript
// ✅ 验证码：5 分钟最多 5 次
actionRateLimiter('send_code', 5, 300);
```

### 3.3 CORS 配置

**生产环境配置**:
```typescript
// ✅ 严格 CORS 配置
app.use(cors({
  origin: [
    'https://aiads.com',
    'https://www.aiads.com',
    'https://admin.aiads.com',
  ],  // 明确允许的域名
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Request-ID'],
  maxAge: 86400,  // 预检请求缓存 24 小时
}));
```

### 3.4 错误处理

**错误响应规范**:
```typescript
// ✅ 统一错误格式
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      { "field": "email", "message": "邮箱格式不正确" }
    ]
  },
  "request_id": "req_123456789"
}
```

**生产环境错误信息**:
```typescript
// ✅ 不暴露内部错误细节
if (process.env.NODE_ENV === 'production' && statusCode === 500) {
  response.error.message = '服务器内部错误';
  // 不返回堆栈跟踪
}
```

---

## 4. 数据安全

### 4.1 数据加密

**传输加密**:
- ✅ 生产环境强制 HTTPS
- ✅ 使用 TLS 1.2 或更高版本
- ✅ 配置 HSTS 头

**存储加密**:
```typescript
// ✅ 密码加密
const hash = await bcrypt.hash(password, 12);

// ✅ 敏感数据加密（如身份证号）
import { createCipheriv, randomBytes } from 'crypto';

function encryptSensitiveData(data: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}
```

### 4.2 数据脱敏

**API 响应脱敏**:
```typescript
// ✅ 手机号脱敏
function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

// ✅ 邮箱脱敏
function maskEmail(email: string): string {
  const [username, domain] = email.split('@');
  const masked = username.replace(/.(?=.)|(?<=.)/g, '*');
  return `${masked}@${domain}`;
}

// ✅ 身份证号脱敏
function maskIdCard(idCard: string): string {
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
}
```

### 4.3 数据库安全

**Prisma 使用规范**:
```typescript
// ✅ 使用参数化查询（Prisma 默认）
const user = await prisma.user.findUnique({
  where: { email: userInput },  // 自动参数化
});

// ❌ 避免原始查询
const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;

// ✅ 如必须使用原始查询，使用参数化
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;  // Prisma 会参数化
```

**数据库权限**:
- ✅ 应用使用只读账号查询
- ✅ 写操作使用单独账号
- ✅ 禁止使用 root/sa 账号

---

## 5. 前端安全

### 5.1 XSS 防护

**React 自动防护**:
```typescript
// ✅ React 自动转义
<div>{userInput}</div>  // 安全

// ❌ 避免使用 dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />  // 危险！

// ✅ 如必须使用，先清理 HTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### 5.2 CSRF 防护

**双重 Cookie 验证**:
```typescript
// ✅ 后端设置 CSRF Token
res.cookie('XSRF-TOKEN', csrfToken, {
  httpOnly: false,  // 前端可读
  secure: true,
  sameSite: 'strict',
});

// ✅ 前端在请求头中携带
api.interceptors.request.use((config) => {
  const csrfToken = getCookie('XSRF-TOKEN');
  config.headers['X-XSRF-TOKEN'] = csrfToken;
  return config;
});
```

### 5.3 Token 管理

**推荐方案**:
```typescript
// ✅ Access Token 存内存
class AuthStore {
  private accessToken: string | null = null;
  
  setToken(token: string) {
    this.accessToken = token;  // 内存存储
  }
  
  getToken(): string | null {
    return this.accessToken;
  }
}

// ✅ Refresh Token 存 httpOnly Cookie（后端设置）
// Set-Cookie: refreshToken=xxx; HttpOnly; Secure; SameSite=Strict
```

### 5.4 输入验证

**前端验证 + 后端验证**:
```typescript
// ✅ 前端验证（用户体验）
const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ✅ 后端验证（安全保障）
const emailSchema = z.string().email('邮箱格式不正确');
```

---

## 6. 日志与监控

### 6.1 日志规范

**必须记录的信息**:
```typescript
// ✅ 认证日志
logger.info('User login', {
  userId: user.id,
  email: user.email,
  ip: getClientIP(req),
  userAgent: req.headers['user-agent'],
  timestamp: new Date().toISOString(),
});

// ✅ 操作日志
logger.info('User updated profile', {
  userId: user.id,
  changes: { old: oldData, new: newData },
  ip: getClientIP(req),
});

// ✅ 错误日志
logger.error('Database error', {
  error: error.message,
  stack: error.stack,
  query: sanitizedQuery,  // 脱敏后的查询
});
```

**禁止记录的信息**:
- ❌ 明文密码
- ❌ 完整信用卡号
- ❌ CVV 码
- ❌ 验证码
- ❌ Token 明文

### 6.2 安全事件日志

**必须记录的安全事件**:
```typescript
// ✅ 登录失败
logger.warn('Login failed', {
  email,
  ip: getClientIP(req),
  attempt: failedLoginAttempts,
  reason: 'invalid_password',
});

// ✅ 权限拒绝
logger.warn('Access denied', {
  userId: req.user?.id,
  resource: req.path,
  requiredRole: 'admin',
  userRole: req.user?.role,
});

// ✅ 限流触发
logger.warn('Rate limit exceeded', {
  ip: req.ip,
  path: req.path,
  count: requestCount,
  limit: maxRequests,
});
```

### 6.3 监控告警

**关键指标**:
- 登录失败率 > 10%
- 5xx 错误率 > 1%
- API 响应时间 P99 > 2s
- 限流触发次数突增

**告警渠道**:
- 邮件：非紧急告警
- 短信/电话：紧急告警
- Slack/钉钉：日常通知

---

## 7. 部署安全

### 7.1 环境变量

**密钥管理**:
```bash
# ✅ .env 文件不应提交到 Git
# .env 添加到 .gitignore

# ✅ 使用密钥管理服务
# AWS Secrets Manager
# HashiCorp Vault
# Azure Key Vault

# ✅ 生产环境使用 CI/CD Secrets
# GitHub Actions Secrets
# GitLab CI Variables
```

**密钥轮换**:
```bash
# ✅ 定期轮换密钥（建议 90 天）
# 1. 生成新密钥
NEW_JWT_SECRET=$(openssl rand -hex 32)

# 2. 更新环境变量
# 3. 重启服务
# 4. 验证服务正常
# 5. 删除旧密钥
```

### 7.2 Docker 安全

**Dockerfile 最佳实践**:
```dockerfile
# ✅ 使用最小基础镜像
FROM node:20-alpine

# ✅ 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# ✅ 设置工作目录
WORKDIR /app

# ✅ 复制依赖文件
COPY package*.json ./
RUN npm ci --only=production

# ✅ 复制应用代码
COPY --chown=nodejs:nodejs . .

# ✅ 切换到非 root 用户
USER nodejs

# ✅ 暴露端口
EXPOSE 3000

# ✅ 启动应用
CMD ["node", "dist/index.js"]
```

### 7.3 HTTPS 配置

**Nginx 配置**:
```nginx
# ✅ 强制 HTTPS
server {
    listen 80;
    server_name api.aiads.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.aiads.com;

    # SSL 证书
    ssl_certificate /etc/ssl/certs/aiads.crt;
    ssl_certificate_key /etc/ssl/private/aiads.key;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'" always;
}
```

---

## 8. 应急响应

### 8.1 安全事件分类

| 级别 | 描述 | 响应时间 |
|-----|------|---------|
| P0 - 严重 | 数据泄露、系统被入侵 | 15 分钟 |
| P1 - 高 | 认证绕过、权限提升 | 1 小时 |
| P2 - 中 | XSS、CSRF 攻击 | 4 小时 |
| P3 - 低 | 配置错误、信息泄露 | 24 小时 |

### 8.2 应急响应流程

```
1. 发现事件
   ↓
2. 初步评估（定级）
   ↓
3. 遏制影响（隔离、下线）
   ↓
4. 根因分析
   ↓
5. 修复漏洞
   ↓
6. 恢复服务
   ↓
7. 事后复盘
   ↓
8. 改进措施
```

### 8.3 常见场景处理

**场景 1: JWT 密钥泄露**
```
1. 立即生成新密钥
2. 更新所有服务配置
3. 重启服务
4. 所有用户 Token 失效，需重新登录
5. 调查泄露原因
```

**场景 2: 数据库泄露**
```
1. 立即断开数据库外网访问
2. 修改数据库密码
3. 检查数据库账号权限
4. 审计数据库访问日志
5. 通知受影响用户
6. 报告监管机构（如需要）
```

**场景 3: DDoS 攻击**
```
1. 启用 CDN/WAF 防护
2. 配置 IP 黑名单
3. 降低限流阈值
4. 联系云服务商协助
5. 准备扩容方案
```

### 8.4 联系人清单

| 角色 | 联系方式 | 职责 |
|-----|---------|------|
| 安全负责人 | security-lead@aiads.com | 应急指挥 |
| 技术负责人 | tech-lead@aiads.com | 技术决策 |
| 运维负责人 | ops-lead@aiads.com | 服务恢复 |
| 法务负责人 | legal@aiads.com | 法律支持 |
| PR 负责人 | pr@aiads.com | 对外沟通 |

---

## 附录

### A. 安全检查清单

**上线前检查**:
- [ ] 所有依赖已更新到最新版本
- [ ] npm audit 无高危漏洞
- [ ] 环境变量已配置
- [ ] 默认密码/密钥已更换
- [ ] HTTPS 已启用
- [ ] 日志配置正确
- [ ] 监控告警已配置
- [ ] 备份策略已实施

### B. 安全工具推荐

| 类别 | 工具 | 用途 |
|-----|------|------|
| 静态分析 | ESLint + eslint-plugin-security | 代码安全检查 |
| 依赖扫描 | npm audit, Snyk | 依赖漏洞扫描 |
| 动态测试 | OWASP ZAP, Burp Suite | 渗透测试 |
| 代码审计 | SonarQube | 代码质量 |
| 密钥检测 | GitLeaks, TruffleHog | 密钥泄露检测 |

### C. 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [Node.js 安全最佳实践](https://nodejs.org/en/docs/guides/security/)
- [Express 安全最佳实践](https://expressjs.com/en/advanced/best-practice-security.html)

---

*本指南应定期更新，建议每季度审查一次*
