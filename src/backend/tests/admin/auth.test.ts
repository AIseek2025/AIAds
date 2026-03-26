import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';


describe('Admin Auth API Tests', () => {
  let adminAccessToken: string;
  let adminRefreshToken: string;
  let testAdminId: string;
  let testRoleId: string;

  // Helper to create test admin role and admin
  const createTestAdmin = async () => {
    // Create admin role if not exists
    const role = await prisma.adminRole.upsert({
      where: { name: 'Test Admin' },
      update: {},
      create: {
        name: 'Test Admin',
        description: 'Test admin role',
        permissions: ['user:view', 'user:ban', 'kol:view', 'kol:approve', 'kol:reject', 'content:view', 'content:approve', 'content:reject', 'finance:view', 'withdrawal:review', 'withdrawal:approve', 'withdrawal:reject', 'dashboard:view', 'analytics:view'],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    const email = `admin_${Date.now()}@aiads.com`;
    
    // Create admin user
    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu', // 'AdminPass123!'
        name: 'Test Admin',
        roleId: testRoleId,
        status: 'active',
      },
    });
    testAdminId = admin.id;

    // Login
    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        username: email,
        password: 'AdminPass123!',
      });

    adminAccessToken = loginRes.body.data.tokens.access_token;
    adminRefreshToken = loginRes.body.data.tokens.refresh_token;

    return { admin, email };
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await createTestAdmin();
  });

  afterEach(async () => {
    // Cleanup
    if (testAdminId) {
      await prisma.admin.delete({ where: { id: testAdminId } }).catch(() => {});
    }
    await prisma.adminRole.delete({ where: { id: testRoleId } }).catch(() => {});
  });

  describe('POST /api/v1/admin/auth/login', () => {
    it('应该成功登录管理员账号', async () => {
      const email = `login_${Date.now()}@aiads.com`;
      
      await prisma.admin.create({
        data: {
          email,
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
          name: 'Login Test Admin',
          roleId: testRoleId,
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          username: email,
          password: 'AdminPass123!',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.admin).toBeDefined();
      expect(response.body.data.admin.email).toBe(email);
      expect(response.body.data.tokens.access_token).toBeDefined();
      expect(response.body.data.tokens.refresh_token).toBeDefined();

      // Cleanup
      await prisma.admin.delete({ where: { email } });
    });

    it('应该拒绝错误密码', async () => {
      const email = `wrongpass_${Date.now()}@aiads.com`;
      
      await prisma.admin.create({
        data: {
          email,
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
          name: 'Wrong Pass Admin',
          roleId: testRoleId,
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          username: email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');

      // Cleanup
      await prisma.admin.delete({ where: { email } });
    });

    it('应该拒绝不存在的邮箱', async () => {
      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          username: 'notexist@aiads.com',
          password: 'AdminPass123!',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('应该拒绝已禁用的管理员账号', async () => {
      const email = `disabled_${Date.now()}@aiads.com`;
      
      await prisma.admin.create({
        data: {
          email,
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
          name: 'Disabled Admin',
          roleId: testRoleId,
          status: 'inactive',
        },
      });

      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          username: email,
          password: 'AdminPass123!',
        })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ADMIN_INACTIVE');

      // Cleanup
      await prisma.admin.delete({ where: { email } });
    });

    it('应该拒绝缺少必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/admin/auth/login')
        .send({
          username: 'test@aiads.com',
          // Missing password
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/auth/me', () => {
    it('应该返回当前管理员信息', async () => {
      const response = await request(app)
        .get('/api/v1/admin/auth/me')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.admin).toBeDefined();
      expect(response.body.data.admin.email).toContain('admin_');
      expect(response.body.data.role).toBeDefined();
      expect(response.body.data.permissions).toBeDefined();
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('应该拒绝无效 Token', async () => {
      const response = await request(app)
        .get('/api/v1/admin/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });
  });

  describe('POST /api/v1/admin/auth/logout', () => {
    it('应该成功登出', async () => {
      const response = await request(app)
        .post('/api/v1/admin/auth/logout')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登出成功');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .post('/api/v1/admin/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
