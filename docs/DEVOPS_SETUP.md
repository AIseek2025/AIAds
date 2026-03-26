# AIAds DevOps 环境搭建指南

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds DevOps 团队

---

## 目录

1. [概述](#1-概述)
2. [ prerequisites](#2-环境要求)
3. [本地开发环境](#3-本地开发环境)
4. [CI/CD 配置](#4-cicd-配置)
5. [Docker 配置](#5-docker-配置)
6. [环境变量配置](#6-环境变量配置)
7. [故障排查](#7-故障排查)

---

## 1. 概述

本文档介绍 AIAds 平台的 DevOps 环境搭建流程，包括 CI/CD 流水线、Docker 容器化、监控配置等。

### 1.1 技术栈

| 类别 | 工具 | 用途 |
|-----|------|------|
| **CI/CD** | GitHub Actions | 自动化测试和部署 |
| **容器化** | Docker + Docker Compose | 本地开发和测试环境 |
| **前端部署** | Vercel | 生产环境前端托管 |
| **后端部署** | Railway | 生产环境后端托管 |
| **监控** | Prometheus + Grafana | 性能监控和告警 |
| **日志** | Winston + Logtail | 集中式日志管理 |

### 1.2 项目结构

```
AIAds/
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI 流水线
│       └── deploy.yml      # CD 流水线
├── src/
│   ├── backend/
│   │   ├── Dockerfile      # 后端容器配置
│   │   └── ...
│   └── frontend/
│       ├── Dockerfile      # 前端容器配置
│       ├── nginx.conf      # Nginx 配置
│       └── ...
├── configs/
│   └── monitoring/
│       └── prometheus.yml  # Prometheus 配置
├── scripts/
│   └── deploy.sh           # 部署脚本
├── docker-compose.yml      # Docker Compose 配置
├── .env.example            # 环境变量模板
└── .gitignore              # Git 忽略配置
```

---

## 2. 环境要求

### 2.1 开发环境

| 工具 | 最低版本 | 推荐版本 |
|-----|---------|---------|
| Node.js | 18.x | 20.x LTS |
| npm | 9.x | 10.x |
| Docker | 20.x | 24.x |
| Docker Compose | 2.x | 2.20.x |
| Git | 2.x | 2.40.x |

### 2.2 安装指南

#### macOS

```bash
# 安装 Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node@20

# 安装 Docker
brew install --cask docker
```

#### Linux (Ubuntu)

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Windows

1. 下载并安装 [Node.js 20 LTS](https://nodejs.org/)
2. 下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
3. 安装 [Git for Windows](https://gitforwindows.org/)

---

## 3. 本地开发环境

### 3.1 克隆项目

```bash
git clone https://github.com/your-org/aiads.git
cd aiads
```

### 3.2 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vim .env
```

**必要的环境变量:**

```env
# 数据库
DATABASE_URL=postgresql://postgres:password@localhost:5432/aiads
DB_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Redis
REDIS_URL=redis://localhost:6379

# API
API_URL=http://localhost:3000/api/v1
VITE_API_URL=http://localhost:3000/api/v1
```

### 3.3 启动 Docker 服务

```bash
# 启动所有服务 (后端、前端、PostgreSQL、Redis)
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 3.4 本地开发

```bash
# 后端开发
cd src/backend
npm install
npm run dev

# 前端开发 (新终端)
cd src/frontend
npm install
npm run dev
```

### 3.5 运行测试

```bash
# 后端测试
cd src/backend
npm test
npm run test:coverage

# 前端测试
cd src/frontend
npm test
npm run test:coverage

# E2E 测试
cd tests
npm install
npm run test:e2e
```

---

## 4. CI/CD 配置

### 4.1 GitHub Actions 设置

#### 4.1.1 配置 Secrets

在 GitHub 仓库中，进入 **Settings > Secrets and variables > Actions**，添加以下 secrets:

**部署相关:**
```
RAILWAY_TOKEN=<your-railway-token>
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
```

**应用相关:**
```
DATABASE_URL=<production-database-url>
JWT_SECRET=<production-jwt-secret>
REDIS_URL=<production-redis-url>
```

#### 4.1.2 CI 流水线

CI 流水线在以下情况触发:
- Push 到 `main` 或 `develop` 分支
- Pull Request 到 `main` 分支

**流程:**
1. 后端测试 (lint + test + coverage)
2. 前端测试 (lint + test + coverage)
3. E2E 测试
4. 构建验证

#### 4.1.3 CD 流水线

CD 流水线在以下情况触发:
- Push 到 `main` 分支

**流程:**
1. 构建并部署后端到 Railway
2. 构建并部署前端到 Vercel

### 4.2 手动触发部署

```bash
# 运行部署脚本
./scripts/deploy.sh
```

---

## 5. Docker 配置

### 5.1 服务说明

| 服务 | 端口 | 说明 |
|-----|------|------|
| api | 3000 | Node.js 后端 API |
| web | 80 | Nginx 前端 |
| postgres | 5432 | PostgreSQL 数据库 |
| redis | 6379 | Redis 缓存 |

### 5.2 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f api
docker-compose logs -f web

# 进入容器
docker-compose exec api sh
docker-compose exec web sh

# 重建容器
docker-compose up -d --build

# 清理数据卷 (危险操作!)
docker-compose down -v
```

### 5.3 数据库管理

```bash
# 连接数据库
docker-compose exec postgres psql -U postgres -d aiads

# 备份数据库
docker-compose exec postgres pg_dump -U postgres aiads > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres -d aiads < backup.sql
```

---

## 6. 环境变量配置

### 6.1 环境变量文件

| 文件 | 用途 | 是否提交 |
|-----|------|---------|
| `.env.example` | 环境变量模板 | ✅ 是 |
| `.env` | 本地开发环境 | ❌ 否 |
| `.env.local` | 本地覆盖配置 | ❌ 否 |
| `.env.production` | 生产环境配置 | ❌ 否 |

### 6.2 环境变量说明

#### 核心配置

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT 签名密钥 (至少 32 字符) | `your-secret-key` |
| `JWT_EXPIRES_IN` | Token 有效期 | `7d` |
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |

#### 第三方服务

| 变量名 | 说明 | 获取方式 |
|-------|------|---------|
| `TIKTOK_CLIENT_ID` | TikTok API 客户端 ID | TikTok Developer Portal |
| `YOUTUBE_API_KEY` | YouTube Data API Key | Google Cloud Console |
| `INSTAGRAM_CLIENT_ID` | Instagram Graph API ID | Meta Developer Portal |

#### 支付服务

| 变量名 | 说明 | 获取方式 |
|-------|------|---------|
| `STRIPE_SECRET_KEY` | Stripe 密钥 | Stripe Dashboard |
| `ALIPAY_APP_ID` | 支付宝应用 ID | 支付宝开放平台 |
| `WECHAT_PAY_APP_ID` | 微信支付应用 ID | 微信支付商户平台 |

---

## 7. 故障排查

### 7.1 常见问题

#### Docker 容器无法启动

```bash
# 查看容器日志
docker-compose logs api

# 检查端口占用
lsof -i :3000
lsof -i :5432

# 重启 Docker 服务
docker-compose down
docker-compose up -d
```

#### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps postgres

# 测试数据库连接
docker-compose exec postgres pg_isready

# 查看数据库日志
docker-compose logs postgres
```

#### CI/CD 失败

1. 检查 GitHub Actions logs
2. 验证 secrets 配置正确
3. 本地运行相同命令测试

### 7.2 性能优化

#### Docker 构建优化

```bash
# 清理未使用的镜像和容器
docker system prune -a

# 使用构建缓存
docker-compose build --no-cache
```

#### 数据库优化

```sql
-- 查看慢查询
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- 分析表
ANALYZE;

-- 重建索引
REINDEX DATABASE aiads;
```

---

## 8. 下一步

完成环境搭建后，请参考:
- [部署指南](./DEPLOYMENT_GUIDE.md) - 生产环境部署流程
- [监控配置](./MONITORING_SETUP.md) - Prometheus 和 Grafana 配置
