# AIAds 后端 TypeScript 错误完整清单

**最后更新**: 2026-03-26  
**当前状态**: 157 个编译错误  
**目标**: 0 个错误，成功编译并运行

---

## 📊 错误统计总览

| 类别 | 错误数 | 优先级 | 修复难度 |
|------|--------|--------|---------|
| **Prisma 模型不匹配** | ~40 | 🔴 高 | 中 |
| **类型转换问题** | ~35 | 🟡 中 | 低 |
| **OrderStatus 枚举值** | ~15 | 🟡 中 | 低 |
| **未使用变量** | ~15 | 🟢 低 | 低 |
| **其他类型错误** | ~52 | 🟡 中 | 中 |
| **总计** | **157** | - | - |

---

## 🔴 优先级 1：Prisma 模型不匹配（约 40 个错误）

### 1.1 缺失的模型 - `contentReview`

**错误示例**:
```typescript
src/services/admin/stats.service.ts(533,39): error TS2339: 
Property 'contentReview' does not exist on type 'PrismaClient'
```

**原因**: Prisma schema 中没有定义 `ContentReview` 模型，但代码在使用。

**修复方案**:
```prisma
// 在 prisma/schema.prisma 中添加
model ContentReview {
  id          String   @id @default(uuid())
  kolId       String   @map("kol_id")
  status      String   @default("pending")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  
  kol         Kol      @relation(fields: [kolId], references: [id])
  
  @@map("content_reviews")
}
```

**影响文件**:
- `src/services/admin/stats.service.ts` (5 处)

---

### 1.2 缺失的字段 - `deletedAt`

**错误示例**:
```typescript
src/services/admin/stats.service.ts(403,57): error TS2353: 
Object literal may only specify known properties, and 'deletedAt' does not exist in type 'KolWhereInput'.
```

**原因**: Prisma 7 生成的类型中，某些模型没有 `deletedAt` 字段。

**修复方案**（2 选 1）:

**方案 A**: 在 schema 中添加 `deletedAt` 字段
```prisma
model Kol {
  // ... 其他字段
  deletedAt DateTime? @map("deleted_at")
}
```

**方案 B**: 从代码中移除 `deletedAt` 查询条件
```typescript
// 修改前
const kols = await prisma.kol.count({ where: { deletedAt: null } });

// 修改后
const kols = await prisma.kol.count();
```

**影响文件**:
- `src/services/admin/stats.service.ts` (约 15 处)
- `src/services/admin/advertisers.service.ts` (约 5 处)
- `src/services/admin/campaigns.service.ts` (约 5 处)

---

### 1.3 缺失的关系字段

**错误示例**:
```typescript
src/services/admin/orders.service.ts(599,25): error TS2551: 
Property 'advertiser' does not exist on type '{ ... }'. Did you mean 'advertiserId'?
```

**原因**: Prisma 7 改变了关联查询的返回结构。

**修复方案**:
```typescript
// 修改前
order.advertiser.companyName

// 修改后
order.advertiserId // 或使用 include 预加载
```

**影响文件**:
- `src/services/admin/orders.service.ts` (约 10 处)
- `src/services/admin/campaigns.service.ts` (约 5 处)

---

## 🟡 优先级 2：类型转换问题（约 35 个错误）

### 2.1 Decimal 转 number

**错误示例**:
```typescript
src/services/admin/stats.service.ts(181,7): error TS2322: 
Type 'number | Decimal' is not assignable to type 'number'.
Type 'Decimal' is not assignable to type 'number'.
```

**原因**: Prisma 的 `Decimal` 类型不能直接赋值给 `number`。

**修复方案**:
```typescript
// 修改前
totalRevenue: revenueResult._sum.amount || 0

// 修改后
totalRevenue: Number(revenueResult._sum?.amount) || 0
// 或
totalRevenue: revenueResult._sum?.amount?.toNumber() || 0
```

