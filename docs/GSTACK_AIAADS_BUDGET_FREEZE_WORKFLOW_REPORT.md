# AIAds · 预算冻结与结算释放（MVP-2）— gstack 工作流程报告

**日期**：2026-03-27  
**依据**：《GSTACK_AIAADS_WORK_AUDIT_REPORT》MVP-2「冻结预算 + 超额保护」；《GSTACK_AIAADS_CPM_WORKFLOW_REPORT》后续建议第 3 条。

---

## 1. Think

- 仅做 CPM 口径与结算公式仍不足：**广告主可用余额** 可能在多笔 CPM 并发下单时被透支。
- 已有 `Advertiser.walletBalance` 与 `frozenBalance`，缺 **按订单维度的冻结额** 与 **拒单/完成时的释放或扣款**。

---

## 2. Plan

| 步骤 | 内容 |
|------|------|
| P1 | `orders.frozen_amount` 记录本单从可用余额划入冻结的金额 |
| P2 | `TransactionType` 增加 `budget_freeze` / `budget_release` |
| P3 | 创建订单：`offered_price` 作为冻结基数（固定价=全款；CPM=预算上限），校验可用余额后 `wallet↓`、`frozen↑` |
| P4 | KOL 拒单：全额解冻并写 `budget_release` |
| P5 | 广告主确认完成：按结算毛额 `A` 与冻结 `F` 执行 `wallet += F - A`、`frozen -= F`，扣 `order_payment`，`campaign.spentAmount += A`，`advertiser.totalSpent += A`（仅 `F>0` 的新链路） |
| P6 | CPM 下单校验：`offered_price` 必填（与冻结一致） |

---

## 3. Build

- **Prisma**：`Order.frozenAmount`；枚举 `budget_freeze`、`budget_release`。
- **迁移**：`prisma/migrations/20260327140000_order_budget_freeze/migration.sql`。
- **orders.service.ts**：`createOrder` / `rejectOrder` / `completeOrder` 关键路径使用 `$transaction`；私有方法 `freezeBudgetOnOrderCreate`、`releaseFrozenBudgetTx`。
- **校验**：`createOrderSchema` 对 `cpm` 增加 `offered_price` 必填说明。
- **类型**：`OrderResponse` / `KolOrderResponse` 增加 `frozen_amount`；管理端 `OrderDetail` 增加 `pricing_model`、`cpm_rate`、`cpm_budget_cap`、`frozen_amount`。

---

## 4. Review

- **老订单** `frozen_amount = 0`：`complete` 时不改广告主余额，仍给 KOL 入账并累加 `campaign.spentAmount`（与上一版行为相比，活动侧多了一笔「完成即计入花费」的统计，便于看板）。
- **结算前流动性**：完成时要求 `walletBalance + frozenAmount >= A`，防止 `A > F` 时可用余额不足（极端数据或并发）。

---

## 5. Test

- `npm run build`（tsc）通过。
- 建议在有库环境跑 `tests/orders.test.ts`；并执行 `npx prisma migrate deploy`。

---

## 6. Ship

- 部署前执行迁移，并 **注意**：PostgreSQL 对 `ALTER TYPE ... ADD VALUE` 在部分版本/配置下不能与事务块混用——若迁移失败，可拆成单独迁移或手动执行枚举扩展。

---

## 7. Reflect（后续）

- 取消/仲裁关单路径需同样 **解冻**（与 `reject` 对齐）。
- 固定价老订单若需与新版「冻结」一致，可数据迁移或仅对新单启用冻结逻辑（当前以 `frozen_amount` 为准）。
- 前端下单页需展示 **冻结金额** 与 **余额不足** 错误码 `INSUFFICIENT_BALANCE`。

---

## gstack 映射

| 阶段 | 产出 |
|------|------|
| Think | 审计 MVP-2 |
| Plan | 上表 |
| Build | Schema + Service + 类型 + Admin DTO |
| Review | 老订单兼容 |
| Test | 构建 + 集成建议 |
| Ship | 本文档 |
| Reflect | 后续条目 |
