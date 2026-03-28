/**
 * GStack 平台核心域单测第十批次：
 * Campaign/广告主/订单/KOL 等 Zod 扩展字段、CPM 公式、KOL 排序、脱敏、指标脚本参数、helpers、decimal
 */

import { Prisma } from '@prisma/client';
import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  billableImpressionsFromOrderViews,
  grossSpendFromCpm,
} from '../src/services/cpm-metrics.service';
import { decimalToNumber } from '../src/utils/decimal';
import { formatISODate, parseISODate, daysDifference } from '../src/utils/helpers';
import { maskTaxId, maskEmail } from '../src/utils/mask';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  createAdvertiserSchema,
  updateAdvertiserSchema,
  registerSchema,
  kolSearchSchema,
  createKolSchema,
  bindKolAccountSchema,
  syncKolDataSchema,
  submitOrderSchema,
  reviseOrderSchema,
  rechargeSchema,
  updateUserSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

describe('gstack batch10 — Campaign Zod 受众/标签/国家/截止', () => {
  it('createCampaignSchema target_audience', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 200,
      target_audience: { gender: 'all', age_range: '18-35', interests: ['tech'] },
    });
    expect(r.target_audience?.gender).toBe('all');
    expect(r.target_audience?.interests).toEqual(['tech']);
  });

  it('createCampaignSchema required_hashtags', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 1,
      required_hashtags: ['#brand', '#ad'],
    });
    expect(r.required_hashtags).toEqual(['#brand', '#ad']);
  });

  it('createCampaignSchema target_countries', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 10,
      target_countries: ['US', 'GB'],
    });
    expect(r.target_countries).toEqual(['US', 'GB']);
  });

  it('updateCampaignSchema deadline（datetime）', () => {
    const r = updateCampaignSchema.parse({
      deadline: '2026-06-01T12:00:00.000Z',
      status: 'paused',
    });
    expect(r.deadline).toContain('2026-06-01');
    expect(r.status).toBe('paused');
  });
});

describe('gstack batch10 — createOrderSchema requirements / kolSearch / register', () => {
  it('createOrderSchema fixed 含 requirements', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      offered_price: 50,
      requirements: '首帧口播品牌名',
    });
    expect(r.requirements).toBe('首帧口播品牌名');
  });

  it('kolSearchSchema keyword 与 regions', () => {
    const r = kolSearchSchema.parse({ keyword: 'beauty', regions: 'US,UK' });
    expect(r.keyword).toBe('beauty');
    expect(r.regions).toBe('US,UK');
  });

  it('registerSchema nickname', () => {
    const r = registerSchema.parse({
      email: 'nick@example.com',
      password: 'Abcd1234!',
      nickname: '展示名',
    });
    expect(r.nickname).toBe('展示名');
  });
});

describe('gstack batch10 — 广告主 / 充值 / 用户语言', () => {
  it('createAdvertiserSchema company_name_en', () => {
    const r = createAdvertiserSchema.parse({
      company_name: '某某公司',
      company_name_en: 'ACME Ltd',
    });
    expect(r.company_name_en).toBe('ACME Ltd');
  });

  it('updateAdvertiserSchema company_name_en 可置 null', () => {
    const r = updateAdvertiserSchema.parse({ company_name_en: null });
    expect(r.company_name_en).toBeNull();
  });

  it('rechargeSchema wechat', () => {
    const r = rechargeSchema.parse({
      amount: 100,
      payment_method: 'wechat',
    });
    expect(r.payment_method).toBe('wechat');
  });

  it('updateUserSchema language BCP47', () => {
    const r = updateUserSchema.parse({ language: 'en-US' });
    expect(r.language).toBe('en-US');
  });
});

describe('gstack batch10 — KOL 绑定 / 同步 / 交稿', () => {
  it('createKolSchema xiaohongshu', () => {
    const r = createKolSchema.parse({
      platform: 'xiaohongshu',
      platform_username: 'xhs_u',
      platform_id: 'xid',
    });
    expect(r.platform).toBe('xiaohongshu');
  });

  it('bindKolAccountSchema instagram 必填项', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'instagram',
      platform_username: 'ig',
      platform_id: 'igid',
    });
    expect(r.platform).toBe('instagram');
  });

  it('syncKolDataSchema 多 account_ids', () => {
    const a = '550e8400-e29b-41d4-a716-446655440010';
    const b = '550e8400-e29b-41d4-a716-446655440011';
    const r = syncKolDataSchema.parse({ account_ids: [a, b] });
    expect(r.account_ids).toEqual([a, b]);
  });

  it('submitOrderSchema draft + message', () => {
    const r = submitOrderSchema.parse({
      draft_urls: ['https://v.example.com/1'],
      message: '请审',
    });
    expect(r.message).toBe('请审');
  });

  it('reviseOrderSchema 多条链接', () => {
    const r = reviseOrderSchema.parse({
      draft_urls: ['https://v.example.com/a', 'https://v.example.com/b'],
    });
    expect(r.draft_urls).toHaveLength(2);
  });
});

describe('gstack batch10 — CPM 曝光计费 / KOL 排序 / 脱敏', () => {
  it('billableImpressionsFromOrderViews 0', () => {
    expect(billableImpressionsFromOrderViews(0)).toBe(0);
  });

  it('grossSpendFromCpm 5000 曝光 × 2 CPM', () => {
    expect(grossSpendFromCpm(5000, 2)).toBe(10);
  });

  it('computeKolKeywordRank 仅 bio 命中', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'z', platformDisplayName: null, bio: 'travel vlog', category: null },
      'travel'
    );
    expect(r.matched_fields).toEqual(['bio']);
    expect(r.score).toBeGreaterThanOrEqual(35);
  });

  it('maskTaxId 短税号返回 ****', () => {
    expect(maskTaxId('12')).toBe('****');
  });

  it('maskEmail 短用户名', () => {
    expect(maskEmail('ab@x.com')).toBe('****@x.com');
  });
});

describe('gstack batch10 — parseMetricsBatchArgs / helpers / decimalToNumber', () => {
  it('parseMetricsBatchArgs limit 与 views-delta', () => {
    expect(parseMetricsBatchArgs(['--limit', '10', '--views-delta', '3'])).toEqual({
      limit: 10,
      cpmOnly: false,
      viewsDelta: 3,
    });
  });

  it('formatISODate 与 parseISODate 往返', () => {
    const d = new Date('2026-03-15T08:00:00.000Z');
    expect(parseISODate(formatISODate(d)).toISOString()).toBe(d.toISOString());
  });

  it('daysDifference 正序天数', () => {
    const a = new Date(2026, 0, 1);
    const b = new Date(2026, 0, 11);
    expect(daysDifference(a, b)).toBe(10);
  });

  it('decimalToNumber Prisma.Decimal 整数', () => {
    expect(decimalToNumber(new Prisma.Decimal(42))).toBe(42);
  });
});
