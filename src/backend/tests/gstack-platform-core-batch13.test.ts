/**
 * GStack 平台核心域单测第十三批次（30 个核心域）：
 * 注册/登录/刷新/验证码、订单 superRefine 失败矩阵、活动 deadline、KOL 排序多字段、
 * CPM 舍入与 20% 抽成、指标脚本组合参数、partialRelease、decimalToNumber、
 * mask 与 validateRequest 错误详情
 */

import { parseMetricsBatchArgs } from '../src/scripts/lib/orderMetricsBatchPayload';
import {
  grossSpendFromCpm,
  splitGrossWithPlatformFee,
  prismaDecimalsFromCpmSettlement,
} from '../src/services/cpm-metrics.service';
import { partialReleaseAmount } from '../src/services/order-budget.service';
import { decimalToNumber } from '../src/utils/decimal';
import { formatISODate, parseISODate } from '../src/utils/helpers';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { maskEmail, maskUserData } from '../src/utils/mask';
import { z } from 'zod';
import {
  registerSchema,
  refreshTokenSchema,
  sendVerificationCodeSchema,
  changePasswordSchema,
  createCampaignSchema,
  updateCampaignSchema,
  createOrderSchema,
  submitOrderSchema,
  bindKolAccountSchema,
  validateRequest,
  ValidationError,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

const STRONG_NEW = 'Abcd1234!';

describe('gstack batch13 — register / login / refresh / 验证码', () => {
  it('registerSchema invite_code 空串预处理后不传 invite', () => {
    const r = registerSchema.parse({
      email: 'a@b.com',
      password: STRONG_NEW,
      invite_code: '',
    });
    expect(r.invite_code).toBeUndefined();
  });

  it('registerSchema role kol', () => {
    const r = registerSchema.parse({
      email: 'kol@b.com',
      password: STRONG_NEW,
      role: 'kol',
    });
    expect(r.role).toBe('kol');
  });

  it('refreshTokenSchema', () => {
    const r = refreshTokenSchema.parse({ refresh_token: 'rtok' });
    expect(r.refresh_token).toBe('rtok');
  });

  it('sendVerificationCodeSchema purpose reset_password', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'u@e.com',
      purpose: 'reset_password',
    });
    expect(r.purpose).toBe('reset_password');
  });

  it('changePasswordSchema 新密码不符合强度则失败', () => {
    expect(() =>
      changePasswordSchema.parse({
        current_password: 'old',
        new_password: 'weak',
      })
    ).toThrow();
  });

  it('changePasswordSchema 强新密码通过', () => {
    const r = changePasswordSchema.parse({
      current_password: 'Old1!pass',
      new_password: STRONG_NEW,
    });
    expect(r.new_password).toBe(STRONG_NEW);
  });
});

describe('gstack batch13 — Campaign deadline / 状态 / 平台', () => {
  it('createCampaignSchema deadline ISO 与 per_video', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 1,
      budget_type: 'per_video',
      deadline: '2026-03-28T12:00:00.000Z',
    });
    expect(r.budget_type).toBe('per_video');
    expect(r.deadline).toBe('2026-03-28T12:00:00.000Z');
  });

  it('createCampaignSchema target_platforms 含 xiaohongshu 与 weibo', () => {
    const r = createCampaignSchema.parse({
      title: 'T',
      budget: 10,
      target_platforms: ['xiaohongshu', 'weibo'],
    });
    expect(r.target_platforms).toEqual(['xiaohongshu', 'weibo']);
  });

  it('updateCampaignSchema status cancelled', () => {
    const r = updateCampaignSchema.parse({ status: 'cancelled' });
    expect(r.status).toBe('cancelled');
  });
});

describe('gstack batch13 — createOrder superRefine 失败 / submitOrder / bindKol', () => {
  it('createOrderSchema fixed 缺 offered_price 失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
        pricing_model: 'fixed',
      })
    ).toThrow();
  });

  it('createOrderSchema cpm 缺 cpm_rate 失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
        pricing_model: 'cpm',
        offered_price: 100,
      })
    ).toThrow();
  });

  it('createOrderSchema cpm 缺 offered_price 失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
        pricing_model: 'cpm',
        cpm_rate: 5,
      })
    ).toThrow();
  });

  it('submitOrderSchema draft_urls 为空失败', () => {
    expect(() => submitOrderSchema.parse({ draft_urls: [] })).toThrow();
  });

  it('bindKolAccountSchema weibo 含 access_token', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'weibo',
      platform_username: 'u',
      platform_id: 'id1',
      access_token: 'at',
    });
    expect(r.platform).toBe('weibo');
    expect(r.access_token).toBe('at');
  });
});

