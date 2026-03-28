import request from 'supertest';
import app from '../src/app';
import prisma from '../src/config/database';

describe('KOL Module API Tests', () => {
  let kolAccessToken: string;
  let kolUserId: string;
  let kolId: string;

  // Helper function to create a test KOL user
  async function createTestKolUser() {
    const email = `kol_${Date.now()}@example.com`;

    // Register user as KOL
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

    return { email, kolUserId };
  }

  // Helper function to create KOL profile
  async function createKolProfile() {
    const profileData = {
      platform: 'tiktok' as const,
      platform_username: 'test_kol',
      platform_id: 'tiktok_123456',
      bio: '这是一个测试 KOL',
      category: '娱乐',
      country: 'US',
    };

    const response = await request(app)
      .post('/api/v1/kols/profile')
      .set('Authorization', `Bearer ${kolAccessToken}`)
      .send(profileData);

    kolId = response.body.data.id;
    return response;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    await createTestKolUser();
  });

  afterEach(async () => {
    // Cleanup
    if (kolUserId) {
      await prisma.user.delete({ where: { id: kolUserId } }).catch(() => {});
    }
  });

  describe('POST /api/v1/kols/profile', () => {
    it('应该成功创建 KOL 资料', async () => {
      const profileData = {
        platform: 'tiktok' as const,
        platform_username: 'test_kol',
        platform_id: 'tiktok_123456',
        bio: '这是一个测试 KOL',
        category: '娱乐',
        country: 'US',
      };

      const response = await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(profileData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('tiktok');
      expect(response.body.data.platform_username).toBe('test_kol');
      expect(response.body.data.status).toBe('pending');

      // Cleanup
      await prisma.kol.delete({ where: { id: response.body.data.id } });
    });

    it('应该拒绝重复创建 KOL 资料', async () => {
      const profileData = {
        platform: 'tiktok' as const,
        platform_username: 'test_kol',
        platform_id: 'tiktok_123456',
      };

      // First creation
      await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(profileData);

      // Second creation should fail
      const response = await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(profileData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('应该拒绝非 KOL 角色创建', async () => {
      // Create advertiser user
      const advertiserEmail = `advertiser_${Date.now()}@example.com`;
      const advertiserRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: advertiserEmail,
          password: 'SecurePass123!',
          role: 'advertiser' as const,
        });

      const advertiserToken = advertiserRes.body.data.tokens.access_token;

      const response = await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${advertiserToken}`)
        .send({
          platform: 'tiktok',
          platform_username: 'test',
          platform_id: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ROLE');

      // Cleanup
      await prisma.user.delete({ where: { email: advertiserEmail } });
    });

    it('应该拒绝缺少必填字段', async () => {
      const response = await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({
          // Missing platform and platform_username
          platform_id: '123',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝无效的平台类型', async () => {
      const response = await request(app)
        .post('/api/v1/kols/profile')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({
          platform: 'invalid_platform',
          platform_username: 'test',
          platform_id: '123',
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/kols/me', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    it('应该获取当前 KOL 资料', async () => {
      const response = await request(app)
        .get('/api/v1/kols/me')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.platform).toBe('tiktok');
      expect(response.body.data.platform_username).toBe('test_kol');
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app).get('/api/v1/kols/me').expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该返回资料不存在错误', async () => {
      // Create new user without profile
      const newUserRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `newkol_${Date.now()}@example.com`,
          password: 'SecurePass123!',
          role: 'kol' as const,
        });

      const response = await request(app)
        .get('/api/v1/kols/me')
        .set('Authorization', `Bearer ${newUserRes.body.data.tokens.access_token}`)
        .expect(404);

      expect(response.body.success).toBe(false);

      // Cleanup
      await prisma.user.delete({ where: { id: newUserRes.body.data.user.id } });
    });
  });

  describe('PUT /api/v1/kols/me', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    it('应该成功更新 KOL 资料', async () => {
      const updateData = {
        bio: '更新后的简介',
        category: '游戏',
        base_price: 1000,
        tags: ['游戏', '直播'],
      };

      const response = await request(app)
        .put('/api/v1/kols/me')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.bio).toBe('更新后的简介');
      expect(response.body.data.category).toBe('游戏');
    });

    it('应该拒绝缺少必填字段', async () => {
      const response = await request(app)
        .put('/api/v1/kols/me')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({
          base_price: -100, // Invalid negative price
        })
        .expect(422);

      expect(response.body.success).toBe(false);
    });
  });

  describe('KOL Account Binding', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    describe('POST /api/v1/kols/connect/:platform', () => {
      it('应该成功绑定 TikTok 账号', async () => {
        const accountData = {
          platform_username: 'tiktok_user',
          platform_id: 'tiktok_789',
          platform_display_name: 'TikTok 用户',
        };

        const response = await request(app)
          .post('/api/v1/kols/connect/tiktok')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(accountData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.platform).toBe('tiktok');
        expect(response.body.data.platform_username).toBe('tiktok_user');

        // Cleanup
        await prisma.kolAccount.delete({ where: { id: response.body.data.id } });
      });

      it('应该成功绑定 YouTube 账号', async () => {
        const accountData = {
          platform_username: 'youtube_channel',
          platform_id: 'youtube_123',
        };

        const response = await request(app)
          .post('/api/v1/kols/connect/youtube')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(accountData)
          .expect(201);

        expect(response.body.success).toBe(true);

        // Cleanup
        await prisma.kolAccount.delete({ where: { id: response.body.data.id } });
      });

      it('应该拒绝重复绑定同一平台', async () => {
        const accountData = {
          platform_username: 'tiktok_user',
          platform_id: 'tiktok_789',
        };

        // First binding
        await request(app)
          .post('/api/v1/kols/connect/tiktok')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(accountData);

        // Second binding should fail
        const response = await request(app)
          .post('/api/v1/kols/connect/tiktok')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({
            platform_username: 'tiktok_user2',
            platform_id: 'tiktok_790',
          })
          .expect(409);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ACCOUNT_EXISTS');
      });

      it('应该拒绝不支持的平台', async () => {
        const response = await request(app)
          .post('/api/v1/kols/connect/invalid_platform')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({
            platform_username: 'user',
            platform_id: '123',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/kols/accounts', () => {
      it('应该获取已绑定账号列表', async () => {
        // Bind an account first
        await request(app).post('/api/v1/kols/connect/tiktok').set('Authorization', `Bearer ${kolAccessToken}`).send({
          platform_username: 'tiktok_user',
          platform_id: 'tiktok_789',
        });

        const response = await request(app)
          .get('/api/v1/kols/accounts')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBe(1);
      });

      it('应该返回空列表当没有绑定账号', async () => {
        const response = await request(app)
          .get('/api/v1/kols/accounts')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual([]);
      });
    });

    describe('DELETE /api/v1/kols/accounts/:id', () => {
      it('应该成功解绑账号', async () => {
        // Bind an account first
        const bindRes = await request(app)
          .post('/api/v1/kols/connect/tiktok')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({
            platform_username: 'tiktok_user',
            platform_id: 'tiktok_789',
          });

        const accountId = bindRes.body.data.id;

        // Unbind
        const response = await request(app)
          .delete(`/api/v1/kols/accounts/${accountId}`)
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);

        // Verify account is deleted
        const accounts = await prisma.kolAccount.findMany({
          where: { kolId },
        });
        expect(accounts.length).toBe(0);
      });

      it('应该拒绝解绑不存在的账号', async () => {
        const response = await request(app)
          .delete('/api/v1/kols/accounts/nonexistent-id')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('POST /api/v1/kols/sync', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    it('应该成功同步 KOL 数据', async () => {
      const response = await request(app)
        .post('/api/v1/kols/sync')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.synced).toBeDefined();
      expect(response.body.data.failed).toBeDefined();
    });
  });

  describe('Earnings and Withdrawal', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    describe('GET /api/v1/kols/earnings', () => {
      it('应该获取收益汇总', async () => {
        const response = await request(app)
          .get('/api/v1/kols/earnings')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.total_earnings).toBeDefined();
        expect(response.body.data.available_balance).toBeDefined();
      });
    });

    describe('GET /api/v1/kols/balance', () => {
      it('应该获取可用余额', async () => {
        const response = await request(app)
          .get('/api/v1/kols/balance')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.available_balance).toBeDefined();
        expect(response.body.data.orders_frozen_total).toBeDefined();
        expect(typeof response.body.data.orders_frozen_total).toBe('number');
        expect(response.body.data.currency).toBe('USD');
      });
    });

    describe('POST /api/v1/kols/withdraw', () => {
      it('应该拒绝余额不足的提现', async () => {
        const withdrawData = {
          amount: 10000, // Large amount
          payment_method: 'alipay' as const,
          account_name: '测试用户',
          account_number: '123456789',
        };

        const response = await request(app)
          .post('/api/v1/kols/withdraw')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(withdrawData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INSUFFICIENT_BALANCE');
      });

      it('应该拒绝低于最低金额的提现', async () => {
        const withdrawData = {
          amount: 5, // Below minimum 10
          payment_method: 'alipay' as const,
          account_name: '测试用户',
          account_number: '123456789',
        };

        const response = await request(app)
          .post('/api/v1/kols/withdraw')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send(withdrawData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('BELOW_MINIMUM');
      });

      it('应该拒绝缺少必填字段的提现', async () => {
        const response = await request(app)
          .post('/api/v1/kols/withdraw')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .send({
            amount: 100,
            // Missing payment_method and account info
          })
          .expect(422);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/v1/kols/withdrawals', () => {
      it('应该获取提现记录列表', async () => {
        const response = await request(app)
          .get('/api/v1/kols/withdrawals')
          .set('Authorization', `Bearer ${kolAccessToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items).toBeDefined();
        expect(response.body.data.pagination).toBeDefined();
      });
    });
  });

  describe('GET /api/v1/kols 发现', () => {
    beforeEach(async () => {
      await createKolProfile();
    });

    it('列表应返回分页结构', async () => {
      const res = await request(app)
        .get('/api/v1/kols?page=1&page_size=5')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.total_pages).toBeDefined();
    });

    it('关键词搜索应成功', async () => {
      const res = await request(app)
        .get('/api/v1/kols?keyword=test')
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);
      expect(res.body.success).toBe(true);
    });

    it('详情应返回公开摘要', async () => {
      const res = await request(app)
        .get(`/api/v1/kols/${kolId}`)
        .set('Authorization', `Bearer ${kolAccessToken}`)
        .expect(200);
      expect(res.body.data.id).toBe(kolId);
    });
  });
});
