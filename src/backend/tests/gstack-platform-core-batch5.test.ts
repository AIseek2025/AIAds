/**
 * GStack 平台核心域单测第五批次：
 * 管理员 JWT 签发与校验 / Prisma.Decimal 与 decimalToNumber / 缓存键与 TTL 契约矩阵
 */

import { Prisma } from '@prisma/client';
import { decimalToNumber } from '../src/utils/decimal';
import { generateAdminTokens, verifyToken, TokenError } from '../src/utils/crypto';
import { CacheKeys, CacheTTL } from '../src/services/cache.service';

describe('gstack batch5 — Admin JWT (generateAdminTokens + verifyToken)', () => {
  it('admin_access 解码后保留 sub/email/role/permissions', () => {
    const pair = generateAdminTokens({
      sub: 'admin-id-1',
      email: 'ops@example.com',
      role: 'super_admin',
      permissions: ['users:read', 'orders:write'],
    });
    const v = verifyToken(pair.accessToken, 'admin_access') as {
      sub: string;
      email: string;
      role: string;
      permissions: string[];
    };
    expect(v.sub).toBe('admin-id-1');
    expect(v.email).toBe('ops@example.com');
    expect(v.role).toBe('super_admin');
    expect(v.permissions).toEqual(['users:read', 'orders:write']);
  });

  it('admin_refresh 可校验且载荷含 sub', () => {
    const pair = generateAdminTokens({
      sub: 'admin-id-2',
      email: 'a@b.co',
      role: 'admin',
      permissions: [],
    });
    const v = verifyToken(pair.refreshToken, 'admin_refresh');
    expect(v.sub).toBe('admin-id-2');
  });

  it('access 与 refresh 用错校验类型时抛出 TokenError', () => {
    const pair = generateAdminTokens({
      sub: 'x',
      email: 'a@b.co',
      role: 'admin',
      permissions: [],
    });
    expect(() => verifyToken(pair.accessToken, 'admin_refresh')).toThrow(TokenError);
    expect(() => verifyToken(pair.refreshToken, 'admin_access')).toThrow(TokenError);
  });

  it('generateAdminTokens 返回 expiresIn 为管理端 access 秒数（28800）', () => {
    const pair = generateAdminTokens({
      sub: 'y',
      email: 'a@b.co',
      role: 'admin',
      permissions: [],
    });
    expect(pair.expiresIn).toBe(28800);
    expect(pair.accessToken.length).toBeGreaterThan(20);
    expect(pair.refreshToken.length).toBeGreaterThan(20);
  });
});

describe('gstack batch5 — decimalToNumber with Prisma.Decimal', () => {
  it('Prisma.Decimal 正小数转为 number', () => {
    expect(decimalToNumber(new Prisma.Decimal('123.45'))).toBeCloseTo(123.45);
  });

  it('Prisma.Decimal 零与高精度', () => {
    expect(decimalToNumber(new Prisma.Decimal(0))).toBe(0);
    expect(decimalToNumber(new Prisma.Decimal('0.0001'))).toBeCloseTo(0.0001);
  });

  it('Prisma.Decimal 负数', () => {
    expect(decimalToNumber(new Prisma.Decimal('-99.5'))).toBeCloseTo(-99.5);
  });
});