describe('gstack batch13 — computeKolKeywordRank 空词 / 精确 / 多字段加成', () => {
  it('computeKolKeywordRank 空关键词 0 分', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'a', platformDisplayName: 'b', bio: 'c', category: 'd' },
      '   '
    );
    expect(r.score).toBe(0);
    expect(r.matched_fields).toEqual([]);
  });

  it('computeKolKeywordRank display_name 精确匹配（95+单字段加成）', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'other', platformDisplayName: 'BeautyBrand', bio: null, category: null },
      'BeautyBrand'
    );
    expect(r.matched_fields).toContain('display_name');
    expect(r.score).toBe(98);
  });

  it('computeKolKeywordRank 用户名精确 + bio 命中 多字段加成', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'alpha', platformDisplayName: null, bio: 'alpha tips daily', category: null },
      'alpha'
    );
    expect(r.matched_fields.sort()).toEqual(['bio', 'username'].sort());
    expect(r.score).toBe(106);
  });
});

describe('gstack batch13 — CPM 舍入 / 抽成比例 / Prisma Decimal 封装', () => {
  it('grossSpendFromCpm 小数费率四舍五入到分', () => {
    expect(grossSpendFromCpm(1000, 3.333)).toBeCloseTo(3.33, 5);
  });

  it('splitGrossWithPlatformFee 费率 0.2', () => {
    const s = splitGrossWithPlatformFee(100, 0.2);
    expect(s.platformFee).toBe(20);
    expect(s.kolEarning).toBe(80);
  });

  it('prismaDecimalsFromCpmSettlement 固定 8 位小数字符串', () => {
    const d = prismaDecimalsFromCpmSettlement(12.345678901, 1.2, 11.145678901);
    expect(d.price.toFixed(8)).toBe('12.34567890');
    expect(d.platformFee.toFixed(8)).toBe('1.20000000');
    expect(d.kolEarning.toFixed(8)).toBe('11.14567890');
  });
});

describe('gstack batch13 — parseMetricsBatchArgs / partialRelease / decimalToNumber', () => {
  it('parseMetricsBatchArgs --cpm-only 与 --views-delta', () => {
    const a = parseMetricsBatchArgs(['--cpm-only', '--views-delta', '7']);
    expect(a.cpmOnly).toBe(true);
    expect(a.viewsDelta).toBe(7);
    expect(a.limit).toBe(50);
  });

  it('parseMetricsBatchArgs --limit 0 规范为 1', () => {
    const a = parseMetricsBatchArgs(['--limit', '0']);
    expect(a.limit).toBe(1);
  });

  it('partialReleaseAmount requested<=0 返回 0', () => {
    expect(partialReleaseAmount(50, 0)).toBe(0);
    expect(partialReleaseAmount(50, -1)).toBe(0);
  });

  it('partialReleaseAmount 取 min', () => {
    expect(partialReleaseAmount(30, 100)).toBe(30);
    expect(partialReleaseAmount(100, 40)).toBe(40);
  });

  it('decimalToNumber 数字字符串', () => {
    expect(decimalToNumber('99.5')).toBe(99.5);
  });

  it('decimalToNumber toNumber 非有限值归零', () => {
    const bad = { toNumber: () => NaN };
    expect(decimalToNumber(bad)).toBe(0);
  });
});

describe('gstack batch13 — maskEmail / maskUserData real_name / validateRequest', () => {
  it('maskEmail 长用户名保留前三', () => {
    expect(maskEmail('hello_world@ex.com')).toMatch(/^hel\*\*\*\*@ex\.com$/);
  });

  it('maskUserData 仅 snake_case real_name 也脱敏', () => {
    const out = maskUserData({ real_name: '王小明' });
    expect(out['real_name']).toBe('王**');
  });

  it('validateRequest Zod 失败抛出 ValidationError 且含 details', () => {
    try {
      validateRequest(z.object({ n: z.number() }), { n: 'x' });
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).details.length).toBeGreaterThan(0);
      expect((e as ValidationError).details[0].message).toBeTruthy();
    }
  });
});

describe('gstack batch13 — formatISODate / parseISODate 往返', () => {
  it('parseISODate 与 formatISODate 契约', () => {
    const d = new Date('2024-06-15T08:30:00.000Z');
    const s = formatISODate(d);
    const back = parseISODate(s);
    expect(back.toISOString()).toBe(d.toISOString());
  });
});
