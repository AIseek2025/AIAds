# AIAds · CPM 透明化与计价切片 — gstack 工作流程报告

**日期**：2026-03-27  
**依据文档**：《全球中小KOL广告投放平台核心功能设计深度拆解》第一章（CPM 统计机制与数据透明化）及既有《GSTACK_AIAADS_WORK_AUDIT_REPORT》中「先做 CPM 透明化 + 结算闭环」的楔子策略。  
**本迭代目标**：在不大改整体架构的前提下，为订单增加 **CPM 计价模型**、**预估/结算口径 API**，并修正广告主权限校验错误。

---

## 1. Think（问题与约束）

- 现有订单为 **固定价**（`offered_price` → `price` / `platform_fee` / `kol_earning` 创建时即定稿）。
- 需求文档要求：**应付 = 计费曝光 / 1000 × CPM**，并支持 **预算封顶**、**平台抽成后 KOL 收入** 的可视化。
- 约束：分阶段交付；本轮不实现完整「平台 API 拉数 / 去重 / 7 日锁定」，仅打通 **数据模型 + 计算口径 + API**。

---

## 2. Plan（计划）

| 步骤 | 内容 |
|------|------|
| P1 | Prisma `orders` 表增加 `pricing_model`、`cpm_rate`、`cpm_budget_cap`，并提供 SQL migration |
| P2 | 抽取 `cpm-metrics.service.ts`：千次曝光计费、封顶、抽成拆分 |
| P3 | `createOrder`：支持 `pricing_model: cpm` + `cpm_rate`，可选 `offered_price` 作为预算上限；CPM 单创建时金额为 0，待结算 |
| P4 | `completeOrder`：CPM 单在确认完成时按 **当前 `views`** 结算并写回 `price` / 抽成 / KOL 分成；`createKolPaymentTransaction` 使用 **结算后** 订单 |
| P5 | 订单 JSON 与 KOL 任务单增加 `cpm_breakdown`（仅 `cpm` 单）；新增 `GET /api/v1/orders/:id/cpm-metrics` |
| P6 | 修正 **广告主 userId 与 advertiser 主键** 混用导致的权限逻辑；补单元测试与工作报告 |

---

## 3. Build（实现摘要）

- **Schema**：`Order.pricingModel`（`fixed` \| `cpm`）、`cpmRate`、`cpmBudgetCap`。
- **服务**：`src/backend/src/services/cpm-metrics.service.ts` — `grossSpendFromCpm`、`applyCpmBudgetCap`、`splitGrossWithPlatformFee`、`buildCpmBreakdown`。
- **接口**：`POST /api/v1/orders` 校验见 `createOrderSchema`（`superRefine`）；`GET /api/v1/orders/:id/cpm-metrics`。
- **类型**：`OrderResponse` / `KolOrderResponse` / `CreateOrderRequest` 扩展（`src/backend/src/types/index.ts`）。
- **迁移**：`prisma/migrations/20260327120000_order_cpm_pricing/migration.sql`。

---

## 4. Review（自检）

- 固定价路径：默认 `pricing_model: fixed`，`offered_price` 仍必填，行为与旧版一致。
- CPM 路径：未确认完成前，`price` 等为 0；列表/详情中 `cpm_breakdown` 提供 **预估**（随 `views` 变）。
- 权限：`getOrderById`、`completeOrder`、`getOrderCpmMetrics` 使用 `advertiser.userId → advertiser.id` 与订单 `advertiserId` 比对。

---

## 5. Test（验证）

| 项 | 结果 |
|----|------|
| `npm run build`（`tsc`） | 通过 |
| `tests/cpm-metrics.service.test.ts` | 通过（纯函数） |
| `tests/orders.test.ts` | 依赖本地 DB/登录环境；未在本次无库环境下作为门禁通过（与改动前一致的环境问题） |

**部署注意**：合并后请在目标环境执行 `npx prisma migrate deploy`（或等价应用 `migration.sql`），再 `prisma generate`。

---

## 6. Ship（交付物清单）

- 代码：`schema.prisma`、`cpm-metrics.service.ts`、`orders.service.ts`、`tasks.service.ts`、`orders` 路由与控制器、`validator.ts`、`types/index.ts`、迁移 SQL、单元测试。
- 文档：本文件 `docs/GSTACK_AIAADS_CPM_WORKFLOW_REPORT.md`。

---

## 7. Reflect（后续建议）

1. **曝光写入**：由定时任务或回调将 `orders.views` 与（未来）`billable_impressions` 分离；当前计费曝光与 `views` 对齐。
2. **结算时点**：与文档「发布后第 8 天锁定」对齐时，增加 `settlement_locked_at` 与定时任务，而非仅在 `complete` 时结算。
3. **资金冻结**：CPM 需在下单时冻结 **预估上限** 或 **预算 cap**，避免超额（本轮未动钱包逻辑）。
4. **管理后台**：`AdminOrderService` 列表可按需展示 `cpm_rate` / 预估金额（本轮未改 admin DTO）。

---

## gstack 阶段映射

| gstack | 本迭代对应 |
|--------|------------|
| Think | 审计报告 + 需求文档第一章 |
| Plan | 上文 Plan 表 |
| Build | Prisma + Service + API + 类型 |
| Review | 兼容性与权限自检 |
| Test | 单元测试 + 构建 |
| Ship | 迁移说明与本文档 |
| Reflect | 后续建议 |
