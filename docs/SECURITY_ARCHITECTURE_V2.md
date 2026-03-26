# AIAds 安全架构 V2 设计文档

**版本**: 2.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 架构团队
**保密级别**: 内部机密
**目标安全评分**: 85/100

---

## 执行摘要

本文档描述了 AIAds 平台的安全架构 V2 设计，旨在解决安全审计中发现的 25 个安全问题，将安全评分从 65/100 提升至 85/100 以上。

### 架构设计原则

1. **零信任原则**: 从不信任，始终验证
2. **纵深防御**: 多层安全防护
3. **最小权限**: 只授予必要权限
4. **默认安全**: 默认配置是安全的

### 安全评分提升目标

| 类别 | 当前得分 | 目标得分 | 提升措施 |
|-----|---------|---------|---------|
| 认证安全 | 60/100 | 90/100 | MFA、Token 轮换、账户锁定 |
| 数据安全 | 65/100 | 85/100 | 加密存储、数据脱敏、RLS |
| API 安全 | 70/100 | 90/100 | 多级限流、输入验证、CSRF |
| 监控响应 | 55/100 | 80/100 | 安全事件检测、实时告警 |
| **总体** | **65/100** | **85/100** | - |

---

## 1. 认证架构设计

### 1.1 认证架构概览

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           AIAds Authentication Architecture V2                   │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │    User     │
                                    │  (客户端)    │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
           ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
           │   Password Auth │   │    MFA Auth     │   │   Social Auth   │
           │   (密码认证)     │   │  (多因素认证)    │   │   (社交登录)     │
           └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
                    │                      │                      │
                    └──────────────────────┼──────────────────────┘
                                           │
                                           ▼
                              ┌─────────────────────────┐
                              │   Authentication Core   │
                              │      (认证核心)          │
                              │  ┌───────────────────┐  │
                              │  │  Risk Engine      │  │
                              │  │  (风险评估引擎)    │  │
                              │  └───────────────────┘  │
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
        │   Access Token    │  │   Refresh Token   │  │   Session Store   │
        │   (15 分钟)        │  │   (7 天，轮换)     │  │   (Redis)         │
        └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
                  │                      │                      │
                  └──────────────────────┼──────────────────────┘
                                         │
                                         ▼
                              ┌─────────────────────────┐
                              │    Authorization Core   │
                              │      (授权核心)          │
                              │  ┌───────────────────┐  │
                              │  │  RBAC + RLS       │  │
                              │  │  (角色 + 行级安全)  │  │
                              │  └───────────────────┘  │
                              └─────────────────────────┘
```

### 1.2 JWT Token 配置优化

#### 1.2.1 Token 有效期配置

| Token 类型 | 当前配置 | V2 配置 | 说明 |
|-----------|---------|--------|------|
| Access Token | 1 小时 | **15 分钟** | 缩短有效期降低泄露风险 |
| Refresh Token | 7 天 | **7 天（轮换）** | 实现轮换机制 |
| MFA Token | - | **30 分钟** | 用于 MFA 验证过程 |
| Reset Password Token | - | **1 小时** | 密码重置令牌 |

#### 1.2.2 Token 结构设计

```typescript
// Access Token Payload
interface AccessTokenPayload {
  sub: string;           // 用户 ID
  email: string;         // 邮箱
  role: string;          // 角色
  jti: string;           // 唯一标识
  iat: number;           // 签发时间
  exp: number;           // 过期时间 (15 分钟)
  deviceFingerprint?: string;  // 设备指纹
  sessionId: string;     // 会话 ID
}

// Refresh Token Payload
interface RefreshTokenPayload {
  sub: string;           // 用户 ID
  jti: string;           // 唯一标识
  iat: number;           // 签发时间
  exp: number;           // 过期时间 (7 天)
  deviceFingerprint?: string;  // 设备指纹
  sessionId: string;     // 会话 ID
  rotationCount: number; // 轮换次数
}
```

#### 1.2.3 Refresh Token 轮换机制

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  客户端请求   │────▶│  验证旧 Token  │────▶│  检查重用检测 │
│  Refresh     │     │  有效性       │     │  (防重放)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │  生成新 Token │     │  旧 Token 加入 │
                     │  对           │     │  黑名单       │
                     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  返回新 Token │
                     │  给客户端     │
                     └──────────────┘
```

