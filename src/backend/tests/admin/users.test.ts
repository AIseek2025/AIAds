import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';

describe('Admin Users API Tests', () => {
  let adminAccessToken: string;
  let testAdminId: string;
  let testRoleId: string;
  let testUserId: string;

  // Helper to setup admin auth
  const setupAdminAuth = async () => {
    const role = await prisma.adminRole.upsert({
      where: { name: 'Test Admin Users' },
      update: {},
      create: {
        name: 'Test Admin Users',
        description: 'Test admin role for users',
        permissions: ['user:view', 'user:ban', 'user:unban'],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    const email = `admin_users_${Date.now()}@aiads.com`;

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

  // Helper to create test user
  const createTestUser = async (email?: string) => {
    const userEmail = email || `testuser_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
        nickname: 'Test User',
        role: 'advertiser',
        status: 'active',
        emailVerified: true,
      },
    });
    testUserId = user.id;
    return user;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await setupAdminAuth();
    await createTestUser();
  });

  afterEach(async () => {
    // Cleanup
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testAdminId) {
      await prisma.admin.delete({ where: { id: testAdminId } }).catch(() => {});
    }
    await prisma.adminRole.delete({ where: { id: testRoleId } }).catch(() => {});
  });

  describe('GET /api/v1/admin/users', () => {
    it('应该返回用户列表', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(20);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(10);
    });

    it('应该支持角色筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?role=advertiser')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.items.forEach((item: any) => {
        expect(item.role).toBe('advertiser');
      });
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?status=active')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.items.forEach((item: any) => {
        expect(item.status).toBe('active');
      });
    });

    it('应该支持关键词搜索', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users?keyword=Test')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/admin/users').expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/v1/admin/users/:id', () => {
    it('应该返回用户详情', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBeDefined();
    });

    it('应该返回 404 对于不存在的用户', async () => {
      const response = await request(app)
        .get('/api/v1/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get(`/api/v1/admin/users/${testUserId}`).expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/users/:id/ban', () => {
    it('应该成功封禁用户', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/ban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '违规操作',
          duration: 30,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('suspended');
      expect(response.body.data.banReason).toBe('违规操作');

      // Verify user status in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.status).toBe('suspended');
    });

    it('应该支持永久封禁 (duration=0)', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/ban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '严重违规',
          duration: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bannedUntil).toBeNull();
    });

    it('应该拒绝缺少封禁原因', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/ban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          duration: 30,
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝不存在的用户', async () => {
      const response = await request(app)
        .put('/api/v1/admin/users/00000000-0000-0000-0000-000000000000/ban')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '违规操作',
          duration: 30,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/ban`)
        .send({
          reason: '违规操作',
          duration: 30,
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/admin/users/:id/unban', () => {
    beforeEach(async () => {
      // First ban the user
      await request(app)
        .put(`/api/v1/admin/users/${testUserId}/ban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '违规操作',
          duration: 30,
        });
    });

    it('应该成功解封用户', async () => {
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/unban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          note: '申诉成功',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');

      // Verify user status in database
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.status).toBe('active');
    });

    it('应该拒绝未封禁的用户', async () => {
      // First unban
      await request(app)
        .put(`/api/v1/admin/users/${testUserId}/unban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      // Try to unban again
      const response = await request(app)
        .put(`/api/v1/admin/users/${testUserId}/unban`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_BANNED');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).put(`/api/v1/admin/users/${testUserId}/unban`).send().expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
