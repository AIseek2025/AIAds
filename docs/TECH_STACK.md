# AIAds 技术选型报告

**版本**: 1.0  
**创建日期**: 2026 年 3 月 24 日  
**作者**: AIAds 架构团队  
**保密级别**: 内部机密

---

## 1. 技术选型概述

### 1.1 选型原则

```
1. 成熟稳定：选择经过市场验证的技术
2. 开发效率：优先考虑开发体验和效率
3. 性能适中：满足 MVP 需求，可后续优化
4. 成本可控：优先使用托管服务，降低运维成本
5. 生态丰富：社区活跃，文档完善，易招人
6. 可扩展性：支持业务增长，便于扩展
```

### 1.2 技术栈总览

```
┌─────────────────────────────────────────────────────────────────┐
│                      AIAds Technology Stack                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Frontend Layer                                                  │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │   React 18  │ │ TypeScript  │ │  MUI v5     │ │  Zustand    ││
│ │   UI 框架    │ │   类型系统   │ │   UI 组件库   │ │   状态管理   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │React Query  │ │    Axios    │ │  React Hook │ │   Vite      ││
│ │  数据获取    │ │  HTTP 客户端  │ │    Form     │ │   构建工具   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend Layer                                                   │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │  Node.js 20 │ │   Express   │ │  TypeScript │ │   Prisma    ││
│ │   运行时     │ │   Web 框架   │ │   类型系统   │ │    ORM      ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │    Zod      │ │   Winston   │ │   JWT       │ │   bcrypt    ││
│ │   验证库     │ │   日志库     │ │   认证      │ │   加密      ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Data Layer                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │ PostgreSQL  │ │   Redis     │ │ Cloudflare  │ │   Supabase  ││
│ │   主数据库   │ │   缓存      │ │    R2       │ │    Auth     ││
│ │  (Supabase) │ │  (Upstash)  │ │   对象存储   │ │   认证服务   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                            │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │   Vercel    │ │   Railway   │ │  Cloudflare │ │   GitHub    ││
│ │  前端托管    │ │  后端托管    │ │    CDN      │ │   Actions   ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│ │   Sentry    │ │   Logtail   │ │  Uptime Kuma│ │   Docker    ││
│ │  错误追踪    │ │  日志管理    │ │   服务监控   │ │   容器化    ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 前端技术选型

### 2.1 核心框架

#### React 18

| 项目 | 说明 |
|-----|------|
| **版本** | 18.2+ |
| **选择理由** | |
| ✓ | 生态最丰富，组件库最多 |
| ✓ | 团队熟悉度高，学习成本低 |
| ✓ | Concurrent Features 提升性能 |
| ✓ | 稳定的长期支持版本 |
| **替代方案** | Vue 3, Angular 17 |
| **不选原因** | Vue 生态相对较小，Angular 学习曲线陡峭 |

**关键特性:**
```typescript
// Concurrent Features
import { Suspense, useTransition, useDeferredValue } from 'react';

// 示例：使用 Suspense 进行数据加载
<Suspense fallback={<Loading />}>
  <UserProfile userId={userId} />
</Suspense>

// 示例：使用 useTransition 进行非阻塞更新
const [isPending, startTransition] = useTransition();
startTransition(() => {
  setSearchQuery(input);
});
```

#### TypeScript

| 项目 | 说明 |
|-----|------|
| **版本** | 5.0+ |
| **选择理由** | |
| ✓ | 类型安全，减少运行时错误 |
| ✓ | 优秀的 IDE 支持 |
| ✓ | 大型项目必备 |
| ✓ | 与 React 完美集成 |

**配置要点:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

---

### 2.2 UI 组件库

#### Material-UI (MUI) v5

| 项目 | 说明 |
|-----|------|
| **版本** | 5.15+ |
| **选择理由** | |
| ✓ | 企业级组件库，组件丰富 |
| ✓ | 完善的主题定制系统 |
| ✓ | 优秀的文档和示例 |
| ✓ | 活跃的社区支持 |
| **替代方案** | Ant Design, Chakra UI, Mantine |
| **不选原因** | Ant Design 风格偏后台，Chakra/Mantine 生态相对较小 |

**使用示例:**
```typescript
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainLayout />
    </ThemeProvider>
  );
}
```

---

### 2.3 状态管理

#### Zustand

| 项目 | 说明 |
|-----|------|
| **版本** | 4.5+ |
| **选择理由** | |
| ✓ | 轻量级 (1KB) |
| ✓ | API 简单，学习成本低 |
| ✓ | 无需 Provider 包裹 |
| ✓ | TypeScript 支持好 |
| **替代方案** | Redux Toolkit, Jotai, Valtio |
| **不选原因** | Redux 过于复杂，Jotai/Valtio 生态较小 |

**使用示例:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

#### React Query (TanStack Query)

| 项目 | 说明 |
|-----|------|
| **版本** | 5.0+ |
| **选择理由** | |
| ✓ | 服务端状态管理最佳实践 |
| ✓ | 自动缓存和重新验证 |
| ✓ | 乐观更新支持 |
| ✓ | 无限滚动和分页支持 |

**使用示例:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 查询
function useCampaigns(filters: CampaignFilters) {
  return useQuery({
    queryKey: ['campaigns', filters],
    queryFn: () => fetchCampaigns(filters),
    staleTime: 5 * 60 * 1000, // 5 分钟
    gcTime: 30 * 60 * 1000,   // 30 分钟
  });
}

// 变更
function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
```

