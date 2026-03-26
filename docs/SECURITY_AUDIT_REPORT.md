# AIAds 安全评审报告

**版本**: 1.0
**评审日期**: 2026 年 3 月 24 日
**评审人**: AIAds 安全审计团队
**保密级别**: 内部机密

---

## 执行摘要

本次安全评审对 AIAds 平台进行了全面的安全审计，包括架构安全、代码安全、OWASP Top 10 合规性检查以及渗透测试清单。评审发现系统整体安全状况**中等**，存在若干需要立即修复的高优先级安全问题。

### 评审范围

- ✅ 系统架构安全评审
- ✅ 后端代码安全评审
- ✅ 前端代码安全评审
- ✅ OWASP Top 10 2021 合规检查
- ✅ 渗透测试清单制定
- ✅ 安全加固建议

### 风险等级分布

| 等级 | 数量 | 状态 |
|-----|------|------|
| 🔴 高危 | 5 | 需要立即修复 |
| 🟡 中危 | 8 | 建议本周修复 |
| 🟢 低危 | 12 | 后续迭代优化 |

---

## 1. 架构安全评审

### 1.1 网络安全

| 检查项 | 状态 | 发现 | 建议 |
|-------|------|------|------|
| HTTPS/TLS 配置 | ⚠️ 部分 | 生产环境使用 Railway 自动 SSL，但本地开发仅 HTTP | 开发环境也应启用 HTTPS |
| CORS 配置 | ✅ 通过 | 已配置白名单 `ALLOWED_ORIGINS` | 建议添加更严格的子域名限制 |
| 防火墙规则 | ❌ 缺失 | 未见应用层防火墙配置 | 建议配置 WAF 规则 |
| DDoS 防护 | ❌ 缺失 | 依赖云服务商基础防护 | 建议添加请求频率限制和 IP 黑名单 |

**详细分析**:

```typescript
// src/backend/src/app.ts - CORS 配置
app.use(
  cors({
    origin: config.allowedOrigins,  // ✅ 可配置白名单
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  })
);
```

**问题**:
- CORS 配置虽然支持白名单，但默认配置过于宽松
- 缺少对恶意 CORS 请求的防护
- 未配置 Content-Security-Policy 头

### 1.2 应用安全

| 检查项 | 状态 | 发现 | 评分 |
|-------|------|------|------|
| 认证机制（JWT） | ✅ 通过 | 使用 HS256 算法，有效期 1 小时 | 8/10 |
| 授权机制（RBAC） | ✅ 通过 | 实现角色权限控制 | 8/10 |
| Session 管理 | ⚠️ 部分 | JWT Token 黑名单机制依赖 Redis | 6/10 |
| API 限流 | ✅ 通过 | 多层限流配置 | 9/10 |

**详细分析**:

```typescript
// src/backend/src/utils/crypto.ts - JWT 配置
export function generateTokens(payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>): TokenPair {
  const accessTokenExpiresIn = 3600; // ✅ 1 小时
  const refreshTokenExpiresIn = 604800; // ✅ 7 天
  
  const accessToken = jwt.sign(payload, 
    process.env.JWT_SECRET || 'default-secret-key',  // ⚠️ 默认密钥危险
    { algorithm: 'HS256' }
  );
}
```

**问题**:
- JWT_SECRET 有默认值，生产环境可能被误用
- 缺少 Token 刷新次数限制
- Refresh Token 轮换机制不完善

### 1.3 数据安全

| 检查项 | 状态 | 发现 | 评分 |
|-------|------|------|------|
| 数据加密（传输） | ⚠️ 部分 | 依赖 HTTPS，应用层无额外加密 | 6/10 |
| 数据加密（存储） | ✅ 通过 | 密码使用 bcrypt 加密 | 9/10 |
| 敏感数据保护 | ⚠️ 部分 | 部分 API 返回敏感字段 | 6/10 |
| 数据库访问控制 | ✅ 通过 | Prisma ORM 参数化查询 | 9/10 |
| 密钥管理 | ❌ 缺失 | 密钥存储在.env 文件 | 3/10 |

**详细分析**:

```typescript
// src/backend/src/utils/crypto.ts - 密码加密
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;  // ✅ 符合最低要求
  return bcrypt.hash(password, saltRounds);
}
```

