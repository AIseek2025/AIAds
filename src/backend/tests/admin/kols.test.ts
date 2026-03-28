import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';

describe('Admin KOLs API Tests', () => {
  let adminAccessToken: string;
  let testAdminId: string;
  let testRoleId: string;
  let testKolId: string;
  let testUserId: string;

  const setupAdminAuth = async () => {
    const role = await prisma.adminRole.upsert({
      where: { name: 'Test Admin KOLs' },
      update: {},
      create: {
        name: 'Test Admin KOLs',
        description: 'Test admin role for KOLs',
        permissions: ['kol:view', 'kol:review', 'kol:approve', 'kol:reject'],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    const email = `admin_kols_${Date.now()}@aiads.com`;

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

    const loginRes = await request(app).post('/api/v1/admin/auth/login').send({
      username: email,
      password: 'AdminPass123!',
    });

    adminAccessToken = loginRes.body.data.tokens.access_token;
  };

  const createTestKol = async (status: string = 'pending') => {
    const userEmail = `koluser_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
        nickname: 'KOL User',
        role: 'kol',
        status: 'active',
      },
    });
    testUserId = user.id;

    const kol = await prisma.kol.create({
      data: {
        userId: user.id,
        platform: 'tiktok',
        platformId: '123456789',
        platformUsername: '@testkol',
        platformDisplayName: 'Test KOL',
        bio: 'Test bio',
        category: 'beauty',
        country: 'US',
        followers: 10000,
        following: 100,
        totalVideos: 50,
        avgViews: 5000,
        avgLikes: 500,
        avgComments: 50,
        engagementRate: 0.05,
        status: status as any,
        verified: false,
        currency: 'USD',
      },
    });
    testKolId = kol.id;
    return kol;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await setupAdminAuth();
    await createTestKol('pending');
  });

  afterEach(async () => {
    // Cleanup
    if (testKolId) {
      await prisma.kol.delete({ where: { id: testKolId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testAdminId) {
      await prisma.admin.delete({ where: { id: testAdminId } }).catch(() => {});
    }
    await prisma.adminRole.delete({ where: { id: testRoleId } }).catch(() => {});
  });

  describe('GET /api/v1/admin/kols/pending', () => {
    it('应该返回待审核 KOL 列表', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('应该只返回 pending 状态的 KOL', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      const items = response.body.data.items || [];
      items.forEach((item: { status?: string }) => {
        expect(item.status).toBe('pending');
      });
    });

    it('应该支持平台筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols/pending?platform=tiktok')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/admin/kols/pending').expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/kols', () => {
    it('应该返回 KOL 列表', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols?status=pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.items || [];
      items.forEach((item: any) => {
        expect(item.status).toBe('pending');
      });
    });

    it('应该支持平台筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols?platform=tiktok')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.items || [];
      items.forEach((item: any) => {
        expect(item.platform).toBe('tiktok');
      });
    });

    it('应该支持粉丝数筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols?min_followers=5000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.items || [];
      items.forEach((item: any) => {
        expect(item.followers).toBeGreaterThanOrEqual(5000);
      });
    });
  });

  describe('GET /api/v1/admin/kols/:id', () => {
    it('应该返回 KOL 详情', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/kols/${testKolId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testKolId);
      expect(response.body.data.platform).toBe('tiktok');
      expect(response.body.data.followers).toBe(10000);
    });

    it('应该返回 404 对于不存在的 KOL', async () => {
      const response = await request(app)
        .get('/api/v1/admin/kols/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/kols/:id/approve', () => {
    it('应该通过 KOL 审核', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          note: '资料真实有效',
          setVerified: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.verified).toBe(true);

      // Verify in database
      const kol = await prisma.kol.findUnique({
        where: { id: testKolId },
      });
      expect(kol?.status).toBe('active');
      expect(kol?.verified).toBe(true);
    });

    it('应该拒绝已审核通过的 KOL', async () => {
      // First approve
      await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      // Try to approve again
      const response = await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('KOL_ALREADY_APPROVED');
    });

    it('应该拒绝不存在的 KOL', async () => {
      const response = await request(app)
        .post('/api/v1/admin/kols/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/kols/:id/reject', () => {
    it('应该拒绝 KOL 审核', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '粉丝数据造假',
          note: '内部备注',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe('粉丝数据造假');

      // Verify in database
      const kol = await prisma.kol.findUnique({
        where: { id: testKolId },
      });
      expect(kol?.status).toBe('rejected');
    });

    it('应该拒绝缺少拒绝原因', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝已拒绝的 KOL', async () => {
      // First reject
      await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: '原因' });

      // Try to reject again
      const response = await request(app)
        .post(`/api/v1/admin/kols/${testKolId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: '原因' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