---

### 2.4 构建工具

#### Vite

| 项目 | 说明 |
|-----|------|
| **版本** | 5.0+ |
| **选择理由** | |
| ✓ | 极速的开发服务器启动 |
| ✓ | 基于 ESM 的热更新 |
| ✓ | 内置 TypeScript 支持 |
| ✓ | 优化的生产构建 |
| **替代方案** | Webpack, esbuild, Turbopack |
| **不选原因** | Webpack 配置复杂速度慢，Turbopack 还不够成熟 |

**配置示例:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
        },
      },
    },
  },
});
```

---

### 2.5 其他前端库

| 库 | 用途 | 版本 |
|---|------|------|
| **Axios** | HTTP 客户端 | 1.6+ |
| **React Hook Form** | 表单处理 | 7.49+ |
| **React Router** | 路由 | 6.21+ |
| **date-fns** | 日期处理 | 3.0+ |
| **numeral** | 数字格式化 | 2.0+ |
| **recharts** | 图表 | 2.10+ |
| **react-hot-toast** | 通知 | 2.4+ |
| **clsx** | class 合并 | 2.1+ |
| **@tanstack/react-table** | 表格 | 8.11+ |

---

## 3. 后端技术选型

### 3.1 运行时和框架

#### Node.js 20 LTS

| 项目 | 说明 |
|-----|------|
| **版本** | 20.x LTS |
| **选择理由** | |
| ✓ | 性能优秀 (相比 Node 18 提升 30%) |
| ✓ | 长期支持版本 |
| ✓ | 原生 fetch API |
| ✓ | 稳定的 ESM 支持 |
| **替代方案** | Bun, Deno, Node 18 |
| **不选原因** | Bun/Deno 生态不够成熟 |

#### Express

| 项目 | 说明 |
|-----|------|
| **版本** | 4.18+ |
| **选择理由** | |
| ✓ | 最成熟的 Node.js Web 框架 |
| ✓ | 中间件生态丰富 |
| ✓ | 学习成本低 |
| ✓ | 足够满足 MVP 需求 |
| **替代方案** | Fastify, NestJS, Koa |
| **不选原因** | Fastify 生态较小，NestJS 过于复杂，Koa 需要更多样板代码 |

**项目结构:**
```typescript
// src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/users.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// 安全中间件
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));

// 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 每个 IP 最多 100 个请求
});
app.use('/api', limiter);

// 解析中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