describe('gstack batch5 — CacheKeys extended naming (advertiser / campaign / kol / order / user)', () => {
  it('advertiser.byId / byUserId / campaigns / wallet', () => {
    expect(CacheKeys.advertiser.byId('adv1')).toBe('advertiser:adv1');
    expect(CacheKeys.advertiser.byUserId('u1')).toBe('advertiser:user:u1');
    expect(CacheKeys.advertiser.campaigns('adv1', 'active')).toBe('advertiser:adv1:campaigns:active');
    expect(CacheKeys.advertiser.wallet('adv1')).toBe('advertiser:adv1:wallet');
  });

  it('campaign.byId / list / active / stats', () => {
    expect(CacheKeys.campaign.byId('c1')).toBe('campaign:c1');
    expect(CacheKeys.campaign.list('adv9', 'draft')).toBe('campaign:list:adv9:draft');
    expect(CacheKeys.campaign.active()).toBe('campaign:active');
    expect(CacheKeys.campaign.stats('c2')).toBe('campaign:c2:stats');
  });

  it('kol.byId / byUserId / byPlatform / stats / accounts', () => {
    expect(CacheKeys.kol.byId('k1')).toBe('kol:k1');
    expect(CacheKeys.kol.byUserId('u2')).toBe('kol:user:u2');
    expect(CacheKeys.kol.byPlatform('tiktok', 'active')).toBe('kol:platform:tiktok:active');
    expect(CacheKeys.kol.stats('k3', '2024-01')).toBe('kol:k3:stats:2024-01');
    expect(CacheKeys.kol.accounts('k4')).toBe('kol:k4:accounts');
  });

  it('order.byId / byNo / list / stats', () => {
    expect(CacheKeys.order.byId('o1')).toBe('order:o1');
    expect(CacheKeys.order.byNo('NO-001')).toBe('order:no:NO-001');
    expect(CacheKeys.order.list('a1', 'k9', 'completed')).toBe('order:list:a1:k9:completed');
    expect(CacheKeys.order.stats('o2')).toBe('order:o2:stats');
  });

  it('order.list 缺省参数为 all 占位', () => {
    expect(CacheKeys.order.list(undefined, undefined, undefined)).toBe('order:list:all:all:all');
  });

  it('campaign.list 缺省 status 为 all', () => {
    expect(CacheKeys.campaign.list('adv-only')).toBe('campaign:list:adv-only:all');
  });

  it('kol.byPlatform 缺省 status 为 all', () => {
    expect(CacheKeys.kol.byPlatform('instagram')).toBe('kol:platform:instagram:all');
  });

  it('user.byEmail / byPhone / list', () => {
    expect(CacheKeys.user.byEmail('a@b.co')).toBe('user:email:a@b.co');
    expect(CacheKeys.user.byPhone('+8613800138000')).toBe('user:phone:+8613800138000');
    expect(CacheKeys.user.list('kol', 'pending')).toBe('user:list:kol:pending');
  });
});

describe('gstack batch5 — CacheKeys dashboard & system', () => {
  it('dashboard.advertiser / kol / admin / analytics', () => {
    expect(CacheKeys.dashboard.advertiser('adv1', '7d')).toBe('dashboard:advertiser:adv1:7d');
    expect(CacheKeys.dashboard.kol('k1', '30d')).toBe('dashboard:kol:k1:30d');
    expect(CacheKeys.dashboard.admin('adm1', 'today')).toBe('dashboard:admin:adm1:today');
    expect(CacheKeys.dashboard.analytics('roi', 'x=1')).toBe('dashboard:analytics:roi:x=1');
  });

  it('system.config / counters / locks', () => {
    expect(CacheKeys.system.config('feature_x')).toBe('system:config:feature_x');
    expect(CacheKeys.system.counters('login')).toBe('system:counters:login');
    expect(CacheKeys.system.locks('payout')).toBe('system:locks:payout');
  });
});

describe('gstack batch5 — CacheKeys.kol.search stability', () => {
  it('相同参数对象生成同一 search key', () => {
    const p = { platform: 'youtube' as const, minFollowers: 1000, country: 'US' };
    expect(CacheKeys.kol.search(p)).toBe(CacheKeys.kol.search({ ...p }));
  });
});

describe('gstack batch5 — CacheTTL buckets', () => {
  it('user.detail / list', () => {
    expect(CacheTTL.user.detail).toBe(600);
    expect(CacheTTL.user.list).toBe(300);
  });

  it('kol.detail / search / stats / accounts', () => {
    expect(CacheTTL.kol.detail).toBe(600);
    expect(CacheTTL.kol.search).toBe(300);
    expect(CacheTTL.kol.stats).toBe(180);
    expect(CacheTTL.kol.accounts).toBe(300);
  });

  it('campaign.detail / list / stats', () => {
    expect(CacheTTL.campaign.detail).toBe(300);
    expect(CacheTTL.campaign.list).toBe(180);
    expect(CacheTTL.campaign.stats).toBe(120);
  });

  it('order.detail / list / stats', () => {
    expect(CacheTTL.order.detail).toBe(180);
    expect(CacheTTL.order.list).toBe(120);
    expect(CacheTTL.order.stats).toBe(60);
  });

  it('dashboard.advertiser / kol / admin / analytics', () => {
    expect(CacheTTL.dashboard.advertiser).toBe(60);
    expect(CacheTTL.dashboard.kol).toBe(60);
    expect(CacheTTL.dashboard.admin).toBe(60);
    expect(CacheTTL.dashboard.analytics).toBe(120);
  });

  it('system.config / counters', () => {
    expect(CacheTTL.system.config).toBe(3600);
    expect(CacheTTL.system.counters).toBe(60);
  });
});