**轮换流程**:
1. 客户端使用 Refresh Token 请求新 Access Token
2. 服务端验证 Refresh Token 有效性
3. 检查 Refresh Token 是否在黑名单（防止重放攻击）
4. 生成新的 Token 对（新 Access Token + 新 Refresh Token）
5. 将旧 Refresh Token 加入黑名单
6. 返回新 Token 对给客户端

**重用检测**:
- 如果检测到 Refresh Token 被重用，立即吊销该用户所有 Token
- 记录安全事件并告警
- 强制用户重新登录

### 1.3 多因素认证 (MFA) 设计

#### 1.3.1 MFA 方法支持

| 方法 | 优先级 | 安全性 | 用户体验 | 说明 |
|-----|--------|--------|---------|------|
| TOTP (Google Authenticator) | 高 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 推荐默认选项 |
| 短信验证码 | 中 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 备用选项 |
| 邮箱验证码 | 中 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 备用选项 |
| 硬件密钥 (WebAuthn) | 低 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 未来扩展 |

#### 1.3.2 MFA 触发条件

```typescript
interface MFATriggerConfig {
  //  always: 始终要求 MFA
  //  never: 从不要求 MFA
  //  conditional: 条件触发
  mode: 'always' | 'never' | 'conditional';

  // 条件触发配置
  conditions: {
    // 异地登录检测
    newLocation: boolean;
    // 新设备检测
    newDevice: boolean;
    // 大额交易（超过阈值）
    largeTransaction: {
      enabled: boolean;
      threshold: number;  // 金额阈值
    };
    // 敏感操作
    sensitiveActions: boolean;
    // 登录时间异常
    unusualTime: boolean;
    // 连续失败后
    afterFailedAttempts: {
      enabled: boolean;
      threshold: number;
    };
  };
}
```

#### 1.3.3 MFA 实现架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      MFA Architecture                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   用户登录   │────▶│  验证密码   │────▶│  风险评估   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
                    ▼                         ▼                     ▼
           ┌─────────────────┐      ┌─────────────────┐   ┌─────────────────┐
           │   低风险         │      │   中风险         │   │   高风险         │
           │   直接通过       │      │   MFA 验证       │   │   MFA + 人工审核  │
           └─────────────────┘      └─────────────────┘   └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  MFA 方法选择    │
                                     │  - TOTP         │
                                     │  - SMS          │
                                     │  - Email        │
                                     └─────────────────┘
                                              │
                                              ▼
                                     ┌─────────────────┐
                                     │  验证 MFA 代码   │
                                     └─────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                     ┌─────────────────┐            ┌─────────────────┐
                     │  验证成功        │            │  验证失败        │
                     │  生成 Token      │            │  记录失败        │
                     └─────────────────┘            └─────────────────┘
```

### 1.4 Session 管理

#### 1.4.1 并发 Session 限制

| 用户角色 | 最大并发 Session | 说明 |
|---------|----------------|------|
| 普通用户 | 5 | 同时最多 5 个设备在线 |
| VIP 用户 | 10 | 高级用户更多设备 |
| 管理员 | 3 | 管理员严格限制 |

#### 1.4.2 异地登录检测

```typescript
interface LocationCheck {
  // 基于 IP 的地理位置
  ipLocation: {
    country: string;
    region: string;
    city: string;
  };

  // 与上次登录位置的距离（公里）
  distanceFromLast: number;

  // 是否为新位置
  isNewLocation: boolean;

  // 风险评分 (0-100)
  riskScore: number;
}

