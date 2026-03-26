import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';


describe('Users API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/users/:id', () => {
    it('应该返回用户详情', async () => {
      const email = `userdetail_${Date.now()}@example.com`;
      
      // Register user
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userId = registerRes.body.data.user.id;
      const accessToken = registerRes.body.data.tokens.access_token;

      // Get user details
      const response = await request(app)
        .get(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe(email);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝访问其他用户数据', async () => {
      const emailA = `usera_${Date.now()}@example.com`;
      const emailB = `userb_${Date.now()}@example.com`;

      // Register user A
      const resA = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailA,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      // Register user B
      const resB = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailB,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userIdB = resB.body.data.user.id;
      const accessTokenA = resA.body.data.tokens.access_token;

      // User A tries to access user B's data
      const response = await request(app)
        .get(`/api/v1/users/${userIdB}`)
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/users/some-id')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('应该返回 404 当用户不存在', async () => {
      const email = `finduser_${Date.now()}@example.com`;
      
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const accessToken = registerRes.body.data.tokens.access_token;

      const response = await request(app)
        .get('/api/v1/users/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('应该成功更新用户信息', async () => {
      const email = `updateuser_${Date.now()}@example.com`;
      
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userId = registerRes.body.data.user.id;
      const accessToken = registerRes.body.data.tokens.access_token;

      const updateData = {
        nickname: '新昵称',
        language: 'en-US',
        timezone: 'America/New_York',
      };

      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.nickname).toBe(updateData.nickname);
      expect(response.body.data.language).toBe(updateData.language);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });

    it('应该拒绝更新其他用户', async () => {
      const emailA = `updatera_${Date.now()}@example.com`;
      const emailB = `updaterb_${Date.now()}@example.com`;

      // Register user A
      const resA = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailA,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      // Register user B
      const resB = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailB,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userIdB = resB.body.data.user.id;
      const accessTokenA = resA.body.data.tokens.access_token;

      // User A tries to update user B
      const response = await request(app)
        .put(`/api/v1/users/${userIdB}`)
        .set('Authorization', `Bearer ${accessTokenA}`)
        .send({ nickname: '非法更新' })
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    });

    it('应该拒绝无效字段', async () => {
      const email = `invalidupdate_${Date.now()}@example.com`;
      
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userId = registerRes.body.data.user.id;
      const accessToken = registerRes.body.data.tokens.access_token;

      const response = await request(app)
        .put(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'cannot-change@email.com' }) // email cannot be changed
        .expect(422);

      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { email } });
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('应该软删除用户', async () => {
      const email = `deleteuser_${Date.now()}@example.com`;
      
      const registerRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userId = registerRes.body.data.user.id;
      const accessToken = registerRes.body.data.tokens.access_token;

      const response = await request(app)
        .delete(`/api/v1/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user status is deleted
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      expect(user?.status).toBe('deleted');

      // Cleanup
      await prisma.user.delete({ where: { id: userId } });
    });

    it('应该拒绝删除其他用户', async () => {
      const emailA = `deletea_${Date.now()}@example.com`;
      const emailB = `deleteb_${Date.now()}@example.com`;

      // Register user A
      const resA = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailA,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      // Register user B
      const resB = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: emailB,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const userIdB = resB.body.data.user.id;
      const accessTokenA = resA.body.data.tokens.access_token;

      // User A tries to delete user B
      const response = await request(app)
        .delete(`/api/v1/users/${userIdB}`)
        .set('Authorization', `Bearer ${accessTokenA}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');

      // Cleanup
      await prisma.user.deleteMany({
        where: { email: { in: [emailA, emailB] } },
      });
    });

    it('应该拒绝未认证删除请求', async () => {
      const response = await request(app)
        .delete('/api/v1/users/some-id')
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });
});
