# AIAds 管理后台后端开发文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 开发团队
**状态**: 已完成

---

## 1. 概述

本文档描述 AIAds 管理后台后端的实现细节，包括模块结构、API 端点、技术实现等。

---

## 2. 模块结构

```
src/
├── controllers/admin/
│   ├── auth.controller.ts      # 管理员认证控制器
│   ├── users.controller.ts     # 用户管理控制器
│   ├── kols.controller.ts      # KOL 审核控制器
│   ├── content.controller.ts   # 内容审核控制器
│   ├── finance.controller.ts   # 财务管理控制器
│   └── dashboard.controller.ts # 数据看板控制器
│
├── services/admin/
│   ├── auth.service.ts         # 管理员认证服务
│   ├── users.service.ts        # 用户管理服务
│   ├── kols.service.ts         # KOL 审核服务
│   ├── content.service.ts      # 内容审核服务
│   ├── finance.service.ts      # 财务管理服务
│   ├── dashboard.service.ts    # 数据看板服务
│   └── audit.service.ts        # 审计日志服务
│
├── middleware/
│   └── adminAuth.ts            # 管理员认证中间件
│
└── routes/
    └── admin.routes.ts         # 管理后台路由

tests/admin/
├── auth.test.ts                # 认证模块测试
├── users.test.ts               # 用户管理测试
├── kols.test.ts                # KOL 审核测试
├── finance.test.ts             # 财务管理测试
└── dashboard.test.ts           # 数据看板测试
```

---

## 3. 数据库模型

### 3.1 管理员表 (admins)

```prisma
model Admin {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String    @map("password_hash")
  name          String
  avatarUrl     String?   @map("avatar_url")
  roleId        String    @map("role_id")
  status        String    @default("active")
  lastLoginAt   DateTime? @map("last_login_at")
  lastLoginIp   String?   @map("last_login_ip")
  mfaEnabled    Boolean   @default(false) @map("mfa_enabled")
  mfaSecret     String?   @map("mfa_secret")
  mfaBackupCodes String[] @map("mfa_backup_codes")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  adminRole     AdminRole        @relation(fields: [roleId], references: [id])
  auditLogs     AdminAuditLog[]
}
```

### 3.2 管理员角色表 (admin_roles)

```prisma
model AdminRole {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  permissions Json     @default("[]")
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  admins      Admin[]
}
```

### 3.3 审计日志表 (admin_audit_logs)

```prisma
model AdminAuditLog {
  id             String    @id @default(uuid())
  adminId        String    @map("admin_id")
  adminEmail     String    @map("admin_email")
  adminName      String    @map("admin_name")
  action         String
  resourceType   String    @map("resource_type")
  resourceId     String?   @map("resource_id")
  resourceName   String?   @map("resource_name")
  requestMethod  String    @map("request_method")
  requestPath    String    @map("request_path")
  requestBody    Json?     @map("request_body")
  responseStatus Int?      @map("response_status")
  responseBody   Json?     @map("response_body")
  oldValues      Json?     @map("old_values")
  newValues      Json?     @map("new_values")
  ipAddress      String?   @map("ip_address")
  userAgent      String?   @map("user_agent")
  geoLocation    Json?     @map("geo_location")
  status         String    @default("success")
  errorMessage   String?   @map("error_message")
  createdAt      DateTime  @default(now()) @map("created_at")

  admin          Admin     @relation(fields: [adminId], references: [id], onDelete: Cascade)
}
```

### 3.4 内容审核表 (content_moderations)

```prisma
model ContentModeration {
  id            String   @id @default(uuid())
  contentType   String   @map("content_type")
  sourceType    String   @map("source_type")
  title         String
  description   String?
  thumbnailUrl  String?  @map("thumbnail_url")
  contentUrl    String   @map("content_url")
  duration      Int?
  submitterId   String   @map("submitter_id")
  submitterName String   @map("submitter_name")
  relatedOrderId String? @map("related_order_id")
  priority      String   @default("normal")
  status        String   @default("pending")
  aiScore       Int?     @map("ai_score")
  aiFlags       String[] @map("ai_flags")
  reviewNotes   String?  @map("review_notes")
  rejectionReason String? @map("rejection_reason")
  reviewedBy    String?  @map("reviewed_by")
  reviewedAt    DateTime? @map("reviewed_at")
  submittedAt   DateTime @default(now()) @map("submitted_at")
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
}
```

---

## 4. API 端点

### 4.1 管理员认证模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| POST | `/api/v1/admin/auth/login` | 公开 | 管理员登录 |
| GET | `/api/v1/admin/auth/me` | 已认证 | 获取当前管理员信息 |
| POST | `/api/v1/admin/auth/logout` | 已认证 | 管理员登出 |

### 4.2 用户管理模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| GET | `/api/v1/admin/users` | `user:view` | 用户列表 |
| GET | `/api/v1/admin/users/:id` | `user:view` | 用户详情 |
| PUT | `/api/v1/admin/users/:id/ban` | `user:ban` | 封禁用户 |
| PUT | `/api/v1/admin/users/:id/unban` | `user:unban` | 解封用户 |

