import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/crypto';

describe('Campaigns API Tests', () => {
  let testUser: any;
  let accessToken: string;
  let advertiserId: string;
  let campaignId: string;

  beforeAll(async () => {
    // Create test user and advertiser
    const email = `campaign_test_${Date.now()}@example.com`;
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

    // Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: 'SecurePass123!' });

    accessToken = loginRes.body.data.tokens.access_token;

    // Create advertiser profile
    const advertiserRes = await request(app)
      .post('/api/v1/advertisers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        company_name: '测试公司',
        contact_person: '张三',
      });

    advertiserId = advertiserRes.body.data.id;

    // Add balance for testing
    await prisma.advertiser.update({
      where: { id: advertiserId },
      data: { walletBalance: 100000 },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (advertiserId) {
      await prisma.campaign.deleteMany({
        where: { advertiserId },
      });
      await prisma.advertiser.delete({ where: { id: advertiserId } });
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }
  });

  describe('POST /api/v1/campaigns', () => {
    it('应该成功创建活动', async () => {
      const campaignData = {
        title: '夏季促销活动',
        description: '推广夏季产品',
        budget: 5000,
        target_platforms: ['tiktok'],
        min_followers: 5000,
        max_followers: 50000,
        required_categories: ['fashion'],
        target_countries: ['US'],
        start_date: '2026-04-01',
        end_date: '2026-04-30',
      };

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(campaignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(campaignData.title);
      expect(response.body.data.status).toBe('draft');

      campaignId = response.body.data.id;
    });

    it('应该拒绝预算不足的活动', async () => {
      const campaignData = {
        title: '超预算活动',
        budget: 999999999,
      };

      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(campaignData)
        .expect(400);

      expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .send({ title: '测试', budget: 1000 })
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });

    it('应该拒绝无效数据', async () => {
      const response = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({}) // Empty data
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/campaigns', () => {
    it('应该获取活动列表', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns?status=draft')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.items;
      items.forEach((item: any) => {
        expect(item.status).toBe('draft');
      });
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns?page=1&page_size=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(10);
    });
  });

  describe('GET /api/v1/campaigns/:id', () => {
    it('应该获取活动详情', async () => {
      const response = await request(app)
        .get(`/api/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(campaignId);
    });

    it('应该返回 404 当活动不存在', async () => {
      const response = await request(app)
        .get('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/campaigns/:id', () => {
    it('应该成功更新活动', async () => {
      const updateData = {
        title: '更新后的活动标题',
        description: '更新后的描述',
      };

      const response = await request(app)
        .put(`/api/v1/campaigns/${campaignId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
    });

    it('应该拒绝更新不存在的活动', async () => {
      const response = await request(app)
        .put('/api/v1/campaigns/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '测试' })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('应该删除草稿活动', async () => {
      // Create a new campaign for deletion
      const campaignRes = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          title: '待删除活动',
          budget: 1000,
        });

      const deleteCampaignId = campaignRes.body.data.id;

      const response = await request(app)
        .delete(`/api/v1/campaigns/${deleteCampaignId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/v1/campaigns/:id/submit', () => {
    it('应该提交活动进行审核', async () => {
      const response = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending_review');
    });

    it('应该拒绝重复提交', async () => {
      const response = await request(app)
        .post(`/api/v1/campaigns/${campaignId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });
});
