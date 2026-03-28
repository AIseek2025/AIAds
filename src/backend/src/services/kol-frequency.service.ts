import prisma from '../config/database';
import { ApiError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

function envBool(key: string, defaultValue: boolean): boolean {
  const v = process.env[key];
  if (v === undefined) return defaultValue;
  return v === '1' || v.toLowerCase() === 'true';
}

function envInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultValue;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? defaultValue : n;
}

export interface KolAcceptFrequencyConfig {
  enabled: boolean;
  rollingDays: number;
  maxAccepts: number;
}

export function getKolAcceptFrequencyConfig(): KolAcceptFrequencyConfig {
  return {
    enabled: envBool('KOL_ACCEPT_FREQ_ENABLED', true),
    rollingDays: Math.max(1, envInt('KOL_ACCEPT_ROLLING_DAYS', 7)),
    maxAccepts: Math.max(1, envInt('KOL_MAX_ACCEPTS_ROLLING_WINDOW', 30)),
  };
}

export function windowStartDate(rollingDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - rollingDays);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * 已在滚动窗口内完成「接单」的订单数（含曾接单后取消/纠纷的订单，以 acceptedAt 为准）。
 */
export async function countAcceptedOrdersInWindow(kolId: string): Promise<number> {
  const { rollingDays } = getKolAcceptFrequencyConfig();
  const start = windowStartDate(rollingDays);
  return prisma.order.count({
    where: {
      kolId,
      acceptedAt: { gte: start },
    },
  });
}

export interface KolAcceptFrequencySnapshot {
  enabled: boolean;
  rolling_days: number;
  max_accepts: number;
  current_count: number;
  remaining: number;
}

export async function getSnapshotForKol(kolId: string): Promise<KolAcceptFrequencySnapshot> {
  const cfg = getKolAcceptFrequencyConfig();
  if (!cfg.enabled) {
    return {
      enabled: false,
      rolling_days: cfg.rollingDays,
      max_accepts: cfg.maxAccepts,
      current_count: 0,
      remaining: cfg.maxAccepts,
    };
  }
  const current = await countAcceptedOrdersInWindow(kolId);
  const remaining = Math.max(0, cfg.maxAccepts - current);
  return {
    enabled: true,
    rolling_days: cfg.rollingDays,
    max_accepts: cfg.maxAccepts,
    current_count: current,
    remaining,
  };
}

export async function assertCanAcceptOrder(kolId: string): Promise<void> {
  const cfg = getKolAcceptFrequencyConfig();
  if (!cfg.enabled) {
    return;
  }
  const current = await countAcceptedOrdersInWindow(kolId);
  if (current >= cfg.maxAccepts) {
    logger.warn('KOL accept frequency limit', { kolId, current, max: cfg.maxAccepts, days: cfg.rollingDays });
    throw new ApiError(
      `当前 ${cfg.rollingDays} 日内接单次数已达上限（${cfg.maxAccepts} 次），请待窗口滚动后再试`,
      429,
      'KOL_ACCEPT_FREQUENCY_LIMIT'
    );
  }
}

export const kolFrequencyService = {
  getKolAcceptFrequencyConfig,
  countAcceptedOrdersInWindow,
  getSnapshotForKol,
  assertCanAcceptOrder,
  windowStartDate,
};