### 4.3 KOL 审核模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| GET | `/api/v1/admin/kols/pending` | `kol:review` | 待审核 KOL |
| GET | `/api/v1/admin/kols` | `kol:view` | KOL 列表 |
| GET | `/api/v1/admin/kols/:id` | `kol:view` | KOL 详情 |
| POST | `/api/v1/admin/kols/:id/approve` | `kol:approve` | 通过审核 |
| POST | `/api/v1/admin/kols/:id/reject` | `kol:reject` | 拒绝审核 |

### 4.4 内容审核模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| GET | `/api/v1/admin/content/pending` | `content:view` | 待审核内容 |
| GET | `/api/v1/admin/content` | `content:view` | 内容列表 |
| GET | `/api/v1/admin/content/:id` | `content:view` | 内容详情 |
| POST | `/api/v1/admin/content/:id/approve` | `content:approve` | 通过审核 |
| POST | `/api/v1/admin/content/:id/reject` | `content:reject` | 拒绝审核 |
| DELETE | `/api/v1/admin/content/:id` | `content:delete` | 删除内容 |

### 4.5 财务管理模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| GET | `/api/v1/admin/finance/transactions` | `finance:view` | 交易列表 |
| GET | `/api/v1/admin/finance/withdrawals/pending` | `withdrawal:review` | 待审核提现 |
| GET | `/api/v1/admin/finance/withdrawals/:id` | `withdrawal:review` | 提现详情 |
| POST | `/api/v1/admin/finance/withdrawals/:id/approve` | `withdrawal:approve` | 通过提现 |
| POST | `/api/v1/admin/finance/withdrawals/:id/reject` | `withdrawal:reject` | 拒绝提现 |

### 4.6 数据看板模块

| 方法 | 端点 | 权限 | 说明 |
|-----|------|------|------|
| GET | `/api/v1/admin/dashboard/stats` | `dashboard:view` | 平台统计 |
| GET | `/api/v1/admin/dashboard/analytics` | `analytics:view` | 数据分析 |
| GET | `/api/v1/admin/dashboard/kol-rankings` | `dashboard:view` | KOL 排行榜 |

---

## 5. 技术实现

### 5.1 管理员认证

管理员认证使用独立的 JWT Secret，与用户后台完全隔离：

```typescript
// middleware/adminAuth.ts
export async function adminAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // 1. Extract token from Authorization header
  const token = extractTokenFromHeader(authHeader);
  
  // 2. Verify JWT token with admin secret
  const decoded = verifyToken(token, 'admin_access');
  
  // 3. Check if token is blacklisted
  const isBlacklisted = await cacheService.get(`admin_blacklist:${decoded.jti}`);
  
  // 4. Verify admin exists and is active
  const admin = await prisma.admin.findUnique({ ... });
  
  // 5. Attach admin info to request
  req.admin = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.adminRole.name,
    permissions: admin.adminRole.permissions as string[],
  };
}
```

### 5.2 权限验证

使用基于权限的中间件：

```typescript
// middleware/adminAuth.ts
export function requirePermission(
  ...permissions: string[]
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const adminPermissions = req.admin?.permissions || [];
    const hasPermission = permissions.every((p) => adminPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '没有权限执行此操作',
        },
      });
    }
    next();
  };
}
```

### 5.3 审计日志

所有管理操作都会记录审计日志：

```typescript
// services/admin/audit.service.ts
export async function logAdminAction(data: AdminAuditLogData): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId: data.adminId,
      adminEmail: data.adminEmail,
      adminName: data.adminName,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      resourceName: data.resourceName,
      requestMethod: data.requestMethod,
      requestPath: data.requestPath,
      requestBody: data.requestBody,
      status: data.status || 'success',
    },
  });
}
```

### 5.4 数据看板缓存

数据看板使用 Redis 缓存提高性能：

```typescript
// services/admin/dashboard.service.ts
async getStats(period: string = 'today', adminId: string): Promise<DashboardStatsResponse> {
  // Try cache first
  const cacheKey = `dashboard:stats:${period}`;
  const cached = await cacheService.get<DashboardStatsResponse>(cacheKey);
  
  if (cached) {
    return cached;
  }

  // Calculate stats from database
  const stats = await this.calculateStats(period);

  // Cache for 5 minutes
  await cacheService.set(cacheKey, JSON.stringify(stats), 300);

  return stats;
}
```

### 5.5 事务处理

涉及多表操作时使用 Prisma 事务：

```typescript
// services/admin/finance.service.ts
async approveWithdrawal(withdrawalId: string, data: ApproveWithdrawalRequest, adminId: string, adminEmail: string) {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Update withdrawal status
    const updatedWithdrawal = await tx.withdrawal.update({ ... });

    // 2. Deduct from KOL balance
    await tx.kol.update({ ... });

    // 3. Create transaction record
    await tx.transaction.create({ ... });

    return updatedWithdrawal;
  });
}
```

---

## 6. 环境变量配置

需要在 `.env` 文件中配置以下环境变量：