**问题**:
- bcrypt cost factor 为 10，建议提升至 12
- 敏感数据（如手机号）在 API 响应中未脱敏
- 密钥管理依赖环境变量，缺少密钥轮换机制

### 1.4 运维安全

| 检查项 | 状态 | 发现 | 评分 |
|-------|------|------|------|
| 日志审计 | ✅ 通过 | Winston 日志，记录关键操作 | 8/10 |
| 监控告警 | ⚠️ 部分 | 配置 Sentry 但未见告警规则 | 5/10 |
| 备份恢复 | ❌ 未知 | 文档未提及备份策略 | 0/10 |
| 应急响应 | ❌ 缺失 | 未见应急预案文档 | 0/10 |

**详细分析**:

```typescript
// src/backend/src/utils/logger.ts - 日志配置
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});
```

**问题**:
- 日志未包含足够的审计信息（如用户 ID、IP）
- 缺少安全事件日志分类
- 日志保留策略不完善

---

## 2. 后端代码安全评审

### 2.1 认证模块 (`auth.controller.ts`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| 密码加密强度 | ⚠️ 部分 | bcrypt cost=10 | 🟡 中 |
| JWT Token 有效期 | ✅ 通过 | Access:1h, Refresh:7d | 🟢 低 |
| Refresh Token 安全 | ⚠️ 部分 | 缺少轮换机制 | 🟡 中 |
| 登录失败限制 | ✅ 通过 | 记录失败次数 | 🟢 低 |
| 验证码安全 | ⚠️ 部分 | 5 分钟有效期，但开发环境明文日志 | 🟡 中 |

**代码分析**:

```typescript
// src/backend/src/services/auth.service.ts - 登录逻辑
async login(data: LoginRequest): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  
  if (!user) {
    throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
  }
  
  // ✅ 检查用户状态
  if (user.status === 'deleted') { ... }
  if (user.status === 'suspended') { ... }
  
  // ✅ 验证密码
  const isValidPassword = await verifyPassword(data.password, user.passwordHash);
  
  if (!isValidPassword) {
    // ✅ 增加失败次数
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
    throw new ApiError('邮箱或密码错误', 401, 'INVALID_CREDENTIALS');
  }
  
  // ✅ 重置失败次数
  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lastLoginAt: new Date() },
  });
}
```

**发现的问题**:

1. **登录限流不够严格**: 虽然记录了失败次数，但未见自动锁定机制
2. **验证码明文日志**: 
```typescript
logger.info(`Verification code (DEV): ${code}`);  // ❌ 生产环境不应打印
```
3. **缺少账户锁定策略**: 未实现连续失败后的账户锁定

### 2.2 用户模块 (`users.controller.ts`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| 权限验证 | ✅ 通过 | 检查用户 ID 和角色 | 🟢 低 |
| 输入验证 | ✅ 通过 | 使用 Zod 验证 | 🟢 低 |
| SQL 注入防护 | ✅ 通过 | Prisma 参数化查询 | 🟢 低 |
| XSS 防护 | ✅ 通过 | 后端不直接渲染 HTML | 🟢 低 |
| 敏感数据脱敏 | ❌ 缺失 | 返回完整用户信息 | 🔴 高 |

**代码分析**:

```typescript
// src/backend/src/controllers/users.controller.ts - 权限检查
updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // ✅ 检查权限
  if (req.user?.id !== id && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    throw errors.forbidden('没有权限修改此用户');
  }

  validateBody(updateUserSchema)(req, res, () => {});  // ✅ 输入验证
  const user = await userService.updateUser(id, req.body);
  ...
});
```

**发现的问题**:

1. **水平越权风险**: `/users/:id` 接口允许查询任意用户信息
2. **敏感数据泄露**:
```typescript
// src/backend/src/controllers/auth.controller.ts - me 接口
me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,  // ❌ 未脱敏
      // ...
    },
  });
});
```

### 2.3 中间件 (`middleware/`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| auth 中间件 | ✅ 通过 | Token 验证完善 | 🟢 低 |
| rateLimiter 限流 | ✅ 通过 | 多层限流配置 | 🟢 低 |
| errorHandler | ⚠️ 部分 | 生产环境隐藏错误详情 | 🟡 中 |
| validation 验证 | ✅ 通过 | Zod 严格验证 | 🟢 低 |
| Helmet 安全头 | ✅ 通过 | 已配置 Helmet | 🟢 低 |