// 检测逻辑
function detectUnusualLocation(
  currentIP: string,
  lastLogin: LastLoginInfo
): LocationCheck {
  const currentLocation = geoIP.lookup(currentIP);
  const distance = calculateDistance(
    currentLocation,
    lastLogin.location
  );

  // 1 小时内移动超过 500 公里视为异常
  const timeDiff = Date.now() - lastLogin.timestamp;
  const isUnusual = distance > 500 && timeDiff < 3600000;

  return {
    ipLocation: currentLocation,
    distanceFromLast: distance,
    isNewLocation: !isKnownLocation(currentLocation),
    riskScore: calculateRiskScore(distance, timeDiff),
  };
}
```

#### 1.4.3 可疑行为锁定

| 行为类型 | 触发条件 | 响应措施 |
|---------|---------|---------|
| 连续登录失败 | 5 次失败 | 锁定 15 分钟 |
| 异地登录 | 1 小时 500km+ | 要求 MFA |
| 多设备同时登录 | 超过限制 | 拒绝新登录 |
| 异常时间登录 | 非活跃时段 | 要求 MFA |
| Token 重用检测 | Refresh Token 重用 | 吊销所有 Token |

---

## 2. 数据保护架构

### 2.1 数据加密架构

#### 2.1.1 加密层次结构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Encryption Architecture                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Layer 1: Transport Layer                      │
│                    (TLS 1.3 传输加密)                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   HTTPS     │  │   TLS 1.3   │  │   HSTS      │             │
│  │  强制 HTTPS  │  │  最新版本   │  │  严格传输   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 2: Application Layer                    │
│                    (应用层加密)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  AES-256    │  │  RSA-2048   │  │  Key Mgmt   │             │
│  │  敏感数据   │  │  密钥交换   │  │  密钥管理   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Layer 3: Database Layer                       │
│                    (数据库加密)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  TDE        │  │  Column     │  │  Backup     │             │
│  │  透明加密   │  │  列级加密   │  │  备份加密   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.1.2 敏感字段加密存储

| 字段类型 | 加密算法 | 密钥管理 | 说明 |
|---------|---------|---------|------|
| 密码 | bcrypt (cost=12) | - | 单向哈希 |
| 手机号 | AES-256-GCM | KMS | 可逆加密 |
| 身份证号 | AES-256-GCM | KMS | 可逆加密 |
| 银行卡号 | AES-256-GCM | KMS | 可逆加密 |
| 邮箱 | AES-256-GCM | KMS | 可选 |
| 地址 | AES-256-GCM | KMS | 可选 |

#### 2.1.3 密钥管理 (KMS)

```
┌─────────────────────────────────────────────────────────────────┐
│                      Key Management Architecture                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Master Key │────▶│  Key Store  │────▶│  Key Rotation│
│  (主密钥)    │     │  (密钥存储)  │     │  (密钥轮换)  │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Key Derivation│  │  Access     │     │  Key Audit  │
│  (密钥派生)   │     │  Control    │     │  (密钥审计)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

**密钥轮换策略**:
- Master Key: 每年轮换
- Data Encryption Key: 每 90 天轮换
- Session Key: 每次会话生成

### 2.2 数据脱敏架构

#### 2.2.1 脱敏规则

| 数据类型 | 脱敏规则 | 示例 |
|---------|---------|------|
| 手机号 | 保留前 3 后 4 | 138****5678 |
| 邮箱 | 保留首尾 + 域名 | t***t@gmail.com |
| 身份证 | 保留前 6 后 4 | 110101********1234 |
| 银行卡 | 保留前 4 后 4 | 6222****1234 |
| 姓名 | 单字显示 | 张* |
| 地址 | 保留到区 | 北京市朝阳区*** |

#### 2.2.2 脱敏层级

```
┌─────────────────────────────────────────────────────────────────┐
│                      Data Masking Levels                         │
└─────────────────────────────────────────────────────────────────┘

Level 1: Full Masking (完全脱敏)
├── 适用场景：日志、监控、第三方集成
├── 手机号：138****5678
├── 邮箱：t***t@gmail.com
└── 身份证：110101********1234

Level 2: Partial Masking (部分脱敏)
├── 适用场景：客服系统、运营后台
├── 手机号：138****5678
├── 邮箱：t***t@gmail.com
└── 身份证：110101********1234

Level 3: Minimal Masking (最小脱敏)
├── 适用场景：用户本人查看
├── 手机号：138****5678
├── 邮箱：t***t@gmail.com
└── 身份证：显示完整（需二次验证）

Level 4: No Masking (无脱敏)
├── 适用场景：授权管理员、审计
├── 需要：高级别权限 + 操作日志
└── 所有字段完整显示
```

