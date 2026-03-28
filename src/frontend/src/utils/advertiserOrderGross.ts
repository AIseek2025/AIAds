/**
 * 广告主视角订单行字段解析（GET /orders）：应付金额 + 冻结金额。
 * 兼容 snake_case 与混用 camelCase。
 */

/**
 * 「应付/展示」金额（元）：CPM 优先 `cpm_breakdown.gross_spend`，否则 `price`。
 */
export function advertiserOrderGrossSpendCny(raw: Record<string, unknown>): number {
  const pm = String(raw.pricing_model ?? raw.pricingModel ?? '');
  const cbd = (raw.cpm_breakdown ?? raw.cpmBreakdown) as Record<string, unknown> | undefined;
  if (pm === 'cpm' && cbd != null && typeof cbd === 'object') {
    const gs = cbd.gross_spend ?? cbd.grossSpend;
    if (gs != null) return Number(gs) || 0;
  }
  const price = raw.price ?? raw.order_price ?? raw.orderPrice;
  return Number(price ?? 0) || 0;
}

/** 订单冻结金额（元）：`frozen_amount` / `frozenAmount` */
export function advertiserOrderFrozenCny(raw: Record<string, unknown>): number {
  const v = raw.frozen_amount ?? raw.frozenAmount;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v) || 0;
  return 0;
}
