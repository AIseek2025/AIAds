import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/crypto';

describe('Advertisers API Tests', () => {
  let testUser: any;
  let accessToken: string;
  let advertiserId: string;

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    // Create test user
    const email = `advertiser_test_${Date.now()}@example.com`;
    const passwordHash = await hashPassword('SecurePass123!');

    testUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'advertiser',
        status: 'active',
        emailVerified: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testUser) {
      await prisma.advertiser.deleteMany({
        where: { userId: testUser.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }
  });

  describe('POST /api/v1/advertisers', () => {
    it('应该成功创建广告主资料', async () => {
      // Login to get token
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: testUser.email,
        password: 'SecurePass123!',
      });

      accessToken = loginRes.body.data.tokens.access_token;

      const advertiserData = {
        company_name: '测试科技有限公司',
        contact_person: '张三',
        contact_phone: '13800138000',
        industry: '互联网',
        website: 'https://example.com',
      };

      const response = await request(app)
        .post('/api/v1/advertisers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(advertiserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.company_name).toBe(advertiserData.company_name);
      expect(response.body.data.contact_person).toBe(advertiserData.contact_person);
      expect(response.body.data.verification_status).toBe('pending');

      advertiserId = response.body.data.id;
    });

    it('应该拒绝重复创建广告主', async () => {
      const advertiserData = {
        company_name: '重复公司',
        contact_person: '李四',
      };

      const response = await request(app)
        .post('/api/v1/advertisers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(advertiserData)
        .expect(409);

      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).post('/api/v1/advertisers').send({ company_name: '测试' }).expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('应该拒绝无效数据', async () => {
      // Create another user for testing
      const email = `advertiser_test2_${Date.now()}@example.com`;
      const passwordHash = await hashPassword('SecurePass123!');
      const user2 = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'advertiser',
          status: 'active',
        },
      });

      const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'SecurePass123!' });

      const token2 = loginRes.body.data.tokens.access_token;

      const response = await request(app)
        .post('/api/v1/advertisers')
        .set('Authorization', `Bearer ${token2}`)
        .send({}) // Empty data
        .expect(422);

      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.advertiser.deleteMany({ where: { userId: user2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
    });
  });

  describe('GET /api/v1/advertisers/me', () => {
    it('应该获取当前广告主资料', async () => {
      const response = await request(app)
        .get('/api/v1/advertisers/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(advertiserId);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/advertisers/me').expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('PUT /api/v1/advertisers/me', () => {
    it('应该成功更新广告主资料', async () => {
      const updateData = {
        contact_person: '王五',
        contact_phone: '13900139000',
        industry: '电子商务',
      };

      const response = await request(app)
        .put('/api/v1/advertisers/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.contact_person).toBe(updateData.contact_person);
      expect(response.body.data.industry).toBe(updateData.industry);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).put('/api/v1/advertisers/me').send({ contact_person: '测试' }).expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('POST /api/v1/advertisers/me/recharge', () => {
    it('应该成功提交充值申请', async () => {
      const rechargeData = {
        amount: 10000,
        payment_method: 'alipay' as const,
        payment_proof: 'https://example.com/proof.jpg',
      };

      const response = await request(app)
        .post('/api/v1/advertisers/me/recharge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(rechargeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.amount).toBe(rechargeData.amount);
      expect(response.body.data.payment_method).toBe(rechargeData.payment_method);
    });

    it('应该拒绝无效充值金额', async () => {
      const response = await request(app)
        .post('/api/v1/advertisers/me/recharge')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ amount: -100, payment_method: 'alipay' })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .post('/api/v1/advertisers/me/recharge')
        .send({ amount: 1000, payment_method: 'alipay' })
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/v1/advertisers/me/balance', () => {
    it('应该获取账户余额', async () => {
      const response = await request(app)
        .get('/api/v1/advertisers/me/balance')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('wallet_balance');
      expect(response.body.data).toHaveProperty('frozen_balance');
      expect(response.body.data).toHaveProperty('total_recharged');
      expect(response.body.data).toHaveProperty('low_balance_alert_cny');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/advertisers/me/balance').expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/v1/advertisers/me/transactions', () => {
    it('应该获取交易记录列表', async () => {
      const response = await request(app)
        .get('/api/v1/advertisers/me/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/advertisers/me/transactions?page=1&page_size=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(10);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/advertisers/me/transactions').expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });
});
