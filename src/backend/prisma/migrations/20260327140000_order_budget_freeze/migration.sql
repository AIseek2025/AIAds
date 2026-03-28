-- MVP-2：订单预算冻结 / 解冻流水类型 + 订单冻结金额
ALTER TYPE "TransactionType" ADD VALUE 'budget_freeze';
ALTER TYPE "TransactionType" ADD VALUE 'budget_release';

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "frozen_amount" DECIMAL(65,30) NOT NULL DEFAULT 0;