### 2.3 访问控制架构

#### 2.3.1 Row Level Security (RLS)

```sql
-- PostgreSQL RLS 策略示例

-- 启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的数据
CREATE POLICY user_select_own ON users
  FOR SELECT
  USING (id = current_setting('app.current_user_id')::uuid);

-- 管理员可以查看所有数据
CREATE POLICY admin_select_all ON users
  FOR SELECT
  USING (
    current_setting('app.current_user_role')::text IN ('admin', 'super_admin')
  );

-- KOL 数据公开（部分字段）
CREATE POLICY kol_public_select ON kols
  FOR SELECT
  USING (is_public = true);
```

#### 2.3.2 最小权限原则

```
┌─────────────────────────────────────────────────────────────────┐
│                      Permission Hierarchy                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Super Admin (超级管理员)                                        │
│  • 所有权限                                                      │
│  • 系统配置                                                      │
│  • 用户管理                                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Admin (管理员)                                                  │
│  • 用户管理（非管理员）                                           │
│  • 内容审核                                                      │
│  • 数据查看                                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Advertiser (广告主)                                             │
│  • 管理自己的广告活动                                             │
│  • 查看自己的数据                                                 │
│  • 充值和消费                                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  KOL (创作者)                                                    │
│  • 管理自己的资料                                                 │
│  • 查看任务邀请                                                   │
│  • 查看收入                                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.3.3 审计日志

| 操作类型 | 记录内容 | 保留期限 |
|---------|---------|---------|
| 登录/登出 | 用户 ID、IP、时间、设备 | 6 个月 |
| 数据修改 | 用户 ID、操作、旧值、新值 | 6 个月 |
| 权限变更 | 操作人、目标用户、变更内容 | 1 年 |
| 数据导出 | 用户 ID、导出内容、数量 | 1 年 |
| 敏感操作 | 完整操作上下文 | 2 年 |

---

## 3. API 安全架构

### 3.1 速率限制优化

#### 3.1.1 多级限流架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      Multi-Level Rate Limiting                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Level 1: IP-based Rate Limiting (IP 限流)                        │
│  • 全局 IP 限流：1000 请求/分钟                                    │
│  • 认证接口：10 请求/15 分钟                                       │
│  • 验证码接口：5 请求/5 分钟                                       │
│  • 实现：Redis + 滑动窗口                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Level 2: User-based Rate Limiting (用户限流)                     │
│  • 普通用户：100 请求/分钟                                        │
│  • VIP 用户：500 请求/分钟                                        │
│  • 管理员：1000 请求/分钟                                         │
│  • 实现：Redis + 用户 ID 键                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Level 3: API-based Rate Limiting (API 限流)                      │
│  • 读接口：300 请求/分钟                                          │
│  • 写接口：100 请求/分钟                                          │
│  • 敏感接口：30 请求/分钟                                         │
│  • 实现：Redis + API 路径键                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.1.2 动态限流

```typescript
interface DynamicRateLimitConfig {
  // 基础限流配置
  baseLimit: number;
  windowMs: number;

  // 动态调整因子
  adjustments: {
    // 根据用户信誉调整
    reputationFactor: number;  // 0.5 - 2.0
    // 根据行为模式调整
    behaviorFactor: number;    // 0.5 - 1.5
    // 根据系统负载调整
    loadFactor: number;        // 0.5 - 1.0
  };

  // 失败默认拒绝
  failClosed: boolean;
}

