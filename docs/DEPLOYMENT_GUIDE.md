# AIAds 部署指南

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds DevOps 团队

---

## 目录

1. [概述](#1-概述)
2. [部署架构](#2-部署架构)
3. [部署前准备](#3-部署前准备)
4. [后端部署 (Railway)](#4-后端部署-railway)
5. [前端部署 (Vercel)](#5-前端部署-vercel)
6. [数据库迁移](#6-数据库迁移)
7. [域名和 SSL](#7-域名和-ssl)
8. [部署验证](#8-部署验证)
9. [回滚流程](#9-回滚流程)

---

## 1. 概述

本文档介绍 AIAds 平台的完整部署流程，包括后端 (Railway) 和前端 (Vercel) 的部署配置。

### 1.1 部署环境

| 环境 | 分支 | 部署目标 | 触发方式 |
|-----|------|---------|---------|
| **开发环境** | `develop` | Railway/Vercel Preview | 自动 (Push) |
| **生产环境** | `main` | Railway/Vercel Production | 自动 (Push) |

### 1.2 部署组件

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

---

## 2. 部署架构

### 2.1 后端部署 (Railway)

**服务配置:**
- **实例类型**: Standard
- **CPU**: 1 vCPU
- **内存**: 512MB
- **自动扩展**:  enabled (1-5 实例)

**健康检查:**
- **端点**: `/health`
- **间隔**: 30 秒
- **超时**: 3 秒
- **失败阈值**: 3 次

### 2.2 前端部署 (Vercel)

**项目配置:**
- **框架**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Node Version**: 20.x

**边缘缓存:**
- 静态资源缓存 1 年
- HTML 缓存 1 小时
- API 请求代理到后端

---

## 3. 部署前准备

### 3.1 账号准备

1. **GitHub 账号** - 代码仓库
2. **Railway 账号** - 后端托管 ([railway.app](https://railway.app))
3. **Vercel 账号** - 前端托管 ([vercel.com](https://vercel.com))
4. **Supabase 账号** - 数据库 ([supabase.com](https://supabase.com))
5. **Upstash 账号** - Redis ([upstash.com](https://upstash.com))

### 3.2 创建 Railway 项目

1. 登录 Railway
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择 AIAds 仓库
5. 选择 `src/backend` 作为根目录

### 3.3 创建 Vercel 项目

1. 登录 Vercel
2. 点击 "Add New Project"
3. 导入 GitHub 仓库
4. 配置项目设置:
   - **Root Directory**: `src/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Node Version**: `20.x`

### 3.4 配置环境变量

#### Railway 环境变量

在 Railway 项目设置中添加:

```env
NODE_ENV=production
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<production-jwt-secret>
JWT_EXPIRES_IN=7d
REDIS_URL=<upstash-redis-url>
TIKTOK_CLIENT_ID=<tiktok-client-id>
YOUTUBE_API_KEY=<youtube-api-key>
INSTAGRAM_CLIENT_ID=<instagram-client-id>
STRIPE_SECRET_KEY=<stripe-secret-key>
SENDGRID_API_KEY=<sendgrid-api-key>
TWILIO_ACCOUNT_SID=<twilio-sid>
TWILIO_AUTH_TOKEN=<twilio-token>
```

#### Vercel 环境变量

在 Vercel 项目设置中添加:

```env
VITE_API_URL=<railway-app-url>/api/v1
VITE_TIKTOK_CLIENT_ID=<tiktok-client-id>
VITE_YOUTUBE_API_KEY=<youtube-api-key>
```

### 3.5 配置 GitHub Secrets

在 GitHub 仓库 **Settings > Secrets and variables > Actions** 中添加:

```bash
# Railway 部署
RAILWAY_TOKEN=<railway-api-token>

# Vercel 部署
VERCEL_TOKEN=<vercel-api-token>
VERCEL_ORG_ID=<vercel-org-id>
VERCEL_PROJECT_ID=<vercel-project-id>

# 应用配置
DATABASE_URL=<production-database-url>
JWT_SECRET=<production-jwt-secret>
REDIS_URL=<production-redis-url>
```

**获取 Railway Token:**
```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 获取 token
railway token
```

**获取 Vercel Token:**
1. 访问 [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. 创建新的 API Token
3. 复制 Token 到 GitHub Secrets

---

## 4. 后端部署 (Railway)

### 4.1 自动部署 (推荐)

配置完成后，Railway 会自动部署:
- Push 到 `main` → 生产环境
- Push 到 `develop` → 预览环境

### 4.2 手动部署

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up
```

### 4.3 查看部署状态

```bash
# 查看日志
railway logs

# 查看部署历史
railway deployments

# 打开项目
railway open
```

### 4.4 配置自定义域名

1. 在 Railway 项目设置中，进入 "Domains"
2. 点击 "Generate Domain" 或添加自定义域名
3. 配置 DNS:
   ```
   Type: CNAME
   Name: api
   Value: <railway-domain>
   ```

---

## 5. 前端部署 (Vercel)

### 5.1 自动部署 (推荐)

配置完成后，Vercel 会自动部署:
- Push 到 `main` → 生产环境
- Push 到 `develop` → Preview Deployment

### 5.2 手动部署 (Vercel CLI)

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署到 Preview
vercel

# 部署到生产
vercel --prod
```

### 5.3 查看部署状态

```bash
# 查看部署列表
vercel ls

# 查看日志
vercel logs <deployment-url>

# 打开项目
vercel open
```

### 5.4 配置自定义域名

1. 在 Vercel 项目设置中，进入 "Domains"
2. 添加自定义域名 (如 `app.aiads.com`)
3. 配置 DNS:
   ```
   Type: CNAME
   Name: app
   Value: cname.vercel-dns.com
   ```

---

## 6. 数据库迁移

### 6.1 运行迁移 (Railway)

```bash
# 连接到 Railway
railway run npx prisma migrate deploy

# 或者手动执行
railway shell
> npx prisma migrate deploy
> npx prisma db seed
```

### 6.2 本地运行迁移

```bash
cd src/backend

# 生成 Prisma Client
npx prisma generate

# 运行迁移
npx prisma migrate deploy

# 种子数据
npx prisma db seed
```

### 6.3 数据库备份

```bash
# 使用 Supabase Dashboard 备份
# 或命令行备份
pg_dump <DATABASE_URL> > backup.sql

# 恢复
psql <DATABASE_URL> < backup.sql
```

---

## 7. 域名和 SSL

### 7.1 域名配置

**推荐域名结构:**
```
aiads.com           # 主域名 (前端)
www.aiads.com       # 前端
api.aiads.com       # 后端 API
app.aiads.com       # Web 应用
admin.aiads.com     # 管理后台
```

### 7.2 DNS 配置

在域名注册商处配置:

| 类型 | 名称 | 值 | TTL |
|-----|------|-----|-----|
| CNAME | `www` | `cname.vercel-dns.com` | Auto |
| CNAME | `api` | `<railway-domain>` | Auto |
| CNAME | `app` | `cname.vercel-dns.com` | Auto |
| A | `@` | `76.76.21.21` (Vercel) | Auto |

### 7.3 SSL 证书

- **Vercel**: 自动提供 Let's Encrypt SSL
- **Railway**: 自动提供 Let's Encrypt SSL

无需手动配置。

---

## 8. 部署验证

### 8.1 健康检查

```bash
# 后端健康检查
curl https://api.aiads.com/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2026-03-24T10:00:00.000Z"
}

# 前端健康检查
curl https://app.aiads.com/health

# 预期响应
OK
```

### 8.2 功能测试清单

**后端 API:**
- [ ] 用户注册/登录
- [ ] JWT Token 生成和验证
- [ ] 数据库连接
- [ ] Redis 缓存
- [ ] 第三方 API 集成

**前端:**
- [ ] 页面加载
- [ ] API 请求
- [ ] 用户认证流程
- [ ] 表单提交
- [ ] 文件上传

### 8.3 性能测试

```bash
# 使用 k6 进行负载测试
k6 run tests/performance/api-load-test.js

# 使用 Lighthouse 测试前端
lighthouse https://app.aiads.com --view
```

---

## 9. 回滚流程

### 9.1 Railway 回滚

```bash
# 查看部署历史
railway deployments

# 回滚到指定版本
railway rollback <deployment-id>
```

### 9.2 Vercel 回滚

```bash
# 查看部署历史
vercel ls

# 回滚
vercel rollback <deployment-url>
```

### 9.3 数据库回滚

```bash
# 回滚最后一次迁移
npx prisma migrate resolve --rolled-back <migration-name>

# 或恢复到特定迁移
npx prisma migrate reset
```

### 9.4 紧急回滚脚本

```bash
#!/bin/bash
# scripts/rollback.sh

echo "🚨 开始紧急回滚..."

# 回滚 Railway
railway rollback $1

# 回滚 Vercel
vercel rollback $2

echo "✅ 回滚完成"
```

---

## 10. 部署检查清单

### 10.1 部署前检查

- [ ] 所有测试通过 (CI 流水线)
- [ ] 代码审查完成
- [ ] 环境变量已更新
- [ ] 数据库迁移脚本已准备
- [ ] 回滚计划已制定

### 10.2 部署后检查

- [ ] 健康检查通过
- [ ] 功能测试通过
- [ ] 监控告警正常
- [ ] 日志收集正常
- [ ] 性能指标正常

### 10.3 监控检查

- [ ] Sentry 无新错误
- [ ] Logtail 日志正常
- [ ] Prometheus 指标正常
- [ ] Uptime Kuma 服务在线

---

## 11. 故障排查

### 11.1 常见问题

#### 部署失败

```bash
# 查看 Railway 日志
railway logs --follow

# 查看 Vercel 构建日志
vercel logs <deployment-url>
```

#### 数据库连接失败

1. 检查 DATABASE_URL 是否正确
2. 检查 Supabase 项目状态
3. 检查网络白名单

#### API 请求失败

1. 检查 CORS 配置
2. 检查 API URL 配置
3. 检查 JWT Token

### 11.2 联系支持

- **Railway Support**: [railway.app/support](https://railway.app/support)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Supabase Support**: [supabase.com/support](https://supabase.com/support)

---

## 12. 下一步

部署完成后，请参考:
- [监控配置](./MONITORING_SETUP.md) - 设置监控和告警
- [运维手册](./OPERATIONS_RUNBOOK.md) - 日常运维操作
