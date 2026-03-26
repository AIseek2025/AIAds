import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { cacheService } from '../src/config/redis';

describe('Auth API Tests', () => {
  // Mock cache service
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const registerData = {
        email: `test_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        phone: '+8613800138000',
        role: 'advertiser' as const,
        nickname: '测试用户',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(registerData.email);
      expect(response.body.data.user.role).toBe(registerData.role);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.access_token).toBeDefined();
      expect(response.body.data.tokens.refresh_token).toBeDefined();

      // Cleanup
      await prisma.user.delete({
        where: { email: registerData.email },
      });
    });

    it('应该拒绝重复邮箱注册', async () => {
      const email = `duplicate_${Date.now()}@example.com`;
      const registerData = {
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      };

      // First registration
      await request(app).post('/api/v1/auth/register').send(registerData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝弱密码', async () => {
      const registerData = {
        email: `weakpass_${Date.now()}@example.com`,
        password: '123', // Password too short
        role: 'advertiser' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝无效邮箱格式', async () => {
      const registerData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('应该拒绝无效角色', async () => {
      const registerData = {
        email: `invalidrole_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        role: 'invalid_role',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝缺少必填字段', async () => {
      const registerData = {
        email: `missing_${Date.now()}@example.com`,
        // Missing password
        role: 'advertiser' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该默认创建 advertiser 角色', async () => {
      const email = `norole_${Date.now()}@example.com`;
      const registerData = {
        email,
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.data.user.role).toBe('advertiser');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该创建 pending 状态的用户', async () => {
      const email = `pending_${Date.now()}@example.com`;
      const registerData = {
        email,
        password: 'SecurePass123!',
        role: 'kol' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body.data.user.status).toBe('pending');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app).post('/api/v1/auth/register').send({
        email: `login_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });
    });

    it('应该成功登录并返回 Token', async () => {
      const email = `login_${Date.now()}@example.com`;

      // Register first
      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      const loginData = {
        email,
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.access_token).toBeDefined();
      expect(response.body.data.tokens.refresh_token).toBeDefined();

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝错误密码', async () => {
      const email = `wrongpass_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      const loginData = {
        email,
        password: 'WrongPassword123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝不存在的邮箱', async () => {
      const loginData = {
        email: 'notexist@example.com',
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('应该拒绝已删除用户登录', async () => {
      const email = `deleted_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      // Delete user
      await prisma.user.update({
        where: { email },
        data: { status: 'deleted' },
      });

      const loginData = {
        email,
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('USER_DELETED');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝已暂停用户登录', async () => {
      const email = `suspended_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      // Suspend user
      await prisma.user.update({
        where: { email },
        data: { status: 'suspended' },
      });

      const loginData = {
        email,
        password: 'SecurePass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(403);

      expect(response.body.error.code).toBe('USER_SUSPENDED');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝缺少必填字段', async () => {
      const loginData = {
        email: 'test@example.com',
        // Missing password
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该更新最后登录时间', async () => {
      const email = `lastlogin_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      const loginData = {
        email,
        password: 'SecurePass123!',
      };

      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      // Verify lastLoginAt is updated
      const user = await prisma.user.findUnique({
        where: { email },
      });

      expect(user?.lastLoginAt).toBeDefined();
      expect(user?.failedLoginAttempts).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('应该成功刷新 Token', async () => {
      const email = `refresh_${Date.now()}@example.com`;

      // Register and login
      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'SecurePass123!',
        });

      const refreshToken = loginRes.body.data.tokens.refresh_token;

      // Refresh token
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.expires_in).toBe(3600);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝过期的 Refresh Token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'expired_token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_INVALID');
    });

    it('应该拒绝无效 Token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝已删除用户的 Token', async () => {
      const email = `deletedrefresh_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
      });

      // Delete user
      await prisma.user.update({
        where: { email },
        data: { status: 'deleted' },
      });

      // Get token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: 'SecurePass123!',
        });

      const refreshToken = loginRes.body.data.tokens.refresh_token;

      // Refresh should fail
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(401);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('应该返回当前用户信息', async () => {
      const email = `me_${Date.now()}@example.com`;

      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const accessToken = registerRes.body.data.tokens.access_token;

      // Get current user
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(email);
      expect(response.body.data.role).toBe('advertiser');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('应该拒绝无效 Token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verification-code', () => {
    it('应该成功发送邮箱验证码', async () => {
      // Mock cache service
      jest.mocked(cacheService.set).mockResolvedValue(true);

      const data = {
        type: 'email' as const,
        target: `verify_${Date.now()}@example.com`,
        purpose: 'register',
      };

      const response = await request(app)
        .post('/api/v1/auth/verification-code')
        .send(data)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('验证码已发送');
    });

    it('应该拒绝无效类型', async () => {
      const data = {
        type: 'invalid',
        target: 'test@example.com',
        purpose: 'register',
      };

      const response = await request(app)
        .post('/api/v1/auth/verification-code')
        .send(data)
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify-code', () => {
    it('应该拒绝错误验证码', async () => {
      // Mock cache service to return nothing (expired)
      jest.mocked(cacheService.get).mockResolvedValue(null);

      const verifyData = {
        type: 'email' as const,
        target: `wrongcode_${Date.now()}@example.com`,
        code: '000000',
        purpose: 'register',
      };

      const response = await request(app)
        .post('/api/v1/auth/verify-code')
        .send(verifyData)
        .expect(400);

      expect(response.body.error.code).toBe('CODE_EXPIRED');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    it('应该成功重置密码', async () => {
      const email = `reset_${Date.now()}@example.com`;

      await request(app).post('/api/v1/auth/register').send({
        email,
        password: 'OldPass123!',
        role: 'advertiser' as const,
      });

      // Mock verification code
      jest.mocked(cacheService.get).mockResolvedValue(
        Buffer.from('123456').toString('base64')
      );
      jest.mocked(cacheService.delete).mockResolvedValue(true);

      const resetData = {
        type: 'email' as const,
        target: email,
        code: '123456',
        new_password: 'NewPass123!',
      };

      const response = await request(app)
        .post('/api/v1/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new password works
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email,
          password: resetData.new_password,
        })
        .expect(200);

      expect(loginRes.body.success).toBe(true);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });
});