// 动态限流计算
function calculateDynamicLimit(
  userId: string,
  baseLimit: number
): number {
  const userReputation = getUserReputation(userId);
  const behaviorScore = getBehaviorScore(userId);
  const systemLoad = getSystemLoad();

  let adjustedLimit = baseLimit;

  // 高信誉用户提高限流
  if (userReputation > 80) {
    adjustedLimit *= 1.5;
  } else if (userReputation < 30) {
    adjustedLimit *= 0.5;
  }

  // 异常行为降低限流
  if (behaviorScore < 50) {
    adjustedLimit *= 0.7;
  }

  // 系统高负载降低限流
  if (systemLoad > 80) {
    adjustedLimit *= 0.8;
  }

  return Math.floor(adjustedLimit);
}
```

### 3.2 输入验证架构

#### 3.2.1 Zod Schema 验证

```typescript
// 统一的输入验证架构
import { z } from 'zod';

// 基础验证器
const validators = {
  // 邮箱验证
  email: z.string().email('邮箱格式不正确').max(255),

  // 密码验证（强化）
  password: z
    .string()
    .min(12, '密码至少 12 位')
    .max(50, '密码长度不能超过 50 个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/[0-9]/, '密码必须包含数字')
    .regex(/[^A-Za-z0-9]/, '密码必须包含特殊字符'),

  // 手机号验证
  phone: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, '手机号格式不正确')
    .min(10, '手机号至少 10 位')
    .max(15, '手机号最多 15 位'),

  // 通用文本验证
  text: (maxLength: number) =>
    z
      .string()
      .max(maxLength, `长度不能超过${maxLength}个字符`)
      .trim()
      .regex(/^[\s\S]*$/, '包含非法字符'),
};

// 登录请求验证
const loginSchema = z.object({
  email: validators.email,
  password: z.string().min(1, '密码不能为空'),
  mfaCode: z.string().length(6, 'MFA 验证码为 6 位数字').optional(),
  deviceId: z.string().uuid('设备 ID 格式不正确').optional(),
});
```

#### 3.2.2 白名单过滤

```typescript
// 白名单过滤
interface WhitelistFilter {
  // 允许的字符集
  allowedChars: RegExp;
  // 允许的 HTML 标签（如需要）
  allowedTags: string[];
  // 最大长度
  maxLength: number;
}

function whitelistFilter(
  input: string,
  config: WhitelistFilter
): string {
  // 移除非法字符
  let filtered = input.replace(config.allowedChars, '');

  // 长度限制
  if (filtered.length > config.maxLength) {
    filtered = filtered.substring(0, config.maxLength);
  }

  return filtered;
}
```

### 3.3 输出编码架构

#### 3.3.1 XSS 防护

```typescript
// 输出编码策略
const outputEncoding = {
  // HTML 实体编码
  encodeHTML: (str: string): string => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  },

  // URL 编码
  encodeURL: (str: string): string => {
    return encodeURIComponent(str);
  },

  // JSON 编码
  encodeJSON: (obj: any): string => {
    return JSON.stringify(obj, null, 2);
  },
};

// Helmet 安全头配置
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.aiads.com'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
  })
);
```

#### 3.3.2 SQL 注入防护

```typescript
// Prisma 参数化查询（默认安全）
// ✅ 安全：Prisma 自动参数化
const user = await prisma.user.findUnique({
  where: { email: userInput },
});

// ❌ 避免：原始查询
// const user = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;

// ✅ 如必须使用原始查询，使用参数化
const user = await prisma.$queryRaw`
  SELECT * FROM users WHERE email = ${userInput}
`;  // Prisma 会参数化

// 输入验证 + 参数化 = 双重防护
```

#### 3.3.3 命令注入防护

```typescript
// 禁止使用 shell 执行用户输入
// ❌ 危险
exec(`echo ${userInput}`);

// ✅ 安全：使用参数化
execFile('echo', [userInput]);

// ✅ 更安全：避免 shell 命令
import { writeFile } from 'fs/promises';
await writeFile('output.txt', userInput);
```

---

## 4. 监控和响应架构

### 4.1 安全事件检测

#### 4.1.1 检测规则

```
┌─────────────────────────────────────────────────────────────────┐
│                      Security Event Detection                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Authentication Events (认证事件)                                 │
│  • 登录失败检测：5 次失败/15 分钟                                  │
│  • 成功登录后立即失败：可能密码泄露                               │
│  • 多地点同时登录：账号共享或泄露                                 │
│  • 非常用设备登录：新设备风险                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Authorization Events (授权事件)                                  │
│  • 越权访问尝试：访问非授权资源                                   │
│  • 权限提升尝试：尝试访问管理员功能                               │
│  • 批量数据访问：异常数据查询                                     │
│  • 敏感接口调用：高频调用敏感接口                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Data Events (数据事件)                                          │
│  • 大量数据导出：超过阈值的数据导出                               │
│  • 敏感数据访问：访问敏感数据字段                                 │
│  • 数据修改异常：批量修改或删除                                   │
│  • 数据泄露检测：异常数据外传                                     │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.1.2 异常行为检测

