import { Prisma } from '@prisma/client';

/** 与需求文档对齐的默认平台抽成（可后续改为配置） */
export const DEFAULT_PLATFORM_FEE_RATE = 0.1;

/** 文档：视频有效曝光 ≥3s；图文 ≥2s —— 当前由上游 `views` 写入，此处保留常量供扩展 */
export const EFFECTIVE_IMPRESSION_VIDEO_MIN_SEC = 3;
export const EFFECTIVE_IMPRESSION_IMAGE_MIN_SEC = 2;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 计费曝光：当前与订单 `views` 对齐，后续可接入去重/作弊过滤 */
export function billableImpressionsFromOrderViews(views: number): number {
  return Math.max(0, Math.floor(views));
}

export function grossSpendFromCpm(billableImpressions: number, cpmRate: number): number {
  if (cpmRate <= 0) {
    return 0;
  }
  return roundMoney((billableImpressions / 1000) * cpmRate);
}

export function applyCpmBudgetCap(gross: number, cap: Prisma.Decimal | null | undefined): number {
  if (cap == null) {
    return gross;
  }
  const c = typeof cap === 'number' ? cap : cap.toNumber();
  if (!(c > 0)) {
    return gross;
  }
  return Math.min(gross, roundMoney(c));
}

export function splitGrossWithPlatformFee(
  gross: number,
  platformFeeRate: number = DEFAULT_PLATFORM_FEE_RATE
): { gross: number; platformFee: number; kolEarning: number } {
  const pf = roundMoney(gross * platformFeeRate);
  const kol = roundMoney(gross - pf);
  return { gross, platformFee: pf, kolEarning: kol };
}

export interface CpmBreakdownNumbers {
  pricing_model: 'fixed' | 'cpm';
  billable_impressions: number;
  raw_views: number;
  cpm_rate: number | null;
  cpm_budget_cap: number | null;
  gross_spend: number;
  platform_fee: number;
  kol_earning: number;
}

export function buildCpmBreakdown(order: {
  pricingModel?: string | null;
  views: number;
  cpmRate: Prisma.Decimal | null;
  cpmBudgetCap: Prisma.Decimal | null;
  price: Prisma.Decimal;
  platformFee: Prisma.Decimal;
  kolEarning: Prisma.Decimal;
}): CpmBreakdownNumbers {
  const pm = order.pricingModel === 'cpm' ? 'cpm' : 'fixed';
  const rawViews = order.views;
  const billable = billableImpressionsFromOrderViews(rawViews);
  const rate = order.cpmRate != null ? order.cpmRate.toNumber() : null;
  let gross = order.price.toNumber();
  let platformFee = order.platformFee.toNumber();
  let kolEarning = order.kolEarning.toNumber();

  if (pm === 'cpm' && rate != null && rate > 0) {
    gross = grossSpendFromCpm(billable, rate);
    gross = applyCpmBudgetCap(gross, order.cpmBudgetCap);
    const split = splitGrossWithPlatformFee(gross);
    gross = split.gross;
    platformFee = split.platformFee;
    kolEarning = split.kolEarning;
  }

  return {
    pricing_model: pm,
    billable_impressions: billable,
    raw_views: rawViews,
    cpm_rate: rate,
    cpm_budget_cap: order.cpmBudgetCap != null ? order.cpmBudgetCap.toNumber() : null,
    gross_spend: gross,
    platform_fee: platformFee,
    kol_earning: kolEarning,
  };
}

export function prismaDecimalsFromCpmSettlement(
  gross: number,
  platformFee: number,
  kolEarning: number
): { price: Prisma.Decimal; platformFee: Prisma.Decimal; kolEarning: Prisma.Decimal } {
  return {
    price: new Prisma.Decimal(gross.toFixed(8)),
    platformFee: new Prisma.Decimal(platformFee.toFixed(8)),
    kolEarning: new Prisma.Decimal(kolEarning.toFixed(8)),
  };
}
