/**
 * GStack 平台核心域单测第八批次：
 * createOrder 定价分支 / 验证码与注册 Zod / helpers 边界 / 预算工具 / CPM 拆分 / DB 性能监控
 */

import { DatabasePerformanceMonitor } from '../src/middleware/performance';
import {
  billableImpressionsFromOrderViews,
  splitGrossWithPlatformFee,
} from '../src/services/cpm-metrics.service';
import { genTransactionNo, partialReleaseAmount } from '../src/services/order-budget.service';
import {
  isPast,
  isFuture,
  formatNumber,
  deepClone,
  flattenObject,
} from '../src/utils/helpers';
import {
  emailSchema,
  loginSchema,
  paginationSchema,
  registerSchema,
  createOrderSchema,
  sendVerificationCodeSchema,
  verifyCodeBodySchema,
  resetPasswordBodySchema,
  createKolSchema,
  bindKolAccountSchema,
  kolSearchSchema,
  updateUserSchema,
  createAdvertiserSchema,
} from '../src/utils/validator';

const CID = '550e8400-e29b-41d4-a716-446655440001';
const KID = '550e8400-e29b-41d4-a716-446655440002';

describe('gstack batch8 — createOrderSchema fixed vs CPM superRefine', () => {
  it('fixed 订单通过且默认 pricing_model', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      offered_price: 88,
    });
    expect(r.pricing_model).toBe('fixed');
    expect(r.offered_price).toBe(88);
  });

  it('CPM 订单需 cpm_rate 与 offered_price', () => {
    const r = createOrderSchema.parse({
      campaign_id: CID,
      kol_id: KID,
      pricing_model: 'cpm',
      cpm_rate: 12,
      offered_price: 500,
    });
    expect(r.pricing_model).toBe('cpm');
    expect(r.cpm_rate).toBe(12);
  });

  it('fixed 缺 offered_price 失败', () => {
    expect(() =>
      createOrderSchema.parse({
        campaign_id: CID,
        kol_id: KID,
      })
    ).toThrow();
  });
});

describe('gstack batch8 — 验证码与邮箱/登录 Zod', () => {
  it('sendVerificationCodeSchema purpose 默认 register', () => {
    const r = sendVerificationCodeSchema.parse({
      type: 'email',
      target: 'a@b.co',
    });
    expect(r.purpose).toBe('register');
  });

  it('verifyCodeBodySchema purpose 默认 register', () => {
    const r = verifyCodeBodySchema.parse({
      type: 'email',
      target: 'a@b.co',
      code: '123456',
    });
    expect(r.purpose).toBe('register');
  });

  it('resetPasswordBodySchema 拒绝弱新密码', () => {
    expect(() =>
      resetPasswordBodySchema.parse({
        type: 'email',
        target: 'a@b.co',
        code: '123456',
        new_password: 'weak',
      })
    ).toThrow();
  });

  it('emailSchema 拒绝非法邮箱', () => {
    expect(() => emailSchema.parse('not-email')).toThrow();
  });

  it('loginSchema 缺密码失败', () => {
    expect(() => loginSchema.parse({ email: 'a@b.co' })).toThrow();
  });
});

describe('gstack batch8 — KOL / 搜索 / 注册 / 广告主 / 活动 / 用户', () => {
  it('createKolSchema weibo 平台', () => {
    const r = createKolSchema.parse({
      platform: 'weibo',
      platform_username: 'wb_u',
      platform_id: 'pid',
    });
    expect(r.platform).toBe('weibo');
  });

  it('bindKolAccountSchema 含可选头像 URL', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'youtube',
      platform_username: 'yt',
      platform_id: 'yid',
      platform_avatar_url: 'https://cdn.example.com/a.png',
    });
    expect(r.platform_avatar_url).toMatch(/^https:/);
  });

  it('kolSearchSchema platform 枚举', () => {
    const r = kolSearchSchema.parse({ platform: 'instagram' });
    expect(r.platform).toBe('instagram');
  });

  it('registerSchema 默认 advertiser', () => {
    const r = registerSchema.parse({
      email: 'reg@example.com',
      password: 'Abcd1234!',
    });
    expect(r.role).toBe('advertiser');
  });

  it('createAdvertiserSchema 仅公司名', () => {
    const r = createAdvertiserSchema.parse({ company_name: 'ACME' });
    expect(r.company_name).toBe('ACME');
  });

  it('updateUserSchema avatar_url 可为 null', () => {
    const r = updateUserSchema.parse({ avatar_url: null });
    expect(r.avatar_url).toBeNull();
  });

  it('paginationSchema sort 默认 created_at', () => {
    const r = paginationSchema.parse({});
    expect(r.sort).toBe('created_at');
    expect(r.order).toBe('desc');
  });
});

describe('gstack batch8 — helpers isPast / isFuture / formatNumber / deepClone / flattenObject', () => {
  it('isPast / isFuture', () => {
    const past = new Date(2000, 0, 1);
    const future = new Date(2100, 0, 1);
    expect(isPast(past)).toBe(true);
    expect(isFuture(future)).toBe(true);
  });

  it('formatNumber 负数', () => {
    expect(formatNumber(-1234)).toMatch(/1/);
    expect(formatNumber(-1234)).toMatch(/234/);
  });

  it('deepClone 独立副本', () => {
    const a = { x: [1, 2] };
    const b = deepClone(a);
    b.x[0] = 9;
    expect(a.x[0]).toBe(1);
  });

  it('flattenObject 嵌套 null 叶子', () => {
    expect(flattenObject({ a: { b: null } })).toEqual({ 'a.b': null });
  });
});

describe('gstack batch8 — order-budget genTransactionNo / partialReleaseAmount', () => {
  it('genTransactionNo 形如 TXN-时间戳-后缀', () => {
    const t = genTransactionNo();
    expect(t).toMatch(/^TXN-\d+-[A-Z0-9]{6}$/);
  });

  it('partialReleaseAmount 边界', () => {
    expect(partialReleaseAmount(100, 200)).toBe(100);
    expect(partialReleaseAmount(100, 50)).toBe(50);
  });
});

describe('gstack batch8 — cpm-metrics billable / split fee', () => {
  it('billableImpressionsFromOrderViews 向下取整', () => {
    expect(billableImpressionsFromOrderViews(3.9)).toBe(3);
  });

  it('splitGrossWithPlatformFee 自定义费率 15%', () => {
    const s = splitGrossWithPlatformFee(200, 0.15);
    expect(s.platformFee).toBe(30);
    expect(s.kolEarning).toBe(170);
  });
});

describe('gstack batch8 — DatabasePerformanceMonitor', () => {
  it('recordQuery 后 getQueryStats 含 model/action', () => {
    const db = new DatabasePerformanceMonitor(50);
    db.recordQuery('Order', 'findMany', 10, true);
    const rows = db.getQueryStats();
    expect(rows).toHaveLength(1);
    expect(rows[0].model).toBe('Order');
    expect(rows[0].action).toBe('findMany');
    expect(rows[0].count).toBe(1);
  });

  it('reset 清空统计', () => {
    const db = new DatabasePerformanceMonitor(10);
    db.recordQuery('User', 'findUnique', 5, true);
    db.reset();
    expect(db.getQueryStats()).toHaveLength(0);
  });
});
