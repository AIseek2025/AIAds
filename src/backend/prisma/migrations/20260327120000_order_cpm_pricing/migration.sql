-- CPM 计价模型：与《核心功能设计深度拆解》第一章对齐的透明化字段
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "pricing_model" TEXT NOT NULL DEFAULT 'fixed';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cpm_rate" DECIMAL(65,30);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cpm_budget_cap" DECIMAL(65,30);