**代码分析**:

```typescript
// src/backend/src/middleware/auth.ts - Token 验证
export function auth(options: AuthOptions = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = extractTokenFromHeader(authHeader);
    
    if (!token) {
      res.status(401).json({ ... });  // ✅ 明确的错误响应
      return;
    }
    
    const payload = verifyToken(token, 'access');  // ✅ 验证 Token
    
    // ✅ 检查用户状态
    if (user.status === 'deleted') { ... }
    if (user.status === 'suspended') { ... }
    
    // ✅ 角色权限检查
    if (options.allowedRoles && !options.allowedRoles.includes(user.role)) { ... }
  };
}
```

**发现的问题**:

1. **错误信息可能泄露**:
```typescript
// src/backend/src/middleware/errorHandler.ts
if (process.env.NODE_ENV === 'production' && statusCode === 500) {
  response.error.message = '服务器内部错误';  // ✅ 生产环境隐藏
}
```
但堆栈跟踪可能仍包含敏感信息。

2. **限流配置可绕过**: Redis 限流失败时允许请求通过
```typescript
} catch (error) {
  logger.error('Redis rate limiter error', { error });
  next();  // ❌ Redis 故障时未阻止请求
}
```

### 2.4 配置文件 (`config/`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| 环境变量管理 | ⚠️ 部分 | 依赖.env 文件 | 🟡 中 |
| 密钥存储 | ❌ 缺失 | 明文存储在.env | 🔴 高 |
| 数据库连接安全 | ✅ 通过 | 使用连接字符串 | 🟢 低 |
| Redis 连接安全 | ⚠️ 部分 | 支持密码但未强制 | 🟡 中 |

**代码分析**:

```typescript
// src/backend/src/config/database.ts
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },  // ⚠️ 生产环境应关闭
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});
```

**发现的问题**:

1. **数据库查询日志**: 生产环境可能泄露敏感数据
2. **默认密钥危险**:
```typescript
// src/backend/src/utils/crypto.ts
const secret = type === 'access'
  ? process.env.JWT_SECRET || 'default-secret-key'  // ❌ 默认值
  : process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'default-secret-key';
```

---

## 3. 前端代码安全评审

### 3.1 认证页面 (`pages/auth/`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| 密码强度提示 | ✅ 通过 | 实时显示密码强度 | 🟢 低 |
| 表单验证 | ✅ 通过 | 前端 + 后端双重验证 | 🟢 低 |
| CSRF 防护 | ❌ 缺失 | 未见 CSRF Token 机制 | 🔴 高 |
| Token 存储安全 | ⚠️ 部分 | 使用 localStorage | 🟡 中 |
| 敏感信息不显示 | ✅ 通过 | 密码字段不显示 | 🟢 低 |

**代码分析**:

```typescript
// src/frontend/src/pages/auth/RegisterPage.tsx - 密码强度
const getPasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { score, label: '弱', color: 'error' };
  if (score <= 2) return { score, label: '中等', color: 'warning' };
  return { score, label: '强', color: 'success' };
};
```

**发现的问题**:

1. **Token 存储方式**:
```typescript
// src/frontend/src/services/api.ts
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');  // ⚠️ XSS 风险
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

2. **错误信息过于详细**:
```typescript
// src/frontend/src/pages/auth/LoginPage.tsx
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : '登录失败...';
  setSnackbar({ open: true, message: errorMessage, severity: 'error' });
}
```
可能泄露后端实现细节。

### 3.2 API 服务 (`services/api.ts`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| Token 自动注入 | ✅ 通过 | Axios 拦截器 | 🟢 低 |
| 错误处理 | ✅ 通过 | 统一错误处理 | 🟢 低 |
| HTTPS 强制 | ❌ 缺失 | 支持 HTTP | 🔴 高 |
| 请求签名 | ❌ 缺失 | 无请求签名机制 | 🟡 中 |

**代码分析**:

```typescript
// src/frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
// ❌ 默认使用 HTTP，生产环境应强制 HTTPS

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});
```

**发现的问题**:

1. **HTTP 默认配置**: 生产环境应强制 HTTPS
2. **Token 刷新逻辑缺失**: 401 错误时直接跳转登录，未尝试刷新
3. **请求超时过长**: 30 秒可能被用于 DoS 攻击

### 3.3 组件安全 (`components/`)

| 检查项 | 状态 | 发现 | 风险等级 |
|-------|------|------|---------|
| XSS 防护 | ✅ 通过 | React 自动转义 | 🟢 低 |
| 输入转义 | ✅ 通过 | MUI 组件处理 | 🟢 低 |
| URL 验证 | ❌ 未知 | 未见外链组件 | 🟡 中 |

**代码分析**:

```typescript
// src/frontend/src/components/ProtectedRoute.tsx
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <Loading open />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // ✅ 角色权限检查
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/advertiser/dashboard" replace />;
  }
  
  return <>{children}</>;
};
```

**发现的问题**:

1. **路由守卫完善**: 但依赖前端状态，可能被绕过
2. **未见 dangerouslySetInnerHTML**: 这是好的实践

---

## 4. OWASP Top 10 2021 合规检查

| 风险 | 检查项 | 状态 | 备注 |
|------|--------|------|------|
| **A01:2021 注入** | SQL 注入、命令注入 | ✅ 低风险 | Prisma 参数化查询，但需警惕动态查询 |
| **A02:2021 认证失效** | 弱密码、Session 固定 | ⚠️ 中风险 | 密码策略完善，但缺少 MFA |
| **A03:2021 敏感数据泄露** | 明文存储、传输 | ⚠️ 中风险 | HTTPS 依赖云服务，应用层无加密 |
| **A04:2021 XML 外部实体** | XXE 攻击 | ✅ 低风险 | 仅使用 JSON |
| **A05:2021 访问控制失效** | 越权访问 | ⚠️ 中风险 | 存在水平越权风险 |
| **A06:2021 安全配置错误** | 默认配置、调试信息 | ⚠️ 中风险 | 默认 JWT 密钥危险 |
| **A07:2021 XSS** | 跨站脚本 | ✅ 低风险 | React 自动转义 |
| **A08:2021 反序列化** | 不安全反序列化 | ✅ 低风险 | JSON 安全解析 |
| **A09:2021 组件漏洞** | 依赖漏洞 | ⚠️ 未知 | 需运行 npm audit |
| **A010:2021 日志不足** | 审计日志 | ⚠️ 中风险 | 日志完善但缺少安全事件分类 |

---

## 5. 渗透测试清单

### 5.1 信息收集

- [ ] 子域名枚举
- [ ] 目录扫描 (`/api/v1/`, `/admin/`, `/.git/`)
- [ ] 技术栈识别 (Wappalyzer)
- [ ] 敏感文件扫描 (`.env`, `.git/config`, `package.json`)
- [ ] API 文档泄露检查

### 5.2 认证测试

- [ ] 暴力破解测试 (登录接口)
- [ ] Session 管理测试 (Token 重放)
- [ ] 密码找回漏洞 (验证码爆破)
- [ ] OAuth 配置测试 (如启用)
- [ ] JWT Token 篡改测试

### 5.3 授权测试

- [ ] 水平越权测试 (访问其他用户数据)
- [ ] 垂直越权测试 (普通用户访问管理员接口)
- [ ] 条件竞争测试 (并发请求)
- [ ] JWT 权限提升测试

### 5.4 输入验证

- [ ] SQL 注入测试 (虽然使用 Prisma)
- [ ] XSS 测试 (前端输入点)
- [ ] CSRF 测试 (状态变更接口)
- [ ] 文件上传测试 (如启用)
- [ ] 命令注入测试

### 5.5 业务逻辑

- [ ] 价格篡改测试 (订单金额)
- [ ] 重复提交测试 (支付接口)
- [ ] 负数金额测试 (转账接口)
- [ ] 余额不足测试 (充值接口)
- [ ] 验证码重放测试

---

## 6. 安全加固建议

### 6.1 高优先级（立即修复）

| 编号 | 问题 | 影响 | 建议 |
|-----|------|------|------|
| **H01** | 默认 JWT 密钥 | 认证可被伪造 | 生产环境必须使用强随机密钥 |
| **H02** | 敏感数据未脱敏 | 隐私泄露 | API 返回时脱敏手机号等字段 |
| **H03** | 无 CSRF 防护 | 跨站请求伪造 | 实现 CSRF Token 机制 |
| **H04** | HTTP 默认配置 | 数据窃听 | 生产环境强制 HTTPS |
| **H05** | 验证码明文日志 | 验证码泄露 | 移除生产环境验证码日志 |

### 6.2 中优先级（本周修复）

| 编号 | 问题 | 影响 | 建议 |
|-----|------|------|------|
| **M01** | bcrypt cost 过低 | 密码破解风险 | 提升至 12 或更高 |
| **M02** | 无账户锁定策略 | 暴力破解 | 连续失败 5 次锁定 15 分钟 |
| **M03** | Refresh Token 无轮换 | Token 劫持 | 实现 Refresh Token 轮换 |
| **M04** | 限流故障时放行 | DDoS 风险 | Redis 故障时降级限流 |
| **M05** | 日志缺少审计信息 | 溯源困难 | 添加用户 ID、IP 等信息 |
| **M06** | Token 存储 localStorage | XSS 风险 | 考虑使用 httpOnly Cookie |
| **M07** | 无 MFA 支持 | 认证强度低 | 实现双因素认证 |
| **M08** | 数据库查询日志 | 信息泄露 | 生产环境关闭 query 日志 |

### 6.3 低优先级（后续迭代）

| 编号 | 问题 | 影响 | 建议 |
|-----|------|------|------|
| **L01** | 缺少 WAF 配置 | 应用层攻击 | 配置 WAF 规则 |
| **L02** | 无密钥轮换机制 | 密钥泄露风险 | 实现密钥定期轮换 |
| **L03** | 缺少备份策略 | 数据丢失 | 制定数据库备份计划 |
| **L04** | 无应急预案 | 安全事件响应慢 | 编写应急预案文档 |
| **L05** | 监控告警不完善 | 问题发现慢 | 配置安全事件告警 |
| **L06** | 依赖漏洞未知 | 供应链攻击 | 定期运行 npm audit |
| **L07** | 请求超时过长 | DoS 风险 | 缩短超时时间至 10 秒 |
| **L08** | 缺少请求签名 | 请求篡改 | 实现请求签名机制 |
| **L09** | CORS 配置宽松 | 跨域风险 | 限制子域名 |
| **L10** | 无 Content-Security-Policy | XSS 风险 | 配置 CSP 头 |
| **L11** | 缺少安全头 | 多种攻击 | 完善 Helmet 配置 |
| **L12** | 文档不完善 | 配置错误 | 完善安全配置文档 |

---

## 7. 修复时间线

```
第 1 天 (立即):
├── H01: 更换默认 JWT 密钥
├── H03: 移除验证码日志
└── H04: 配置 HTTPS 强制

