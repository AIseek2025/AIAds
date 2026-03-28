/**
 * GStack 平台核心域单测第六批次：
 * 门户 JWT / helpers 边界 / 脱敏扩展字段 / KOL 关键词分 / CPM 公式 / Zod 契约
 */

import { z } from 'zod';
import { generateTokens, verifyToken, decodeToken, TokenError } from '../src/utils/crypto';
import {
  flattenObject,
  pick,
  omit,
  slugify,
  truncate,
  daysDifference,
  formatCurrency,
} from '../src/utils/helpers';
import { maskUserData, maskCompanyName } from '../src/utils/mask';
import { computeKolKeywordRank } from '../src/utils/kolSearchRank';
import { grossSpendFromCpm } from '../src/services/cpm-metrics.service';
import { apiResponseSchema, registerSchema, bindKolAccountSchema } from '../src/utils/validator';

describe('gstack batch6 — portal JWT (generateTokens + verifyToken + decodeToken)', () => {
  const payload = {
    sub: 'user-portal-1',
    email: 'portal@example.com',
    role: 'advertiser' as const,
  };

  it('generateTokens 返回 expiresIn 3600（门户 access）', () => {
    const pair = generateTokens(payload);
    expect(pair.expiresIn).toBe(3600);
  });

  it('decodeToken 可读 access 载荷含 jti', () => {
    const pair = generateTokens(payload);
    const d = decodeToken(pair.accessToken);
    expect(d?.sub).toBe('user-portal-1');
    expect(d?.jti).toEqual(expect.any(String));
  });

  it('verifyToken access 校验通过', () => {
    const pair = generateTokens(payload);
    const v = verifyToken(pair.accessToken, 'access');
    expect(v.email).toBe('portal@example.com');
    expect(v.role).toBe('advertiser');
  });

  it('verifyToken refresh 校验通过且含 sub', () => {
    const pair = generateTokens(payload);
    const v = verifyToken(pair.refreshToken, 'refresh');
    expect(v.sub).toBe('user-portal-1');
  });

  it('refresh 误用 access 校验类型抛出 TokenError', () => {
    const pair = generateTokens(payload);
    expect(() => verifyToken(pair.refreshToken, 'access')).toThrow(TokenError);
  });
});

describe('gstack batch6 — helpers flattenObject / pick / omit / slugify / truncate / daysDifference / formatCurrency', () => {
  it('flattenObject 保留数组叶子（不向下展开）', () => {
    expect(flattenObject({ a: { b: [1, 2] } })).toEqual({ 'a.b': [1, 2] });
  });

  it('flattenObject 空嵌套对象', () => {
    expect(flattenObject({ x: {} })).toEqual({});
  });

  it('pick 仅拷贝对象上存在的键', () => {
    const o = { a: 1, b: 2 } as { a: number; b: number; c?: number };
    expect(pick(o, ['a', 'c' as 'a'])).toEqual({ a: 1 });
  });

  it('omit 可移除多键', () => {
    expect(omit({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ b: 2 });
  });

  it('slugify 合并多空格为单横线', () => {
    expect(slugify('Foo   Bar!!!')).toBe('foo-bar');
  });

  it('truncate 当 max 长度不小于字符串长度时原样返回', () => {
    expect(truncate('abc', 10)).toBe('abc');
  });

  it('daysDifference 日期倒序为负天数', () => {
    const later = new Date(2024, 5, 10);
    const earlier = new Date(2024, 5, 1);
    expect(daysDifference(later, earlier)).toBe(-9);
  });

  it('formatCurrency EUR 可解析出货币符号与数字', () => {
    const s = formatCurrency(99.5, 'EUR');
    expect(s).toMatch(/99/);
    expect(s.length).toBeGreaterThan(3);
  });
});

describe('gstack batch6 — maskUserData extended & maskCompanyName', () => {
  it('maskUserData 处理 idNumber / bankAccount / alipayAccount', () => {
    const out = maskUserData({
      idNumber: '110101199001011234',
      bankAccount: '6222021234567890123',
      alipayAccount: '13812345678',
    });
    expect(out.idNumber).toBe('110101********1234');
    expect(String(out.bankAccount)).toContain('6222');
    expect(out.alipayAccount).toBe('138****5678');
  });

  it('maskUserData wechatPayAccount 走手机号脱敏', () => {
    const out = maskUserData({ wechatPayAccount: '13900001111' });
    expect(out.wechatPayAccount).toBe('139****1111');
  });

  it('maskCompanyName 空字符串原样返回', () => {
    expect(maskCompanyName('')).toBe('');
  });
});

describe('gstack batch6 — computeKolKeywordRank', () => {
  it('username 含关键词（非前缀）命中 username 分档', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'xxfooyy', platformDisplayName: null, bio: null, category: null },
      'foo'
    );
    expect(r.matched_fields).toContain('username');
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it('bio contains 命中', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'z', platformDisplayName: null, bio: 'hello world beauty', category: null },
      'beauty'
    );
    expect(r.matched_fields).toContain('bio');
  });

  it('关键词大小写与 trim', () => {
    const a = computeKolKeywordRank(
      { platformUsername: 'ExactUser', platformDisplayName: null, bio: null, category: null },
      '  EXACTUSER  '
    );
    expect(a.score).toBeGreaterThanOrEqual(100);
  });

  it('category 前缀命中', () => {
    const r = computeKolKeywordRank(
      { platformUsername: 'z', platformDisplayName: null, bio: null, category: 'Beauty' },
      'bea'
    );
    expect(r.matched_fields).toContain('category');
    expect(r.score).toBeGreaterThanOrEqual(58);
  });
});

describe('gstack batch6 — grossSpendFromCpm', () => {
  it('万曝光 × CPM 单价', () => {
    expect(grossSpendFromCpm(10000, 50)).toBe(500);
  });
});

describe('gstack batch6 — Zod apiResponseSchema / registerSchema / bindKolAccountSchema', () => {
  it('apiResponseSchema 校验成功响应信封', () => {
    const schema = apiResponseSchema(z.object({ id: z.string() }));
    const ok = schema.parse({
      success: true,
      data: { id: 'x-1' },
    });
    expect(ok.success).toBe(true);
    expect(ok.data).toEqual({ id: 'x-1' });
  });

  it('registerSchema 将空 invite_code 预处理为 undefined', () => {
    const r = registerSchema.parse({
      email: 'a@b.co',
      password: 'Abcd1234!',
      invite_code: '',
    });
    expect(r.invite_code).toBeUndefined();
  });

  it('bindKolAccountSchema 最小合法绑定（无 avatar url）', () => {
    const r = bindKolAccountSchema.parse({
      platform: 'tiktok',
      platform_username: 'u1',
      platform_id: 'pid-1',
    });
    expect(r.platform).toBe('tiktok');
    expect(r.platform_avatar_url).toBeUndefined();
  });
});
