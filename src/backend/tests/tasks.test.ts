import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

describe('Tasks Module API Tests', () => {
  let kolAccessToken: string;
  let kolUserId: string;
  let kolId: string;
  let advertiserAccessToken: string;
  let advertiserId: string;
  let campaignId: string;

  // Helper function to create a test KOL user
  async function createTestKolUser() {
    const email = `kol_${Date.now()}@example.com`;

    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'SecurePass123!',
        role: 'kol' as const,
        nickname: '测试 KOL',
      });

    kolUserId = registerRes.body.data.user.id;
    kolAccessToken = registerRes.body.data.tokens.access_token;

    // Create KOL profile
    const profileRes = await request(app)
      .post('/api/v1/kols/profile')
      .set('Authorization', `Bearer ${kolAccessToken}`)
      .send({
        platform: 'tiktok' as const,
        platform_username: 'test_kol',
        platform_id: 'tiktok_123456',
        bio: '这是一个测试 KOL',
        category: '娱乐',
        country: 'US',
        followers: 10000,
        engagementRate: 5.0,
      });

    kolId = profileRes.body.data.id;

    return { email };
  }

  // Helper function to create a test advertiser and campaign
  async function createTestCampaign() {
    const email = `advertiser_${Date.now()}@example.com`;

    // Register advertiser
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'SecurePass123!',
        role: 'advertiser' as const,
        nickname: '测试广告主',
      });

    advertiserAccessToken = registerRes.body.data.tokens.access_token;

    // Create advertiser profile
    await request(app).post('/api/v1/advertisers').set('Authorization', `Bearer ${advertiserAccessToken}`).send({
      company_name: '测试公司',
      contact_person: '联系人',
      contact_email: 'contact@example.com',
    });

    // Get advertiser info to get ID
    const advertiserRes = await request(app)
      .get('/api/v1/advertisers/me')
      .set('Authorization', `Bearer ${advertiserAccessToken}`);

    advertiserId = advertiserRes.body.data.id;

    // Create campaign
    const campaignRes = await request(app)
      .post('/api/v1/campaigns')
      .set('Authorization', `Bearer ${advertiserAccessToken}`)
      .send({
        title: '测试活动',
        description: '这是一个测试活动',
        objective: 'awareness' as const,
        budget: 10000,
        budget_type: 'fixed' as const,
        target_platforms: ['tiktok'],
        min_followers: 1000,
        content_requirements: '创建一个有趣的视频',
        required_hashtags: ['#test', '#campaign'],
        start_date: new Date().toISOString().split('T')[0],
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    campaignId = campaignRes.body.data.id;

    // Activate campaign
    await request(app)
      .put(`/api/v1/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${advertiserAccessToken}`)
      .send({
        status: 'active',
      });

    return { email };
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await createTestKolUser();
    await createTestCampaign();
  });

  afterEach(async () => {
    // Cleanup
    if (kolUserId) {
      await prisma.kol.delete({ where: { id: kolId } }).catch(() => {});
      await prisma.user.delete({ where: { id: kolUserId } }).catch(() => {});
    }
    if (advertiserId) {
      await prisma.campaign.delete({ where: { id: campaignId } }).catch(() => {});
      await prisma.advertiser.delete({ where: { id: advertiserId } }).catch(() => {});
      // Find and delete advertiser user
      const advertiser = await prisma.advertiser.findUnique({
        where: { id: advertiserId },
        include: { user: true },
      });
      if (advertiser?.user) {
        await prisma.user.delete({ where: { id: advertiser.user.id } }).catch(() => {});
      }
    }
  });

  describe('GET /api/v1/tasks', () => {
    it('应该获取可接任务列表', async () => {
      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
    });

    it('应该支持分页参数', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?page=1&page_size=10')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.page_size).toBe(10);
    });

    it('应该支持平台过滤', async () => {
      const response = await request(app)
        .get('/api/v1/tasks?platform=tiktok')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/tasks').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝没有 KOL 资料的用户', async () => {
      // Create new user without KOL profile
      const newUserRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `newuser_${Date.now()}@example.com`,
          password: 'SecurePass123!',
          role: 'kol' as const,
        });

      const response = await request(app)
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${newUserRes.body.data.tokens.access_token}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: newUserRes.body.data.user.id } });
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('应该获取任务详情', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${campaignId}`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(campaignId);
      expect(response.body.data.title).toBe('测试活动');
    });

    it('应该拒绝获取不存在的任务', async () => {
      const response = await request(app)
        .get('/api/v1/tasks/nonexistent-id')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/tasks/:id/apply', () => {
    it('应该成功申请任务', async () => {
      const applyData = {
        message: '我很感兴趣，希望能合作',
        expected_price: 5000,
      };

      const response = await request(app)
        .post(`/api/v1/tasks/${campaignId}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(applyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order_no).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.kol_earning).toBe(4500); // 5000 - 10% fee

      // Cleanup
      await prisma.order.delete({ where: { id: response.body.data.id } });
    });

    it('应该拒绝重复申请同一任务', async () => {
      const applyData = {
        message: '我很感兴趣',
        expected_price: 5000,
      };

      // First application
      await request(app)
        .post(`/api/v1/tasks/${campaignId}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(applyData);

      // Second application should fail
      const response = await request(app)
        .post(`/api/v1/tasks/${campaignId}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(applyData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ALREADY_APPLIED');
    });

    it('应该拒绝申请状态不正确的任务', async () => {
      // Create a draft campaign
      const draftCampaignRes = await request(app)
        .post('/api/v1/campaigns')
        .set('Authorization', `Bearer ${advertiserAccessToken}`)
        .send({
          title: '草稿活动',
          budget: 5000,
          target_platforms: ['tiktok'],
        });

      const response = await request(app)
        .post(`/api/v1/tasks/${draftCampaignRes.body.data.id}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({ message: '申请' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TASK_STATUS');

      // Cleanup
      await prisma.campaign.delete({ where: { id: draftCampaignRes.body.data.id } });
    });

    it('应该拒绝缺少必填字段的申请', async () => {
      const response = await request(app)
        .post(`/api/v1/tasks/${campaignId}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({
          expected_price: -100, // Invalid negative price
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('KOL Orders', () => {
    let orderId: string;

    beforeEach(async () => {
      // Create an order by applying for a task
      const applyRes = await request(app)
        .post(`/api/v1/tasks/${campaignId}/apply`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({
          message: '申请',
          expected_price: 5000,
        });

      orderId = applyRes.body.data.id;
    });

    afterEach(async () => {
      if (orderId) {
        await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
      }
    });

    describe('GET /api/v1/kols/orders', () => {
      it('应该获取订单列表', async () => {
        const response = await request(app)
          .get('/api/v1/kols/orders')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toBeDefined();
        expect(Array.isArray(response.body.data.items)).toBe(true);
      });

      it('应该支持状态过滤', async () => {
        const response = await request(app)
          .get('/api/v1/kols/orders?status=pending')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('GET /api/v1/kols/orders/:id', () => {
      it('应该获取订单详情', async () => {
        const response = await request(app)
          .get(`/api/v1/kols/orders/${orderId}`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe(orderId);
      });
    });

    describe('PUT /api/v1/kols/orders/:id/accept', () => {
      it('应该成功接受订单', async () => {
        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('accepted');
        expect(response.body.data.accepted_at).toBeDefined();
      });

      it('应该拒绝接受非待确认订单', async () => {
        // First accept
        await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`);

        // Second accept should fail
        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_STATUS');
      });
    });

    describe('PUT /api/v1/kols/orders/:id/reject', () => {
      it('应该成功拒绝订单', async () => {
        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/reject`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({ reason: '价格不合适' })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('rejected');
        expect(response.body.data.review_notes).toBe('价格不合适');
      });

      it('应该拒绝拒绝非待确认订单', async () => {
        // First accept
        await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`);

        // Then reject should fail
        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/reject`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({ reason: '改变主意了' })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/kols/orders/:id/submit', () => {
      beforeEach(async () => {
        // Accept order first
        await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`);
      });

      it('应该成功提交作品', async () => {
        const submitData = {
          draft_urls: ['https://example.com/draft1', 'https://example.com/draft2'],
          message: '作品已完成，请审核',
        };

        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/submit`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(submitData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('submitted');
        expect(response.body.data.submitted_at).toBeDefined();
        expect(response.body.data.draft_urls).toHaveLength(2);
      });

      it('应该拒绝缺少作品链接的提交', async () => {
        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/submit`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({
            draft_urls: [], // Empty array
          })
          .expect(422);

        expect(response.body.success).toBe(false);
      });

      it('应该拒绝提交未接受的订单', async () => {
        // Create a new order
        const applyRes = await request(app)
          .post(`/api/v1/tasks/${campaignId}/apply`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({ expected_price: 5000 });

        const newOrderId = applyRes.body.data.id;

        const response = await request(app)
          .put(`/api/v1/kols/orders/${newOrderId}/submit`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({ draft_urls: ['https://example.com/draft'] })
          .expect(400);

        expect(response.body.success).toBe(false);

        // Cleanup
        await prisma.order.delete({ where: { id: newOrderId } });
      });
    });

    describe('PUT /api/v1/kols/orders/:id/revise', () => {
      beforeEach(async () => {
        // Accept and submit order first
        await request(app)
          .put(`/api/v1/kols/orders/${orderId}/accept`)
          .set('Authorization', `Bearer ${kolAccessToken}`);

        await request(app)
          .put(`/api/v1/kols/orders/${orderId}/submit`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({ draft_urls: ['https://example.com/draft1'] });
      });

      it('应该成功修改作品', async () => {
        const reviseData = {
          draft_urls: ['https://example.com/revised1', 'https://example.com/revised2'],
          message: '根据反馈修改了内容',
        };

        const response = await request(app)
          .put(`/api/v1/kols/orders/${orderId}/revise`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(reviseData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe('submitted');
        expect(response.body.data.draft_urls).toHaveLength(2);
      });
    });
  });
});