```typescript
interface AnomalyDetection {
  // 基于时间的异常
  timeBased: {
    // 非活跃时段登录（如凌晨 2-5 点）
    unusualHour: boolean;
    // 与平时登录时间差异大
    timeDeviation: number;
  };

  // 基于地理位置的异常
  locationBased: {
    // 短时间内长距离移动
    impossibleTravel: boolean;
    // 高风险国家/地区
    highRiskCountry: boolean;
  };

  // 基于行为的异常
  behaviorBased: {
    // 请求频率突增
    requestSpike: boolean;
    // 访问模式改变
    patternChange: boolean;
    // 新 API 调用
    newAPICall: boolean;
  };
}
```

### 4.2 告警和响应

#### 4.2.1 告警级别

| 级别 | 名称 | 响应时间 | 通知渠道 | 示例 |
|-----|------|---------|---------|------|
| P0 | 严重 | 15 分钟 | 电话 + 短信 + Slack | 数据泄露、系统入侵 |
| P1 | 高 | 1 小时 | 短信 + Slack | 认证绕过、权限提升 |
| P2 | 中 | 4 小时 | Slack + 邮件 | XSS、CSRF 攻击 |
| P3 | 低 | 24 小时 | 邮件 | 配置错误、信息泄露 |

#### 4.2.2 自动响应机制

```
┌─────────────────────────────────────────────────────────────────┐
│                      Automated Response                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  事件检测    │────▶│  风险评估   │────▶│  响应决策   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
                    ▼                         ▼                     ▼
           ┌─────────────────┐      ┌─────────────────┐   ┌─────────────────┐
           │  低风险          │      │  中风险          │   │  高风险          │
           │  记录日志        │      │  临时限流        │   │  自动封禁        │
           │  发送通知        │      │  要求 MFA        │   │  吊销 Token      │
           └─────────────────┘      └─────────────────┘   └─────────────────┘
```

#### 4.2.3 自动封禁规则

```typescript
interface AutoBanRules {
  // IP 封禁
  ipBan: {
    // 连续失败次数
    failedAttempts: number;
    // 封禁时长（分钟）
    banDuration: number;
    // 封禁范围
    scope: 'ip' | 'subnet' | 'country';
  };

  // 用户封禁
  userBan: {
    // 触发条件
    triggers: string[];
    // 封禁类型
    type: 'temporary' | 'permanent';
    // 通知用户
    notifyUser: boolean;
  };

  // 设备封禁
  deviceBan: {
    // 设备指纹
    fingerprint: string;
    // 封禁时长
    duration: number;
  };
}
```

### 4.3 审计日志架构

#### 4.3.1 日志结构

```typescript
interface AuditLog {
  // 基础信息
  id: string;
  timestamp: string;
  requestId: string;

  // 用户信息
  userId?: string;
  userRole?: string;
  userIP: string;
  userAgent: string;

  // 操作信息
  action: string;
  resource: string;
  method: string;
  path: string;

  // 请求信息
  requestBody?: any;
  responseBody?: any;
  statusCode: number;

  // 安全信息
  riskScore: number;
  anomalies: string[];

  // 元数据
  sessionId: string;
  deviceFingerprint?: string;
}
```

#### 4.3.2 日志完整性保护

```
┌─────────────────────────────────────────────────────────────────┐
│                      Log Integrity Protection                    │
└─────────────────────────────────────────────────────────────────┘

1. 写入时签名
   └── 每条日志添加 HMAC 签名
   └── 防止日志篡改

2. 链式存储
   └── 每条日志包含前一条日志的哈希
   └── 形成区块链式结构

3. 异地备份
   └── 日志实时同步到独立存储
   └── 防止本地删除

4. 只追加
   └── 日志文件只追加不修改
   └── 修改需要管理员权限
```

