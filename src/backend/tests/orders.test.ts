import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';
import { hashPassword } from '../src/utils/crypto';

describe('Orders API Tests', () => {
  let advertiserUser: any;
  let kolUser: any;
  let advertiserToken: string;
  let kolToken: string;
  let advertiserId: string;
  let kolId: string;
  let campaignId: string;
  let orderId: string;
  let cpmOrderId: string;

  beforeAll(async () => {
    // Create advertiser user
    const advertiserEmail = `advertiser_order_${Date.now()}@example.com`;
    const passwordHash = await hashPassword('SecurePass123!');

    advertiserUser = await prisma.user.create({
      data: {
        email: advertiserEmail,
        passwordHash,
        role: 'advertiser',
        status: 'active',
        emailVerified: true,
      },
    });

    // Create KOL user
    const kolEmail = `kol_order_${Date.now()}@example.com`;
    kolUser = await prisma.user.create({
      data: {
        email: kolEmail,
        passwordHash,
        role: 'kol',
        status: 'active',
        emailVerified: true,
      },
    });

    // Login advertiser
    const advertiserLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: advertiserEmail, password: 'SecurePass123!' });

    advertiserToken = advertiserLoginRes.body.data.tokens.access_token;

    // Login KOL
    const kolLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: kolEmail, password: 'SecurePass123!' });

    kolToken = kolLoginRes.body.data.tokens.access_token;

    // Create advertiser profile
    const advertiserRes = await request(app)
      .post('/api/v1/advertisers')
      .set('Authorization', `Bearer ${advertiserToken}`)
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

    // Create KOL profile
    const kol = await prisma.kol.create({
      data: {
        userId: kolUser.id,
        platform: 'tiktok',
        platformId: 'test_platform_id',
        platformUsername: '@testkol',
        platformDisplayName: 'Test KOL',
        category: 'fashion',
        country: 'US',
        followers: 25000,
        avgViews: 15000,
        engagementRate: 0.045,
        status: 'active',
        verified: true,
        basePrice: 500,
      },
    });

    kolId = kol.id;

    // Create campaign
    const campaignRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${advertiserToken}`)
      .send({
        title: '测试活动',
        budget: 5000,
        target_platforms: ['tiktok'],
      });

    campaignId = campaignRes.body.data.id;

    // Submit campaign to make it active
    await request(app).post(`/api/v1/campaigns/${campaignId}/submit`).set('Authorization', `Bearer ${advertiserToken}`);

    // Update campaign status to active for order creation
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'active' },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (cpmOrderId) {
      await prisma.order.delete({ where: { id: cpmOrderId } }).catch(() => {});
    }
    if (orderId) {
      await prisma.order.delete({ where: { id: orderId } });
    }
    if (campaignId) {
      await prisma.campaign.delete({ where: { id: campaignId } });
    }
    if (kolId) {
      await prisma.kol.delete({ where: { id: kolId } });
    }
    if (advertiserId) {
      await prisma.advertiser.delete({ where: { id: advertiserId } });
    }
    if (advertiserUser) {
      await prisma.user.delete({ where: { id: advertiserUser.id } });
    }
    if (kolUser) {
      await prisma.user.delete({ where: { id: kolUser.id } });
    }
  });

  describe('POST /api/v1/orders', () => {
    it('应该成功创建订单', async () => {
      const orderData = {
        campaign_id: campaignId,
        kol_id: kolId,
        offered_price: 500,
        requirements: '合作要求说明',
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.price).toBe(orderData.offered_price);
      expect(response.body.data.status).toBe('pending');

      orderId = response.body.data.id;
    });

    it('应能创建 CPM 订单并返回透明化字段', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign_id: campaignId,
          kol_id: kolId,
          pricing_model: 'cpm',
          cpm_rate: 20,
          offered_price: 800,
          requirements: 'CPM 测试',
        })
        .expect(201);

      expect(response.body.data.pricing_model).toBe('cpm');
      expect(response.body.data.cpm_rate).toBe(20);
      expect(response.body.data.cpm_budget_cap).toBe(800);
      expect(response.body.data.price).toBe(0);
      expect(response.body.data.cpm_breakdown).toBeDefined();
      expect(response.body.data.cpm_breakdown.gross_spend).toBe(0);
      cpmOrderId = response.body.data.id;
    });

    it('应拒绝不存在的活动', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign_id: 'non-existent-id',
          kol_id: kolId,
          offered_price: 500,
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝不存在的 KOL', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign_id: campaignId,
          kol_id: 'non-existent-id',
          offered_price: 500,
        })
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .post('/api/v1/orders')
        .send({
          campaign_id: campaignId,
          kol_id: kolId,
          offered_price: 500,
        })
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('GET /api/v1/orders', () => {
    it('应该获取订单列表', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/orders?status=pending')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const items = response.body.data.items;
      items.forEach((item: any) => {
        expect(item.status).toBe('pending');
      });
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/orders?page=1&page_size=10')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(10);
    });
  });

  describe('GET /api/v1/orders/:id/cpm-metrics', () => {
    it('应返回 CPM 口径明细', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${cpmOrderId}/cpm-metrics`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pricing_model).toBe('cpm');
      expect(response.body.data.cpm_rate).toBe(20);
      expect(response.body.data.gross_spend).toBe(0);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    it('应该获取订单详情', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(orderId);
    });
  });

  describe('PUT /api/v1/orders/:id/accept', () => {
    it('应该接受订单', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${kolToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('accepted');
    });

    it('应该拒绝重复接受', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${kolToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_STATUS');
    });

    it('应该拒绝非 KOL 用户接受订单', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/accept`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/v1/orders/:id/reject', () => {
    it('应该拒绝订单', async () => {
      // Create a new order for rejection test
      const orderRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          campaign_id: campaignId,
          kol_id: kolId,
          offered_price: 600,
        });

      const newOrderId = orderRes.body.data.id;

      const response = await request(app)
        .put(`/api/v1/orders/${newOrderId}/reject`)
        .set('Authorization', `Bearer ${kolToken}`)
        .send({ reason: '价格太低' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
    });
  });

  describe('PUT /api/v1/orders/:id/submit', () => {
    it('应该提交作品', async () => {
      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/submit`)
        .set('Authorization', `Bearer ${kolToken}`)
        .send({
          draft_urls: ['https://example.com/draft1.mp4'],
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('submitted');
      expect(response.body.data.draft_urls).toHaveLength(1);
    });
  });

  describe('PUT /api/v1/orders/:id/complete', () => {
    it('应该完成订单', async () => {
      // First approve the submitted work
      await request(app)
        .put(`/api/v1/orders/${orderId}/submit`)
        .set('Authorization', `Bearer ${kolToken}`)
        .send({
          draft_urls: ['https://example.com/draft1.mp4'],
        });

      // Update status to published for completion test
      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'published' },
      });

      const response = await request(app)
        .put(`/api/v1/orders/${orderId}/complete`)
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          rating: 5,
          review: '合作愉快',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });
});