**影响文件**:
- `src/services/admin/stats.service.ts` (约 20 处)
- `src/services/admin/advertisers.service.ts` (约 10 处)
- `src/services/admin/campaigns.service.ts` (约 5 处)

---

### 2.2 _sum/_avg 可能为 undefined

**错误示例**:
```typescript
src/services/admin/stats.service.ts(181,21): error TS18048: 
'revenueResult._sum' is possibly 'undefined'.
```

**原因**: Prisma 聚合查询返回值可能为 `undefined`。

**修复方案**:
```typescript
// 修改前
totalRevenue: revenueResult._sum.amount || 0

// 修改后（可选链 + 空值合并）
totalRevenue: revenueResult._sum?.amount ?? 0
```

**影响文件**:
- `src/services/admin/stats.service.ts` (约 15 处)

---

## 🟡 优先级 3：OrderStatus 枚举值（约 15 个错误）

### 3.1 无效的枚举值

**错误示例**:
```typescript
src/services/admin/stats.service.ts(474,24): error TS2322: 
Type '"pending_payment"' is not assignable to type 'OrderStatus'.
```

**原因**: 代码中使用的字符串不是 Prisma schema 中定义的有效枚举值。

**修复方案**:

**方案 A**: 查看 schema 中的有效值
```bash
grep -A 10 "enum OrderStatus" prisma/schema.prisma
```

**方案 B**: 使用 Prisma 生成的枚举类型
```typescript
// 修改前
status: { in: ['pending_payment', 'pending_acceptance', 'pending_review'] }

// 修改后（使用 Prisma 枚举）
status: { in: [Prisma.OrderStatus.PENDING] }
```

**影响文件**:
- `src/services/admin/stats.service.ts` (约 10 处)
- `src/services/admin/orders.service.ts` (约 5 处)

---

## 🟢 优先级 4：未使用的变量（约 15 个错误）

### 4.1 声明但未使用

**错误示例**:
```typescript
src/services/admin/stats.service.ts(657,51): error TS6133: 
'adminId' is declared but its value is never read.
```

**原因**: TypeScript 严格模式会报告未使用的变量。

**修复方案**（2 选 1）:

**方案 A**: 删除未使用的参数
```typescript
// 修改前
async getAuditLogs(filters: AuditLogFilters, adminId: string) {

// 修改后
async getAuditLogs(filters: AuditLogFilters) {
```

**方案 B**: 使用下划线前缀（表示有意不用）
```typescript
async getAuditLogs(filters: AuditLogFilters, _adminId: string) {
```

**影响文件**:
- `src/services/admin/stats.service.ts` (约 10 处)
- `src/services/admin/settings.service.ts` (约 5 处)

---

## 📁 按文件分类的错误分布

| 文件 | 错误数 | 主要问题 |
|------|--------|---------|
| `src/services/admin/stats.service.ts` | ~60 | Decimal 转换、deletedAt、未使用变量 |
| `src/services/admin/orders.service.ts` | ~25 | 关系字段、OrderStatus |
| `src/services/admin/advertisers.service.ts` | ~20 | Decimal 转换、deletedAt |
| `src/services/admin/campaigns.service.ts` | ~15 | Decimal 转换、deletedAt |
| `src/services/admin/finance.controller.ts` | ~10 | 缺失的方法 |
| `src/services/admin/settings.service.ts` | ~10 | deletedAt、未使用变量 |
| `src/middleware/auditLog.ts` | ~5 | 类型注解 |
| `src/controllers/admin/stats.controller.ts` | ~5 | 导入错误 |
| 其他文件 | ~7 | 各种小问题 |

---

## 🛠️ 修复脚本（批量修复）

### 脚本 1: 修复 Decimal 转换