export default app;
```

---

### 3.2 数据库 ORM

#### Prisma

| 项目 | 说明 |
|-----|------|
| **版本** | 5.8+ |
| **选择理由** | |
| ✓ | 类型安全 (自动生成 TypeScript 类型) |
| ✓ | 优秀的开发体验 |
| ✓ | 迁移管理方便 |
| ✓ | 支持 PostgreSQL 所有特性 |
| **替代方案** | TypeORM, Drizzle, Kysely |
| **不选原因** | TypeORM 类型支持不够好，Drizzle/Kysely 学习曲线陡峭 |

**Schema 示例:**
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  advertiser
  kol
  admin
  super_admin
}

enum UserStatus {
  pending
  active
  suspended
  deleted
}

model User {
  id              String     @id @default(uuid())
  email           String     @unique
  phone           String?    @unique
  passwordHash    String     @map("password_hash")
  nickname        String?
  avatarUrl       String?    @map("avatar_url")
  role            UserRole   @default(advertiser)
  status          UserStatus @default(pending)
  emailVerified   Boolean    @default(false) @map("email_verified")
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")

  advertiser      Advertiser?
  kol             Kol?
  notifications   Notification[]

  @@map("users")
}

model Advertiser {
  id                String   @id @default(uuid())
  userId            String   @unique @map("user_id")
  companyName       String   @map("company_name")
  walletBalance     Decimal  @default(0) @map("wallet_balance")
  verificationStatus String  @default("pending") @map("verification_status")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaigns         Campaign[]
  orders            Order[]
  transactions      Transaction[]

  @@map("advertisers")
}

model Kol {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id")
  platform        String
  platformId      String   @map("platform_id")
  platformUsername String  @map("platform_username")
  followers       Int      @default(0)
  engagementRate  Decimal  @default(0) @map("engagement_rate")
  status          String   @default("pending")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders          Order[]

  @@map("kols")
}

model Campaign {
  id            String   @id @default(uuid())
  advertiserId  String   @map("advertiser_id")
  title         String
  budget        Decimal
  status        String   @default("draft")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  advertiser    Advertiser @relation(fields: [advertiserId], references: [id], onDelete: Cascade)
  orders        Order[]

  @@map("campaigns")
}

model Order {
  id           String   @id @default(uuid())
  campaignId   String   @map("campaign_id")
  kolId        String   @map("kol_id")
  advertiserId String   @map("advertiser_id")
  orderNo      String   @unique @map("order_no")
  price        Decimal
  status       String   @default("pending")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  campaign     Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  kol          Kol          @relation(fields: [kolId], references: [id], onDelete: Cascade)
  transactions Transaction[]

  @@map("orders")
}

model Transaction {
  id            String   @id @default(uuid())
  orderId       String?  @map("order_id")
  type          String
  amount        Decimal
  status        String   @default("pending")
  createdAt     DateTime @default(now()) @map("created_at")

  order         Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@map("transactions")
}
```

**使用示例:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 查询
const campaigns = await prisma.campaign.findMany({
  where: {
    advertiserId,
    status: 'active',
  },
  include: {
    orders: {
      select: {
        id: true,
        status: true,
        price: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
  skip: (page - 1) * pageSize,
  take: pageSize,
});

// 事务
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: {...} });
  await tx.transaction.create({ data: {...} });
  await tx.advertiser.update({
    where: { id: advertiserId },
    data: { walletBalance: { decrement: price } },
  });
});
```

---

### 3.3 验证库

#### Zod

| 项目 | 说明 |
|-----|------|
| **版本** | 3.22+ |
| **选择理由** | |
| ✓ | TypeScript 优先 |
| ✓ | API 简洁易用 |
| ✓ | 运行时验证 + 类型推断 |
| ✓ | 可与 Prisma 集成 |
| **替代方案** | Joi, Yup, class-validator |
| **不选原因** | Joi/Yup 类型支持不够好，class-validator 需要装饰器 |

**使用示例:**
```typescript
import { z } from 'zod';

// 登录验证
const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(8, '密码至少 8 位'),
});

// 创建活动验证
const createCampaignSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  budget: z.number().positive(),
  targetAudience: z.object({
    ageRange: z.string().optional(),
    gender: z.enum(['male', 'female', 'all']).optional(),
    locations: z.array(z.string()).optional(),
  }).optional(),
});

// 使用
function validateLogin(data: unknown) {
  return loginSchema.parse(data);
}

// 类型推断
type LoginInput = z.infer<typeof loginSchema>;
```

---

### 3.4 认证和授权

#### JWT + bcrypt

| 项目 | 说明 |
|-----|------|
| **JWT 库** | jsonwebtoken 9.0+ |
| **加密库** | bcrypt 5.1+ |
| **选择理由** | |
| ✓ | 行业标准 |
| ✓ | 无状态认证 |
| ✓ | 支持刷新 Token 机制 |
| ✓ | 与 Supabase Auth 兼容 |

**实现示例:**
```typescript
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// 密码加密
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// 密码验证
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成 Token
function generateToken(payload: JwtPayload, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn, algorithm: 'RS256' });
}

// 验证 Token
function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret, { algorithms: ['RS256'] }) as JwtPayload;
}
```

---

### 3.5 日志和监控

#### Winston

| 项目 | 说明 |
|-----|------|
| **版本** | 3.11+ |
| **选择理由** | |
| ✓ | 最流行的 Node.js 日志库 |
| ✓ | 支持多种传输 (文件、控制台、远程) |
| ✓ | 可自定义格式 |
| ✓ | 性能优秀 |

**配置示例:**
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// 使用
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });
logger.error('Database connection failed', { error });
```

