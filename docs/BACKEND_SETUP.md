# AIAds 后端开发环境搭建指南

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 开发团队

---

## 1. 环境要求

### 1.1 必需软件

| 软件 | 版本 | 说明 |
|-----|------|------|
| Node.js | >= 20.0.0 | 运行时环境 |
| npm | >= 9.0.0 | 包管理器 |
| PostgreSQL | >= 15.0 | 数据库 (或使用 Supabase) |
| Redis | >= 7.0 | 缓存 (或使用 Upstash) |

### 1.2 推荐工具

- **IDE**: Visual Studio Code
- **数据库管理**: pgAdmin, DBeaver, 或 Supabase Dashboard
- **API 测试**: Postman, Insomnia
- **版本控制**: Git

---

## 2. 快速开始

### 2.1 克隆项目

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds/src/backend
```

### 2.2 安装依赖

```bash
npm install
```

### 2.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
# 至少需要配置以下变量:
# - DATABASE_URL
# - JWT_SECRET
# - JWT_REFRESH_SECRET
```

### 2.4 初始化数据库

```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# (可选) 添加初始数据
npm run prisma:seed
```

### 2.5 启动开发服务器

```bash
# 启动开发服务器 (支持热重载)
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

---

## 3. 项目结构

```
src/backend/
├── src/
│   ├── config/          # 配置文件
│   │   ├── index.ts     # 主配置
│   │   ├── database.ts  # 数据库配置
│   │   └── redis.ts     # Redis 配置
│   │
│   ├── controllers/     # 控制器 (处理 HTTP 请求)
│   │   ├── auth.controller.ts
│   │   └── users.controller.ts
│   │
│   ├── services/        # 业务逻辑层
│   │   ├── auth.service.ts
│   │   └── users.service.ts
│   │
│   ├── middleware/      # 中间件
│   │   ├── auth.ts      # 认证中间件
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   └── validation.ts
│   │
│   ├── routes/          # 路由定义
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── index.ts
│   │
│   ├── types/           # TypeScript 类型定义
│   │   └── index.ts
│   │
│   ├── utils/           # 工具函数
│   │   ├── logger.ts    # 日志
│   │   ├── validator.ts # 验证
│   │   ├── crypto.ts    # 加密
│   │   └── helpers.ts   # 辅助函数
│   │
│   ├── app.ts           # Express 应用配置
│   └── index.ts         # 入口文件
│
├── prisma/
│   ├── schema.prisma    # Prisma 数据模型
│   └── migrations/      # 数据库迁移
│
├── tests/               # 测试文件
├── logs/                # 日志文件 (运行时生成)
├── dist/                # 编译输出 (运行时生成)
│
├── .env.example         # 环境变量模板
├── package.json
├── tsconfig.json
└── README.md
```

---

## 4. 开发指南

### 4.1 代码规范

项目使用 ESLint + Prettier 进行代码质量检查:

```bash
# 检查代码
npm run lint

# 自动修复
npm run lint:fix

# 格式化代码
npm run format
```

### 4.2 数据库操作

```bash
# 查看数据库
npx prisma studio

# 创建新迁移
npx prisma migrate dev --name <migration_name>

# 重置数据库
npx prisma migrate reset

# 生成 Prisma 客户端
npx prisma generate
```

### 4.3 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 4.4 构建生产版本

```bash
# 编译 TypeScript
npm run build

# 启动生产服务器
npm start
```

---

## 5. 数据库配置

### 5.1 使用 Supabase (推荐)

1. 访问 [Supabase](https://supabase.com) 创建项目
2. 获取数据库连接字符串
3. 更新 `.env` 中的 `DATABASE_URL`

```
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 5.2 使用本地 PostgreSQL

```bash
# 使用 Docker 启动 PostgreSQL
docker run -d \
  --name aiads-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aiads \
  -p 5432:5432 \
  postgres:15

# 更新 .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aiads
```

---

## 6. Redis 配置

### 6.1 使用 Upstash (推荐)

1. 访问 [Upstash](https://upstash.com) 创建 Redis 实例
2. 获取连接字符串
3. 更新 `.env` 中的 `REDIS_URL`

```
REDIS_URL=rediss://default:[password]@[region].upstash.io:6379
```

### 6.2 使用本地 Redis

```bash
# 使用 Docker 启动 Redis
docker run -d \
  --name aiads-redis \
  -p 6379:6379 \
  redis:7

# 更新 .env
REDIS_URL=redis://localhost:6379
```

---

## 7. 常见问题

### 7.1 端口被占用

```bash
# 修改 .env 中的 PORT
PORT=3001
```

### 7.2 数据库连接失败

- 检查 `DATABASE_URL` 是否正确
- 确认数据库服务已启动
- 检查防火墙设置

### 7.3 Prisma 客户端过期

```bash
# 重新生成 Prisma 客户端
npx prisma generate
```

### 7.4 TypeScript 编译错误

```bash
# 清理并重新编译
rm -rf dist/
npm run build
```

---

## 8. 部署指南

### 8.1 Railway 部署

1. 连接 GitHub 仓库
2. 配置环境变量
3. 自动部署

### 8.2 Docker 部署

```bash
# 构建镜像
docker build -t aiads-backend .

# 运行容器
docker run -d \
  --name aiads-backend \
  -p 3000:3000 \
  --env-file .env \
  aiads-backend
```

---

## 9. 监控与日志

### 9.1 查看日志

```bash
# 开发环境日志在控制台输出
# 生产环境日志在 logs/ 目录

tail -f logs/combined.log
tail -f logs/error.log
```

### 9.2 集成 Sentry

1. 在 `.env` 中配置 `SENTRY_DSN`
2. 错误会自动上报到 Sentry

### 9.3 集成 Logtail

1. 在 `.env` 中配置 `LOGTAIL_TOKEN`
2. 日志会自动发送到 Logtail

---

## 10. 下一步

完成环境搭建后，请参考:

- [API 实现文档](./API_IMPLEMENTATION.md) - 了解 API 接口详情
- [系统架构文档](../../SYSTEM_ARCHITECTURE.md) - 了解整体架构
- [数据库设计文档](../../DATABASE_SCHEMA.md) - 了解数据模型

---

## 11. 技术支持

如有问题，请联系:

- Email: dev@aiads.com
- Slack: #backend-dev