#### 4.3.3 日志留存策略

| 日志类型 | 热存储 | 温存储 | 冷存储 | 总保留期 |
|---------|-------|-------|-------|---------|
| 认证日志 | 30 天 | 90 天 | 150 天 | 6 个月 |
| 操作日志 | 30 天 | 90 天 | 150 天 | 6 个月 |
| 审计日志 | 90 天 | 180 天 | 95 天 | 1 年 |
| 安全事件 | 180 天 | 180 天 | 365 天 | 2 年 |
| 系统日志 | 7 天 | 30 天 | 63 天 | 3 个月 |

---

## 5. 实施路线图

### 5.1 第一阶段（第 1-2 周）：认证安全加固

- [ ] JWT 配置优化（15 分钟 Access Token）
- [ ] Refresh Token 轮换机制
- [ ] 账户锁定策略
- [ ] 设备指纹绑定
- [ ] 基础 MFA 支持（TOTP）

### 5.2 第二阶段（第 3-4 周）：数据保护

- [ ] 敏感字段加密存储
- [ ] API 响应脱敏
- [ ] 日志脱敏
- [ ] Row Level Security
- [ ] 密钥管理系统

### 5.3 第三阶段（第 5-6 周）：API 安全

- [ ] 多级限流实现
- [ ] 动态限流引擎
- [ ] 输入验证强化
- [ ] CSRF 防护
- [ ] 输出编码

### 5.4 第四阶段（第 7-8 周）：监控响应

- [ ] 安全事件检测
- [ ] 告警系统
- [ ] 自动响应
- [ ] 审计日志
- [ ] 应急预案

---

## 6. 安全架构检查清单

### 6.1 认证安全

- [ ] Access Token 有效期 ≤ 15 分钟
- [ ] Refresh Token 轮换机制
- [ ] MFA 支持（TOTP、SMS、Email）
- [ ] 账户锁定策略（5 次失败锁定 15 分钟）
- [ ] 并发 Session 限制
- [ ] 异地登录检测
- [ ] 设备指纹绑定

### 6.2 数据安全

- [ ] 敏感字段 AES-256 加密
- [ ] TLS 1.3 传输加密
- [ ] 密钥管理系统
- [ ] API 响应脱敏
- [ ] 日志脱敏
- [ ] Row Level Security
- [ ] 最小权限原则

### 6.3 API 安全

- [ ] 多级限流（IP、用户、API）
- [ ] 动态限流
- [ ] Zod Schema 验证
- [ ] 白名单过滤
- [ ] CSRF 防护
- [ ] XSS 防护（CSP）
- [ ] SQL 注入防护
- [ ] 命令注入防护

### 6.4 监控响应

- [ ] 登录失败检测
- [ ] 异常行为检测
- [ ] 实时告警
- [ ] 自动封禁
- [ ] 审计日志
- [ ] 日志完整性保护
- [ ] 日志留存 ≥ 6 个月

---

## 附录

### A. 术语表

| 术语 | 说明 |
|-----|------|
| MFA | 多因素认证 (Multi-Factor Authentication) |
| TOTP | 基于时间的一次性密码 (Time-based One-Time Password) |
| RLS | 行级安全 (Row Level Security) |
| KMS | 密钥管理系统 (Key Management System) |
| CSP | 内容安全策略 (Content Security Policy) |
| HMAC | 哈希消息认证码 (Hash-based Message Authentication Code) |

### B. 参考标准

- OWASP Top 10 2021
- NIST Cybersecurity Framework
- ISO 27001
- GDPR 数据保护要求

### C. 文档历史

| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| 1.0 | 2026-03-24 | AIAds 架构团队 | 初始版本 |
| 2.0 | 2026-03-24 | AIAds 架构团队 | 安全架构 V2 设计 |

---

*本文件为 AIAds 内部机密文档，未经授权不得外传*