---

## 4. 数据层技术选型

### 4.1 主数据库

#### PostgreSQL (Supabase)

| 项目 | 说明 |
|-----|------|
| **版本** | PostgreSQL 15 |
| **服务商** | Supabase |
| **选择理由** | |
| ✓ | 功能最强大的开源关系数据库 |
| ✓ | Supabase 提供托管服务 (含 Auth、Realtime) |
| ✓ | 支持 JSONB、全文搜索等高级特性 |
| ✓ | Row Level Security 提供细粒度权限控制 |
| **替代方案** | MySQL, MongoDB, PlanetScale |
| **不选原因** | MySQL 功能相对较少，MongoDB 不适合关系型数据 |

**Supabase 配置:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// 使用 RLS
// 在数据库中设置:
// ALTER TABLE users ENABLE ROW LEVEL SECURITY;
// CREATE POLICY users_select_own ON users FOR SELECT USING (id = current_user_id);
```

---

### 4.2 缓存

#### Redis (Upstash)

| 项目 | 说明 |
|-----|------|
| **版本** | Redis 7 |
| **服务商** | Upstash |
| **选择理由** | |
| ✓ | Serverless Redis，按需付费 |
| ✓ | 全球边缘节点 |
| ✓ | 支持 Redis 所有命令 |
| ✓ | 内置持久化 |
| **替代方案** | AWS ElastiCache, Redis Cloud |
| **不选原因** | Upstash 更适合初创项目，成本更低 |

**使用示例:**
```typescript
import { Redis } from 'ioredis';

const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// 缓存 KOL 数据
async function getCachedKol(kolId: string) {
  const cached = await redis.get(`kol:profile:${kolId}`);
  if (cached) {
    return JSON.parse(cached);
  }
  
  const kol = await prisma.kol.findUnique({ where: { id: kolId } });
  await redis.setex(`kol:profile:${kolId}`, 3600, JSON.stringify(kol));
  return kol;
}

