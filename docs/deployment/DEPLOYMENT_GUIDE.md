# AIAds 部署指南

**版本**: 1.0.0
**最后更新**: 2026 年 3 月 24 日

---

## 目录

1. [概述](#1-概述)
2. [环境要求](#2-环境要求)
3. [安装步骤](#3-安装步骤)
4. [配置说明](#4-配置说明)
5. [验证部署](#5-验证部署)
6. [常见问题](#6-常见问题)

---

## 1. 概述

本文档介绍 AIAds 平台的完整部署流程，包括后端、前端、数据库和第三方服务的配置。

### 1.1 部署架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIAds Production Architecture                │
└─────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │     Users       │
                    │  (广告主/KOL/管理员) │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐  ┌─────────────────┐
    │   Vercel CDN    │  │   Cloudflare    │
    │   (前端静态资源)  │  │   (DNS + CDN)   │
    └────────┬────────┘  └────────┬────────┘
             │                    │
             ▼                    ▼
    ┌─────────────────────────────────────────┐
    │         Railway Load Balancer           │
    │         (自动 SSL + 健康检查)            │
    └─────────────────┬───────────────────────┘
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
    ┌─────────────────┐  ┌─────────────────┐
    │  Railway App 1  │  │  Railway App 2  │
    │  (Node.js API)  │  │  (Node.js API)  │
    └────────┬────────┘  └────────┬────────┘
             │                    │
             └────────┬───────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
         ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Supabase   │ │   Upstash   │ │ Cloudflare  │
│ PostgreSQL  │ │   Redis     │ │    R2       │
└─────────────┘ └─────────────┘ └─────────────┘
```

### 1.2 部署组件

| 组件 | 服务 | 用途 |
|------|------|------|
| 前端 | Vercel | React 应用托管 |
| 后端 | Railway | Node.js API 服务 |
| 数据库 | Supabase | PostgreSQL 数据库 |
| 缓存 | Upstash | Redis 缓存 |
| 存储 | Cloudflare R2 | 文件存储 |
| DNS/CDN | Cloudflare | 域名解析和加速 |

---

## 2. 环境要求

### 2.1 开发环境

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥20.x | 运行时环境 |
| npm | ≥10.x | 包管理器 |
| Git | ≥2.x | 版本控制 |
| Docker | ≥24.x | 容器化（可选） |

### 2.2 生产环境

#### 后端（Railway）

| 配置 | 要求 | 说明 |
|------|------|------|
| CPU | 1 vCPU | 基础配置 |
| 内存 | 512MB | 基础配置 |
| 存储 | 1GB | 日志和临时文件 |
| 实例数 | 2+ | 高可用 |

#### 前端（Vercel）

| 配置 | 要求 | 说明 |
|------|------|------|
| 构建时间 | ≤10 分钟 | 单次构建 |
| 带宽 | 自动扩展 | 按使用量计费 |
| 边缘节点 | 全球 | 自动 CDN |

#### 数据库（Supabase）

| 配置 | 要求 | 说明 |
|------|------|------|
| 版本 | PostgreSQL 15+ | 数据库版本 |
| 存储 | 10GB+ | 数据存储 |
| 连接数 | 100+ | 最大连接数 |

### 2.3 账号准备

需要注册以下服务账号：

- [ ] GitHub 账号
- [ ] Railway 账号（[railway.app](https://railway.app)）
- [ ] Vercel 账号（[vercel.com](https://vercel.com)）
- [ ] Supabase 账号（[supabase.com](https://supabase.com)）
- [ ] Upstash 账号（[upstash.com](https://upstash.com)）
- [ ] Cloudflare 账号（[cloudflare.com](https://cloudflare.com)）

---

## 3. 安装步骤

### 3.1 克隆代码

```bash
# 克隆仓库
git clone https://github.com/aiads/aiads-platform.git
cd aiads-platform

# 安装依赖
npm install
```

### 3.2 后端部署（Railway）

#### 步骤 1：创建 Railway 项目

1. 登录 Railway
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择 AIAds 仓库
5. 选择 `src/backend` 作为根目录

#### 步骤 2：配置环境变量

在 Railway 项目设置中添加以下环境变量：

```env
# 基础配置
NODE_ENV=production
PORT=3000

# 数据库
DATABASE_URL=postgresql://xxx:xxx@xxx.supabase.co:5432/postgres

# JWT 配置
JWT_SECRET=<生成一个随机密钥>
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://xxx:xxx@xxx.upstash.io:6379

# 社交平台 API
TIKTOK_CLIENT_ID=<tiktok-client-id>
TIKTOK_CLIENT_SECRET=<tiktok-client-secret>
YOUTUBE_API_KEY=<youtube-api-key>
INSTAGRAM_CLIENT_ID=<instagram-client-id>
INSTAGRAM_CLIENT_SECRET=<instagram-client-secret>

# 支付配置
STRIPE_SECRET_KEY=<stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
ALIPAY_APP_ID=<alipay-app-id>
ALIPAY_PRIVATE_KEY=<alipay-private-key>
WECHAT_PAY_MCH_ID=<wechat-mch-id>
WECHAT_PAY_PRIVATE_KEY=<wechat-private-key>

# 通讯服务
SENDGRID_API_KEY=<sendgrid-api-key>
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
TWILIO_PHONE_NUMBER=<twilio-phone>

# 存储配置
R2_ACCOUNT_ID=<cloudflare-account-id>
R2_ACCESS_KEY_ID=<r2-access-key>
R2_SECRET_ACCESS_KEY=<r2-secret-key>
R2_BUCKET=aiads-storage

# 应用配置
FRONTEND_URL=https://aiads.com
API_URL=https://api.aiads.com
```

#### 步骤 3：部署后端

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录 Railway
railway login

# 关联项目
railway link

# 部署
railway up
```

#### 步骤 4：验证部署

```bash
# 健康检查
curl https://api.aiads.com/health

# 预期响应
{"status": "ok", "version": "1.0.0"}
```

### 3.3 前端部署（Vercel）

#### 步骤 1：创建 Vercel 项目

1. 登录 Vercel
2. 点击 "Add New Project"
3. 导入 GitHub 仓库
4. 配置项目设置

#### 步骤 2：配置前端环境变量

在 Vercel 项目设置中添加：

```env
# 生产环境
VITE_API_URL=https://api.aiads.com
VITE_TIKTOK_CLIENT_ID=<tiktok-client-id>
VITE_YOUTUBE_API_KEY=<youtube-api-key>
VITE_SENTRY_DSN=<sentry-dsn>

# 测试环境（Preview）
VITE_API_URL=https://api-staging.aiads.com
```

#### 步骤 3：配置构建设置

| 设置 | 值 |
|------|-----|
| Framework | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node Version | 20.x |

#### 步骤 4：部署前端

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 部署
vercel --prod
```

### 3.4 数据库迁移

#### 步骤 1：获取数据库连接

从 Supabase 控制台获取连接字符串。

#### 步骤 2：运行迁移

```bash
# 安装 Prisma CLI
npm install -g prisma

# 应用迁移
npx prisma migrate deploy
  --schema=./src/backend/prisma/schema.prisma
  --datasource-url="$DATABASE_URL"
```

#### 步骤 3：种子数据

```bash
# 初始化基础数据
npx prisma db seed
  --schema=./src/backend/prisma/schema.prisma
```

### 3.5 域名配置

#### Cloudflare DNS 配置

| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| A | @ | Vercel IP | 开启 |
| CNAME | www | cname.vercel-dns.com | 开启 |
| CNAME | api | Railway 域名 | 开启 |

#### SSL 配置

1. 在 Cloudflare 开启 "Always Use HTTPS"
2. 设置 SSL/TLS 为 "Full (strict)"
3. 开启 "Automatic HTTPS Rewrites"

---

## 4. 配置说明

### 4.1 环境变量详解

#### 核心配置

| 变量 | 必填 | 说明 | 示例 |
|------|------|------|------|
| `NODE_ENV` | ✅ | 运行环境 | `production` |
| `PORT` | ✅ | 服务端口 | `3000` |
| `DATABASE_URL` | ✅ | 数据库连接 | `postgresql://...` |

#### 安全配置

| 变量 | 必填 | 说明 | 生成方式 |
|------|------|------|----------|
| `JWT_SECRET` | ✅ | JWT 密钥 | `openssl rand -hex 32` |
| `API_KEY_SECRET` | ✅ | API 密钥 | `openssl rand -hex 32` |

#### 第三方服务

| 服务 | 变量 | 获取方式 |
|------|------|----------|
| TikTok | `TIKTOK_CLIENT_ID` | TikTok Developer Portal |
| YouTube | `YOUTUBE_API_KEY` | Google Cloud Console |
| Instagram | `INSTAGRAM_CLIENT_ID` | Meta Developer Portal |
| Stripe | `STRIPE_SECRET_KEY` | Stripe Dashboard |
| SendGrid | `SENDGRID_API_KEY` | SendGrid Dashboard |

### 4.2 配置文件

#### 后端配置（config/default.yaml）

```yaml
server:
  port: 3000
  cors:
    origin: https://aiads.com
    credentials: true

database:
  pool:
    min: 2
    max: 10
  idleTimeoutMillis: 30000

redis:
  keyPrefix: aiads:
  retryStrategy:
    times: 3
    delay: 1000

auth:
  jwt:
    secret: ${JWT_SECRET}
    expiresIn: 7d
  refresh:
    expiresIn: 30d

storage:
  provider: r2
  bucket: aiads-storage
  maxFileSize: 10485760  # 10MB
```

#### 前端配置（.env.production）

```env
VITE_API_URL=https://api.aiads.com
VITE_APP_TITLE=AIAds - KOL 广告投放平台
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_ID=G-XXXXXXXXXX
```

---

## 5. 验证部署

### 5.1 健康检查

#### 后端健康检查

```bash
curl https://api.aiads.com/health
```

**预期响应：**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-24T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "connected"
  }
}
```

#### 前端健康检查

```bash
curl -I https://aiads.com
```

**预期响应：**
```http
HTTP/2 200
content-type: text/html
cache-control: public, max-age=0, must-revalidate
```

### 5.2 功能验证

#### 用户注册测试

```bash
curl -X POST https://api.aiads.com/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "phone": "+86-13800138000",
    "role": "advertiser",
    "verification_code": "123456"
  }'
```

#### API 认证测试

```bash
# 登录获取 Token
TOKEN=$(curl -X POST https://api.aiads.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123!"}' \
  | jq -r '.data.access_token')

# 使用 Token 访问受保护接口
curl https://api.aiads.com/v1/users/me \
  -H "Authorization: Bearer $TOKEN"
```

### 5.3 性能验证

#### 响应时间测试

```bash
# 使用 autocannon 进行压力测试
npx autocannon -c 10 -d 30 https://api.aiads.com/health
```

**预期结果：**
- 平均响应时间 < 100ms
- P99 响应时间 < 500ms
- 无错误请求

#### 负载测试

```bash
# 使用 k6 进行负载测试
k6 run tests/load/api-test.js
```

---

## 6. 常见问题

### 6.1 部署失败

#### 问题：Railway 部署失败

**原因：** 环境变量配置错误

**解决方案：**
1. 检查所有环境变量是否正确配置
2. 确认 DATABASE_URL 格式正确
3. 查看 Railway 日志：`railway logs`

#### 问题：Vercel 构建超时

**原因：** 构建时间超过限制

**解决方案：**
1. 优化构建配置
2. 使用增量静态生成
3. 拆分大型依赖

### 6.2 数据库连接

#### 问题：无法连接数据库

**原因：** 连接字符串错误或网络问题

**解决方案：**
1. 检查 DATABASE_URL 格式
2. 确认 Supabase 项目状态
3. 检查 IP 白名单设置

### 6.3 第三方集成

#### 问题：TikTok API 授权失败

**原因：** 应用配置错误

**解决方案：**
1. 检查 TikTok Developer 应用配置
2. 确认重定向 URI 正确
3. 验证 API 权限

#### 问题：支付回调失败

**原因：** Webhook 配置错误

**解决方案：**
1. 检查 Webhook URL 是否正确
2. 验证签名密钥
3. 查看支付平台日志

### 6.4 性能问题

#### 问题：API 响应慢

**原因：** 数据库查询慢或缓存未命中

**解决方案：**
1. 检查慢查询日志
2. 优化数据库索引
3. 增加 Redis 缓存

#### 问题：前端加载慢

**原因：** 资源过大或未压缩

**解决方案：**
1. 启用代码分割
2. 优化图片资源
3. 使用 CDN 加速

---

## 附录

### A. 部署检查清单

- [ ] Railway 项目创建
- [ ] 环境变量配置
- [ ] 后端部署成功
- [ ] Vercel 项目创建
- [ ] 前端环境变量配置
- [ ] 前端部署成功
- [ ] 数据库迁移完成
- [ ] 域名配置完成
- [ ] SSL 证书配置
- [ ] 健康检查通过
- [ ] 功能测试通过
- [ ] 性能测试通过

### B. 回滚流程

#### 后端回滚

```bash
# 查看历史部署
railway deployments

# 回滚到指定版本
railway rollback <deployment-id>
```

#### 前端回滚

```bash
# 在 Vercel 控制台
1. 进入项目
2. 选择 "Deployments"
3. 找到目标版本
4. 点击 "Promote to Production"
```

### C. 联系方式

| 渠道 | 信息 |
|------|------|
| 技术支持 | devops@aiads.com |
| 紧急联系 | +86-xxx-xxxx-xxxx |
| 状态页面 | status.aiads.com |

---

**AIAds 部署指南结束**
