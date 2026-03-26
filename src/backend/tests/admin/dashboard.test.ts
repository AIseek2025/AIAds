import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';
import { cacheService } from '../../src/config/redis';

describe('Admin Dashboard API Tests', () => {
  let adminAccessToken: string;
  let testAdminId: string;
  let testRoleId: string;

  const setupAdminAuth = async () => {
    const role = await prisma.adminRole.upsert({
      where: { name: 'Test Admin Dashboard' },
      update: {},
      create: {
        name: 'Test Admin Dashboard',
        description: 'Test admin role for dashboard',
        permissions: ['dashboard:view', 'analytics:view'],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    const email = `admin_dashboard_${Date.now()}@aiads.com`;
    
    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
        name: 'Test Admin',
        roleId: testRoleId,
        status: 'active',
      },
    });
    testAdminId = admin.id;

    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        username: email,
        password: 'AdminPass123!',
      });

    adminAccessToken = loginRes.body.data.tokens.access_token;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await setupAdminAuth();
  });

  afterEach(async () => {
    // Cleanup
    if (testAdminId) {
      await prisma.admin.delete({ where: { id: testAdminId } }).catch(() => {});
    }
    await prisma.adminRole.delete({ where: { id: testRoleId } }).catch(() => {});
  });

  describe('GET /api/v1/admin/dashboard/stats', () => {
    it('应该返回平台统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.period).toBeDefined();
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.campaigns).toBeDefined();
      expect(response.body.data.orders).toBeDefined();
      expect(response.body.data.finance).toBeDefined();
      expect(response.body.data.content).toBeDefined();
    });

    it('应该包含用户统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const users = response.body.data.users;
      expect(users.total).toBeDefined();
      expect(users.newToday).toBeDefined();
      expect(users.activeToday).toBeDefined();
      expect(users.advertisers).toBeDefined();
      expect(users.kols).toBeDefined();
    });

    it('应该包含财务统计数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const finance = response.body.data.finance;
      expect(finance.totalRevenue).toBeDefined();
      expect(finance.todayRevenue).toBeDefined();
      expect(finance.totalPayout).toBeDefined();
      expect(finance.pendingWithdrawals).toBeDefined();
    });

    it('应该支持周期参数', async () => {
      const periods = ['today', 'week', 'month', 'quarter', 'year'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/v1/admin/dashboard/stats?period=${period}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.period.start).toBeDefined();
        expect(response.body.data.period.end).toBeDefined();
      }
    });

    it('应该使用缓存', async () => {
      // Mock cache service
      const mockCache = {
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue(undefined),
      };
      jest.mocked(cacheService.get).mockImplementation(mockCache.get);
      jest.mocked(cacheService.set).mockImplementation(mockCache.set);

      await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      // Cache should be set
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/v1/admin/dashboard/analytics', () => {
    it('应该返回用户增长数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics?metric=user_growth')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userGrowth).toBeDefined();
      expect(response.body.data.userGrowth.labels).toBeDefined();
      expect(Array.isArray(response.body.data.userGrowth.labels)).toBe(true);
      expect(response.body.data.userGrowth.series).toBeDefined();
    });

    it('应该返回收入趋势数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics?metric=revenue_trends')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.revenueTrend).toBeDefined();
    });

    it('应该返回平台分布数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics?metric=platform_distribution')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platformDistribution).toBeDefined();
    });

    it('应该返回分类分布数据', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics?metric=category_distribution')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.categoryDistribution).toBeDefined();
    });

    it('应该返回所有数据当 metric=all', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics?metric=all')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userGrowth).toBeDefined();
      expect(response.body.data.revenueTrend).toBeDefined();
      expect(response.body.data.platformDistribution).toBeDefined();
      expect(response.body.data.categoryDistribution).toBeDefined();
    });

    it('应该支持周期参数', async () => {
      const periods = ['week', 'month', 'quarter', 'year'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/v1/admin/dashboard/analytics?metric=all&period=${period}`)
          .set('Authorization', `Bearer ${adminAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/analytics')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/dashboard/kol-rankings', () => {
    it('应该返回 KOL 排行榜 (按收入)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings?metric=earnings')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metric).toBe('earnings');
      expect(response.body.data.rankings).toBeDefined();
      expect(Array.isArray(response.body.data.rankings)).toBe(true);
    });

    it('应该返回 KOL 排行榜 (按订单)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings?metric=orders')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metric).toBe('orders');
    });

    it('应该返回 KOL 排行榜 (按粉丝)', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings?metric=followers')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metric).toBe('followers');
    });

    it('应该支持限制返回数量', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings?limit=5')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rankings.length).toBeLessThanOrEqual(5);
    });

    it('应该支持平台筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings?platform=tiktok')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/dashboard/kol-rankings')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