// 速率限制
async function checkRateLimit(userId: string, limit: number, window: number) {
  const key = `ratelimit:${userId}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  return current <= limit;
}
```

---

### 4.3 对象存储

#### Cloudflare R2

| 项目 | 说明 |
|-----|------|
| **服务商** | Cloudflare |
| **选择理由** | |
| ✓ | S3 兼容 API |
| ✓ | 无出口费用 (相比 S3) |
| ✓ | 内置 Cloudflare CDN |
| ✓ | 价格低廉 ($0.015/GB/月) |
| **替代方案** | AWS S3, Google Cloud Storage |
| **不选原因** | S3 出口费用高，R2 更适合图片/视频存储 |

**使用示例:**
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

async function uploadFile(key: string, body: Buffer, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await s3Client.send(command);
  return `https://cdn.aiads.com/${key}`;
}
```

---

## 5. 基础设施技术选型

### 5.1 前端部署

#### Vercel

| 项目 | 说明 |
|-----|------|
| **套餐** | Pro ($20/月/用户) |
| **选择理由** | |
| ✓ | Next.js/Vite 完美支持 |
| ✓ | 自动 HTTPS 和 CDN |
| ✓ | Preview Deployments |
| ✓ | 边缘函数支持 |
| **替代方案** | Netlify, AWS Amplify |
| **不选原因** | Vercel 性能更好，生态更成熟 |

---

### 5.2 后端部署

#### Railway

| 项目 | 说明 |
|-----|------|
| **计费** | 按使用量 ($0.00000714/秒/实例) |
| **选择理由** | |
| ✓ | 一键部署 (Git 推送) |
| ✓ | 自动 SSL |
| ✓ | 内置负载均衡 |
| ✓ | 环境变量管理 |
| **替代方案** | Render, Fly.io, AWS ECS |
| **不选原因** | Railway 开发体验最好，适合初创团队 |

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

---

### 5.3 监控和日志

#### Sentry

| 项目 | 说明 |
|-----|------|
| **套餐** | Team ($26/月) |
| **选择理由** | |
| ✓ | 错误追踪行业标准 |
| ✓ | 支持前端和后端 |
| ✓ | Source Maps 支持 |
| ✓ | 性能监控 |

**配置示例:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Prisma({ client: prisma }),
  ],
});
```

#### Logtail

| 项目 | 说明 |
|-----|------|
| **套餐** | Basic ($29/月) |
| **选择理由** | |
| ✓ | 结构化日志 |
| ✓ | 实时搜索 |
| ✓ | 告警规则 |
| ✓ | 与 Winston 集成 |

---

## 6. 第三方服务集成

### 6.1 社交媒体 API

| 平台 | API | 用途 |
|-----|-----|------|
| **TikTok** | TikTok for Developers API | KOL 数据同步 |
| **YouTube** | YouTube Data API v3 | 频道/视频数据 |
| **Instagram** | Instagram Graph API | 帖子/粉丝数据 |

### 6.2 支付服务

| 服务 | 用途 | 地区 |
|-----|------|------|
| **支付宝** | 广告主充值 | 中国 |
| **微信支付** | 广告主充值 | 中国 |
| **Stripe** | 国际信用卡 | 全球 |
| **PayPal** | KOL 提现 | 全球 |

### 6.3 其他服务

| 服务 | 用途 |
|-----|------|
| **SendGrid** | 邮件发送 |
| **Twilio** | 短信验证码 |
| **Google reCAPTCHA** | 防机器人 |

---

## 7. 开发工具

### 7.1 代码质量

| 工具 | 用途 |
|-----|------|
| **ESLint** | 代码检查 |
| **Prettier** | 代码格式化 |
| **Husky** | Git Hooks |
| **lint-staged** | 暂存文件检查 |

### 7.2 测试

| 工具 | 用途 |
|-----|------|
| **Vitest** | 单元测试 |
| **@testing-library/react** | React 组件测试 |
| **Playwright** | E2E 测试 |
| **MSW** | API Mock |

### 7.3 文档

| 工具 | 用途 |
|-----|------|
| **Swagger UI** | API 文档 |
| **Storybook** | 组件文档 |
| **Docusaurus** | 技术文档 |

---

## 8. 成本估算

### 8.1 月度成本 (MVP 阶段)

| 服务 | 套餐 | 月成本 (USD) | 月成本 (CNY) |
|-----|------|-------------|-------------|
| Vercel | Pro | $20 | ¥145 |
| Railway | Usage-based | $50-100 | ¥360-720 |
| Supabase | Pro | $25 | ¥180 |
| Upstash | Usage-based | $10-20 | ¥72-145 |
| Cloudflare R2 | Usage-based | $5-10 | ¥36-72 |
| Sentry | Team | $26 | ¥188 |
| Logtail | Basic | $29 | ¥210 |
| 域名 | 3 个 | $5 | ¥36 |
| **合计** | - | **$170-235** | **¥1,227-1,696** |

### 8.2 扩展成本 (增长阶段)

| 阶段 | 用户量 | 预估月成本 (CNY) |
|-----|-------|-----------------|
| MVP | 1,000 | ¥1,500 |
| 增长 | 10,000 | ¥5,000 |
| 规模 | 100,000 | ¥20,000 |

---

## 9. 技术债务管理

### 9.1 已知取舍

| 决策 | 短期收益 | 长期风险 | 缓解措施 |
|-----|---------|---------|---------|
| Express vs NestJS | 开发快 | 架构可能混乱 | 严格代码规范 |
| 单体架构 | 部署简单 | 扩展困难 | 模块化设计 |
| Supabase | 快速上线 | 供应商锁定 | 抽象数据层 |

### 9.2 重构计划

```
Phase 1 (Month 3-6):
• 完善单元测试覆盖 (>80%)
• 优化数据库查询
• 实现 API 版本控制

Phase 2 (Month 7-12):
• 微服务拆分 (用户/订单/支付)
• 引入消息队列
• 实现 CQRS 模式
```

---

## 10. 附录

### 10.1 package.json 依赖

```json
{
  "dependencies": {
    "@prisma/client": "^5.8.0",
    "@sentry/node": "^7.93.0",
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.5",
    "bcrypt": "^5.1.1",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.1",
    "prisma": "^5.8.0",
    "typescript": "^5.3.3",
    "vitest": "^1.1.0"
  }
}
```

### 10.2 参考文档

- [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) - 系统架构
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - 数据库设计
- [API_SPEC.md](./API_SPEC.md) - API 规范

---

*本文档由 AIAds 架构团队编写，仅供内部技术参考*
*保密级别：内部机密*
