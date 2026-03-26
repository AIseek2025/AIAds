import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/database';

describe('Admin Finance API Tests', () => {
  let adminAccessToken: string;
  let testAdminId: string;
  let testRoleId: string;
  let testWithdrawalId: string;
  let testKolId: string;
  let testUserId: string;

  const setupAdminAuth = async () => {
    const role = await prisma.adminRole.upsert({
      where: { name: 'Test Admin Finance' },
      update: {},
      create: {
        name: 'Test Admin Finance',
        description: 'Test admin role for finance',
        permissions: ['finance:view', 'withdrawal:review', 'withdrawal:approve', 'withdrawal:reject'],
        isSystem: false,
      },
    });
    testRoleId = role.id;

    const email = `admin_finance_${Date.now()}@aiads.com`;
    
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

    const loginRes = await request(app)
      .post('/api/v1/admin/auth/login')
      .send({
        username: email,
        password: 'AdminPass123!',
      });

    adminAccessToken = loginRes.body.data.tokens.access_token;
  };

  const createTestWithdrawal = async (status: string = 'pending') => {
    const userEmail = `kolfinance_${Date.now()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
        nickname: 'Finance KOL',
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
        platformUsername: '@financekol',
        followers: 10000,
        engagementRate: 0.05,
        status: 'active',
        verified: true,
        currency: 'USD',
        totalEarnings: 10000,
        availableBalance: 5000,
        pendingBalance: 0,
      },
    });
    testKolId = kol.id;

    const withdrawal = await prisma.withdrawal.create({
      data: {
        kolId: kol.id,
        withdrawalNo: `WD-${Date.now()}-TEST`,
        amount: 1000,
        fee: 50,
        actualAmount: 950,
        currency: 'USD',
        paymentMethod: 'paypal',
        accountName: 'Test Account',
        accountNumber: '123456789',
        status: status,
      },
    });
    testWithdrawalId = withdrawal.id;
    return withdrawal;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    await setupAdminAuth();
    await createTestWithdrawal('pending');
  });

  afterEach(async () => {
    // Cleanup
    if (testWithdrawalId) {
      await prisma.withdrawal.delete({ where: { id: testWithdrawalId } }).catch(() => {});
    }
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

  describe('GET /api/v1/admin/finance/transactions', () => {
    it('应该返回交易列表', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/transactions')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('应该支持类型筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/transactions?type=recharge')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该支持状态筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/transactions?status=completed')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/transactions')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/finance/withdrawals/pending', () => {
    it('应该返回待审核提现列表', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/withdrawals/pending')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      response.body.data.items.forEach((item: any) => {
        expect(item.status).toBe('pending');
      });
    });

    it('应该支持金额筛选', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/withdrawals/pending?min_amount=500')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('应该拒绝未认证请求', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/withdrawals/pending')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/admin/finance/withdrawals/:id', () => {
    it('应该返回提现详情', async () => {
      const response = await request(app)
        .get(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testWithdrawalId);
      expect(response.body.data.amount).toBe(1000);
    });

    it('应该返回 404 对于不存在的提现', async () => {
      const response = await request(app)
        .get('/api/v1/admin/finance/withdrawals/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/admin/finance/withdrawals/:id/approve', () => {
    it('应该通过提现申请', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          note: '审核通过',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('processing');

      // Verify in database
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: testWithdrawalId },
      });
      expect(withdrawal?.status).toBe('processing');
    });

    it('应该拒绝不存在的提现', async () => {
      const response = await request(app)
        .post('/api/v1/admin/finance/withdrawals/00000000-0000-0000-0000-000000000000/approve')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝状态不正确的提现', async () => {
      // First approve
      await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send();

      // Try to approve again
      const response = await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/approve`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send()
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WITHDRAWAL_INVALID_STATUS');
    });
  });

  describe('POST /api/v1/admin/finance/withdrawals/:id/reject', () => {
    it('应该拒绝提现申请', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          reason: '账户信息不正确',
          note: '请核对后重新提交',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe('账户信息不正确');

      // Verify in database
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: testWithdrawalId },
      });
      expect(withdrawal?.status).toBe('rejected');
    });

    it('应该拒绝缺少拒绝原因', async () => {
      const response = await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({})
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝状态不正确的提现', async () => {
      // First reject
      await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: '原因' });

      // Try to reject again
      const response = await request(app)
        .post(`/api/v1/admin/finance/withdrawals/${testWithdrawalId}/reject`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ reason: '原因' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