第 2-3 天:
├── H02: 实现数据脱敏
├── H05: 添加 CSRF 防护
├── M01: 提升 bcrypt cost
└── M02: 实现账户锁定

第 4-7 天:
├── M03: Refresh Token 轮换
├── M04: 限流降级策略
├── M05: 完善审计日志
├── M06: Token 存储优化
└── M07: MFA 设计

后续迭代:
└── L01-L12: 持续改进
```

---

## 8. 结论

AIAds 平台在安全方面已有良好基础：
- ✅ 使用成熟的认证机制 (JWT)
- ✅ 实现了 RBAC 权限控制
- ✅ 使用 Prisma 防止 SQL 注入
- ✅ 配置了多层限流
- ✅ 前端使用 React 自动防 XSS

但存在以下关键问题需要立即修复：
- 🔴 默认 JWT 密钥配置
- 🔴 敏感数据未脱敏
- 🔴 缺少 CSRF 防护
- 🔴 HTTP 默认配置

**整体安全评分**: 65/100

**建议**: 优先修复高优先级问题后再上线生产环境。

---

## 附录

### A. 参考标准

- OWASP Top 10 2021
- CWE/SANS Top 25
- NIST Cybersecurity Framework
- GDPR 数据保护要求

### B. 工具推荐

- **静态分析**: ESLint + security plugins
- **依赖扫描**: npm audit, Snyk
- **动态测试**: OWASP ZAP, Burp Suite
- **代码审计**: SonarQube

### C. 联系方式

安全团队邮箱：security@aiads.com

---

*本报告仅供内部使用，请勿外传*
