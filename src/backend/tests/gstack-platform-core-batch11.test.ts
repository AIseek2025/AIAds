/**
 * GStack 平台核心域单测第十一批次：
 * Campaign/广告主/提现/搜索等 Zod 扩展、CPM 费率与 cap、helpers pick/omit、脱敏、KOL display_name、decimal、指标脚本组合参数
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import { applyCpmBudgetCap, splitGrossWithPlatformFee } from '../src/services/cpm-metrics.service';
import { decimalToNumber } from '../src/utils/decimal';
import { pick, omit, deepClone, isEmpty } from '../src/utils/helpers';
import { maskRealName, maskIdNumber } from '../src/utils/mask';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createAdvertiserSchema,
  createOrderSchema,
  registerSchema,
  withdrawSchema,
  rechargeSchema,
  kolSearchSchema,
  paginationSchema,
  bindKolAccountSchema,
  verifyCodeBodySchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

describe('gstack batch11 — Campaign 日期区间 / 内容 / 粉丝 / objective / per_video', () => {
  it('createCampaignSchema start_date 与 end_date', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 100,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
    });
    expect(r.start_date).toBe('2026-01-01');
    expect(r.end_date).toBe('2026-12-31');
  });

  it('createCampaignSchema min_followers 与 max_followers', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 50,
      min_followers: 1000,
      max_followers: 50000,
    });
    expect(r.min_followers).toBe(1000);
    expect(r.max_followers).toBe(50000);
  });

  it('createCampaignSchema budget_type per_video', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 30,
      budget_type: 'per_video',
    });
    expect(r.budget_type).toBe('per_video');
  });

  it('updateCampaignSchema 仅 objective', () => {
    const r = updateCampaignSchema.parse({ objective: 'conversion' });
    expect(r.objective).toBe('conversion');
  });

  it('updateCampaignSchema content_requirements', () => {
    const r = updateCampaignSchema.parse({
      content_requirements: '需含产品特写',
    });
    expect(r.content_requirements).toBe('需含产品特写');
  });
});

describe('gstack batch11 — 广告主 / 订单 / 注册 KOL 角色', () => {
  it('createAdvertiserSchema contact_email 与 contact_phone', () => {
    const r = createAdvertiserSchema.parse({
      company_name: '公司',
      contact_email: 'sales@co.com',
      contact_phone: '13800000000',
    });
    expect(r.contact_email).toBe('sales@co.com');
    expect(r.contact_phone).toBe('13800000000');
  });

  it('createOrderSchema fixed 显式 pricing_model', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'fixed',
      offered_price: 120,
    });
    expect(r.pricing_model).toBe('fixed');
  });

  it('registerSchema role 为 kol', () => {
    const r = registerSchema.parse({
      email: 'kol@example.com',
      password: 'Abcd1234!',
      role: 'kol',
    });
    expect(r.role).toBe('kol');
  });
});

describe('gstack batch11 — withdraw / recharge / verifyCode / bindKol', () => {
  it('withdrawSchema alipay', () => {
    const r = withdrawSchema.parse({
      amount: 80,
      payment_method: 'alipay',
      account_name: '支付宝',
      account_number: '13800001111',
    });
    expect(r.payment_method).toBe('alipay');
  });

  it('withdrawSchema remarks 可选', () => {
    const r = withdrawSchema.parse({
      amount: 10,
      payment_method: 'alipay',
      account_name: 'a',
      account_number: '1',
      remarks: '加急',
    });
    expect(r.remarks).toBe('加急');
  });

  it('rechargeSchema bank_transfer', () => {
    const r = rechargeSchema.parse({
      amount: 200,
      payment_method: 'bank_transfer',
    });
    expect(r.payment_method).toBe('bank_transfer');
  });

  it('verifyCodeBodySchema purpose verify', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '000000',
      purpose: 'verify',
    });
    expect(r.purpose).toBe('verify');
  });

  it('bindKolAccountSchema access_token 可选', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'tt',
      platform_id: 'tid',
      access_token: 'tok',
    });
    expect(r.access_token).toBe('tok');
  });
});

describe('gstack batch11 — kolSearch / pagination', () => {
  it('kolSearchSchema platform 与 min_engagement_rate 强转', () => {
    const r = kolSearchSchema.parse({
      platform: 'tiktok',
      min_engagement_rate: '0.03' as unknown as number,
    });
    expect(r.platform).toBe('tiktok');
    expect(r.min_engagement_rate).toBeCloseTo(0.03);
  });

  it('paginationSchema order asc', () => {
    const r = paginationSchema.parse({ page: 1, order: 'asc' });
    expect(r.order).toBe('asc');
  });
});

describe('gstack batch11 — CPM cap / 零平台费 / 脚本参数', () => {
  it('applyCpmBudgetCap 将 gross 限制为 cap', () => {
    expect(applyCpmBudgetCap(100, new Prisma.Decimal(25))).toBe(25);
  });

  it('splitGrossWithPlatformFee 费率 0 时 KOL 拿满 gross', () => {
    const s = splitGrossWithPlatformFee(100, 0);
    expect(s.platformFee).toBe(0);
    expect(s.kolEarning).toBe(100);
  });

  it('parseMetricsBatchArgs --cpm-only + --limit + --views-delta', () => {
    expect(parseMetricsBatchArgs(['--cpm-only', '--limit', '100', '--views-delta', '-1'])).toEqual({
      limit: 100,
      cpmOnly: true,
      viewsDelta: -1,
    });
  });
});

describe('gstack batch11 — helpers pick / omit / deepClone / isEmpty', () => {
  it('pick 与 omit', () => {
    const o = { a: 1, b: 2, c: 3 };
    expect(pick(o, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    expect(omit(o, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('deepClone 修改副本不影响源', () => {
    const a = { n: { x: 1 } };
    const b = deepClone(a);
    b.n.x = 9;
    expect(a.n.x).toBe(1);
  });

  it('isEmpty 空对象', () => {
    expect(isEmpty({})).toBe(true);
  });
});

describe('gstack batch11 — maskRealName / maskIdNumber / KOL display_name / decimalToNumber', () => {
  it('maskRealName 双字', () => {
    expect(maskRealName('李四')).toBe('李*');
  });

  it('maskIdNumber 18 位身份证', () => {
    expect(maskIdNumber('110101199001011234')).toBe('110101********1234');
  });

  it('computeKolKeywordRank display_name 精确匹配', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'z', platformDisplayName: 'brand', bio: null, category: null },
      'brand'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it('decimalToNumber 非法字符串为 0', () => {
    expect(decimalToNumber('not-a-number')).toBe(0);
  });
});
