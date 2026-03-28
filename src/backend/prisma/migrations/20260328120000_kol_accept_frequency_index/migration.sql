-- 加速 KOL 滚动窗口内接单次数统计（kol-frequency.service）
CREATE INDEX IF NOT EXISTS "orders_kol_id_accepted_at_idx" ON "orders" ("kol_id", "accepted_at");