```bash
cd /var/www/aiads/src/backend

# 修复 _sum.amount
sed -i 's/_sum\.amount || 0/Number(_sum?.amount) || 0/g' src/services/admin/stats.service.ts
sed -i 's/_sum\.budget || 0/Number(_sum?.budget) || 0/g' src/services/admin/stats.service.ts
sed -i 's/_sum\.spentAmount || 0/Number(_sum?.spentAmount) || 0/g' src/services/admin/stats.service.ts

# 修复 _avg
sed -i 's/_avg\.followers || 0/Number(_avg?.followers) || 0/g' src/services/admin/stats.service.ts
sed -i 's/_avg\.engagementRate || 0/Number(_avg?.engagementRate) || 0/g' src/services/admin/stats.service.ts
```

### 脚本 2: 修复 OrderStatus

```bash
# 查看有效的枚举值
grep -A 10 "enum OrderStatus" prisma/schema.prisma

# 替换无效的枚举值
sed -i 's/"pending_payment"/"PENDING"/g' src/services/admin/stats.service.ts
sed -i 's/"pending_acceptance"/"PENDING"/g' src/services/admin/stats.service.ts
sed -i 's/"pending_review"/"PENDING"/g' src/services/admin/stats.service.ts
```

### 脚本 3: 删除未使用变量

```bash
# 注释未使用的导入
sed -i 's/^import { logger }.*$/\/\/ &/' src/services/admin/stats.service.ts
sed -i 's/^import { ApiError }.*$/\/\/ &/' src/services/admin/stats.service.ts

# 删除未使用的参数
sed -i 's/, adminId: string/\/\/ , adminId: string/g' src/services/admin/stats.service.ts
sed -i 's/, model: .*$/\/\/ , model: .../g' src/services/admin/stats.service.ts
```

### 脚本 4: 修复 deletedAt 查询

```bash
# 方案 A: 从查询中移除 deletedAt 条件
sed -i 's/, deletedAt: null//g' src/services/admin/stats.service.ts
sed -i 's/{ deletedAt: null }/{}/g' src/services/admin/stats.service.ts

# 方案 B: 在 schema 中添加 deletedAt（推荐）
# 手动编辑 prisma/schema.prisma，在相关模型中添加
# deletedAt DateTime? @map("deleted_at")
```

---

## ✅ 修复检查清单

### 第一阶段：Prisma Schema（已完成 ✅）
- [x] 移除 datasource 中的 url 字段
- [x] 添加 Admin 模型的 createdBy/updatedBy 字段
- [x] 添加 Admin 模型的反向关系
- [x] 添加 Transaction 和 Kol 的关系名称
- [x] 生成 Prisma 客户端

### 第二阶段：TypeScript 错误（进行中 ⚠️）
- [ ] 添加 ContentReview 模型到 schema
- [ ] 在相关模型中添加 deletedAt 字段
- [ ] 修复所有 Decimal 类型转换
- [ ] 修复所有 _sum/_avg 的 undefined 处理
- [ ] 修复 OrderStatus 枚举值
- [ ] 删除或注释未使用的变量
- [ ] 修复关系字段访问

### 第三阶段：编译验证（待开始）
- [ ] `npm run build` 无错误
- [ ] `dist/` 目录生成 JS 文件
- [ ] 启动服务 `npm start`
- [ ] 测试 API 端点

---

## 🎯 推荐修复顺序

1. **先修复 Prisma Schema** - 添加缺失的模型和字段
2. **重新生成 Prisma 客户端** - `npx prisma generate`
3. **修复 Decimal 转换** - 批量替换
4. **修复 OrderStatus** - 使用正确的枚举值
5. **删除未使用变量** - 清理代码
6. **编译验证** - `npm run build`
7. **启动测试** - `npm start`

---

## 📚 相关文档

- [Prisma 7 Migration Guide](https://www.prisma.io/docs/guides/migration)
- [TypeScript Decimal Handling](https://www.prisma.io/docs/concepts/components/prisma-client/data-types#decimal)
- [BACKEND_FIX_LOG.md](./BACKEND_FIX_LOG.md) - 修复日志
- [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) - 故障排除

---

**最后更新**: 2026-03-26  
**维护人员**: AIAds Team  
**下次修复目标**: 剩余 157 个错误 → 0 个错误