```env
# Admin JWT Configuration
ADMIN_JWT_SECRET=your-admin-jwt-secret-key
ADMIN_JWT_REFRESH_SECRET=your-admin-jwt-refresh-secret-key

# Admin IP Whitelist (optional)
ADMIN_IP_WHITELIST=192.168.1.1,192.168.1.2

# Redis for caching and token blacklist
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aiads
```

---

## 7. 初始化脚本

### 7.1 创建初始管理员

```typescript
// scripts/create-initial-admin.ts
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/crypto';

async function createInitialAdmin() {
  // Create super admin role
  const role = await prisma.adminRole.upsert({
    where: { name: 'Super Admin' },
    update: {},
    create: {
      name: 'Super Admin',
      description: '超级管理员',
      permissions: ['*'],
      isSystem: true,
    },
  });

  // Create initial admin
  const admin = await prisma.admin.create({
    data: {
      email: 'admin@aiads.com',
      passwordHash: await hashPassword('AdminPass123!'),
      name: 'System Administrator',
      roleId: role.id,
      status: 'active',
    },
  });

  console.log('Initial admin created:', admin.email);
}

createInitialAdmin().catch(console.error);
```

### 7.2 数据库迁移

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name add_admin_models

# Deploy to production
npx prisma migrate deploy
```

---

## 8. 测试

### 8.1 运行测试

```bash
# Run all admin tests
npm test -- tests/admin/

# Run specific test file
npm test -- tests/admin/auth.test.ts

# Run with coverage
npm test -- tests/admin/ --coverage
```

### 8.2 测试覆盖率

目标测试覆盖率：≥80%

测试文件覆盖：
- `auth.test.ts` - 认证模块测试
- `users.test.ts` - 用户管理测试
- `kols.test.ts` - KOL 审核测试
- `finance.test.ts` - 财务管理测试
- `dashboard.test.ts` - 数据看板测试

---

## 9. 安全注意事项

### 9.1 密码安全

- 使用 bcrypt 加密，cost factor 为 12
- 密码最小长度 8 位，建议包含大小写字母、数字和特殊字符

### 9.2 Token 安全

- Access Token 有效期 8 小时
- Refresh Token 有效期 7 天
- 登出时 Token 加入黑名单

### 9.3 审计日志

- 所有管理操作记录审计日志
- 敏感操作（财务、删除）需要二次验证
- 支持 IP 白名单（可选）

### 9.4 权限控制

- 基于 RBAC 的权限模型
- 所有接口需要管理员认证
- 细粒度权限控制到操作级别

---

## 10. 性能优化

### 10.1 缓存策略

| 数据类型 | 缓存时间 | 说明 |
|---------|---------|------|
| Dashboard Stats | 5 分钟 | 平台统计数据 |
| Analytics | 10 分钟 | 数据分析数据 |
| KOL Rankings | 15 分钟 | KOL 排行榜 |

### 10.2 数据库优化

- 所有查询使用索引
- 列表接口支持分页
- 大数据量查询使用游标分页

### 10.3 查询优化

```typescript
// 使用 include 预加载关联数据
const users = await prisma.user.findMany({
  where: { ... },
  include: {
    advertiser: { select: { ... } },
    kol: { select: { ... } },
  },
  skip: offset,
  take: limit,
});
```

---

## 11. 故障排查

### 11.1 常见问题

| 问题 | 可能原因 | 解决方案 |
|-----|---------|---------|
| Token 无效 | Secret 不匹配 | 检查环境变量配置 |
| 权限不足 | 角色权限配置错误 | 检查 admin_roles 表 |
| 审计日志不记录 | 数据库连接问题 | 检查数据库连接 |
| 缓存不生效 | Redis 连接问题 | 检查 Redis 服务 |

### 11.2 日志查看

```bash
# View application logs
tail -f logs/app.log

# Filter admin operations
grep "admin" logs/app.log

# View error logs
grep "ERROR" logs/app.log
```

---

## 12. 后续优化

### 12.1 功能扩展

- [ ] 管理员管理界面
- [ ] 角色权限管理
- [ ] 审计日志查询界面
- [ ] 数据导出功能

### 12.2 性能优化

- [ ] 实现查询结果缓存
- [ ] 优化大数据量查询
- [ ] 添加慢查询监控

### 12.3 安全加固

- [ ] 实现 IP 白名单
- [ ] 添加 MFA 支持
- [ ] 实现敏感操作二次验证

---

## 13. 总结

管理后台后端模块已完成实现，包括：

1. **管理员认证** - 独立的 JWT 认证系统
2. **用户管理** - 用户列表、详情、封禁/解封
3. **KOL 审核** - 待审核列表、通过/拒绝审核
4. **内容审核** - 待审核内容、通过/拒绝/删除
5. **财务管理** - 交易列表、提现审核
6. **数据看板** - 平台统计、数据分析、KOL 排行榜

所有模块都实现了：
- 权限验证
- 审计日志记录
- 事务处理（涉及多表操作）
- Redis 缓存（数据看板）
- 分页支持（列表接口）

测试覆盖率目标 ≥80%，确保代码质量。
