# AIAds 测试用例文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds QA 团队
**保密级别**: 内部机密

---

## 1. 文档概述

### 1.1 目的

本文档详细描述了 AIAds 平台的所有测试用例，包括测试步骤、预期结果和优先级。

### 1.2 测试用例编号规则

```
格式：[模块]-[类型]-[序号]
示例：
- AUTH-UNIT-001: 认证模块 - 单元测试 -001
- AUTH-INT-001: 认证模块 - 集成测试 -001
- AUTH-E2E-001: 认证模块-E2E 测试 -001
```

---

## 2. 后端测试用例

### 2.1 认证模块 (Auth)

**测试文件**: `/src/backend/tests/auth.test.ts`

#### 2.1.1 用户注册测试

```typescript
describe('POST /api/v1/auth/register', () => {
  
  // AUTH-INT-001
  it('应该成功注册新用户', async () => {
    const registerData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      phone: '+8613800138000',
      role: 'advertiser',
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
  });

  // AUTH-INT-002
  it('应该拒绝重复邮箱注册', async () => {
    const registerData = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };

    // 先注册一次
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 再次注册相同邮箱
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(409);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('EMAIL_EXISTS');
  });

  // AUTH-INT-003
  it('应该拒绝弱密码', async () => {
    const registerData = {
      email: 'weakpass@example.com',
      password: '123', // 密码太短
      role: 'advertiser',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  // AUTH-INT-004
  it('应该拒绝无效邮箱格式', async () => {
    const registerData = {
      email: 'invalid-email', // 无效邮箱
      password: 'SecurePass123!',
      role: 'advertiser',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(422);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  // AUTH-INT-005
  it('应该拒绝无效角色', async () => {
    const registerData = {
      email: 'invalidrole@example.com',
      password: 'SecurePass123!',
      role: 'invalid_role', // 无效角色
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  // AUTH-INT-006
  it('应该拒绝缺少必填字段', async () => {
    const registerData = {
      email: 'test@example.com',
      // 缺少 password
      role: 'advertiser',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  // AUTH-INT-007
  it('应该默认创建 advertiser 角色', async () => {
    const registerData = {
      email: 'norole@example.com',
      password: 'SecurePass123!',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(201);

    expect(response.body.data.user.role).toBe('advertiser');
  });

  // AUTH-INT-008
  it('应该创建 pending 状态的用户', async () => {
    const registerData = {
      email: 'pending@example.com',
      password: 'SecurePass123!',
      role: 'kol',
    };

    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData)
      .expect(201);

    expect(response.body.data.user.status).toBe('pending');
  });
});
```

#### 2.1.2 用户登录测试

```typescript
describe('POST /api/v1/auth/login', () => {
  
  // AUTH-INT-009
  it('应该成功登录并返回 Token', async () => {
    // 先注册用户
    const registerData = {
      email: 'login@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 登录
    const loginData = {
      email: registerData.email,
      password: registerData.password,
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
  });

  // AUTH-INT-010
  it('应该拒绝错误密码', async () => {
    const registerData = {
      email: 'wrongpass@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    const loginData = {
      email: registerData.email,
      password: 'WrongPassword123!', // 错误密码
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // AUTH-INT-011
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

  // AUTH-INT-012
  it('应该限制登录失败次数', async () => {
    const registerData = {
      email: 'ratelimit@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    const loginData = {
      email: registerData.email,
      password: 'WrongPassword!',
    };

    // 连续失败 10 次
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);
    }

    // 第 11 次应该被限流
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(429);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  // AUTH-INT-013
  it('应该拒绝已删除用户登录', async () => {
    const registerData = {
      email: 'deleted@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 模拟删除用户
    await prisma.user.update({
      where: { email: registerData.email },
      data: { status: 'deleted' },
    });

    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(401);

    expect(response.body.error.code).toBe('USER_DELETED');
  });

  // AUTH-INT-014
  it('应该拒绝已暂停用户登录', async () => {
    const registerData = {
      email: 'suspended@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 模拟暂停用户
    await prisma.user.update({
      where: { email: registerData.email },
      data: { status: 'suspended' },
    });

    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(403);

    expect(response.body.error.code).toBe('USER_SUSPENDED');
  });

  // AUTH-INT-015
  it('应该拒绝缺少必填字段', async () => {
    const loginData = {
      email: 'test@example.com',
      // 缺少 password
    };

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(422);

    expect(response.body.success).toBe(false);
  });

  // AUTH-INT-016
  it('应该更新最后登录时间', async () => {
    const registerData = {
      email: 'lastlogin@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };

    await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(200);

    // 验证 lastLoginAt 已更新
    const user = await prisma.user.findUnique({
      where: { email: registerData.email },
    });

    expect(user?.lastLoginAt).toBeDefined();
    expect(user?.failedLoginAttempts).toBe(0);
  });
});
```

#### 2.1.3 Token 刷新测试

```typescript
describe('POST /api/v1/auth/refresh', () => {
  
  // AUTH-INT-017
  it('应该成功刷新 Token', async () => {
    // 注册并登录
    const registerData = {
      email: 'refresh@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData);

    const refreshToken = loginRes.body.data.tokens.refresh_token;

    // 刷新 Token
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.access_token).toBeDefined();
    expect(response.body.data.refresh_token).toBeDefined();
    expect(response.body.data.expires_in).toBe(3600);
  });

  // AUTH-INT-018
  it('应该拒绝过期的 Refresh Token', async () => {
    const expiredToken = 'expired_token';

    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: expiredToken })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });

  // AUTH-INT-019
  it('应该拒绝无效 Token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'invalid' })
      .expect(401);

    expect(response.body.success).toBe(false);
  });

  // AUTH-INT-020
  it('应该拒绝已删除用户的 Token', async () => {
    // 注册用户
    const registerData = {
      email: 'deletedrefresh@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 删除用户
    await prisma.user.update({
      where: { email: registerData.email },
      data: { status: 'deleted' },
    });

    // 获取 Token
    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData);

    const refreshToken = loginRes.body.data.tokens.refresh_token;

    // 刷新应该失败
    const response = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: refreshToken })
      .expect(401);

    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });
});
```

#### 2.1.4 获取当前用户测试

```typescript
describe('GET /api/v1/auth/me', () => {
  
  // AUTH-INT-021
  it('应该返回当前用户信息', async () => {
    // 注册并登录
    const registerData = {
      email: 'me@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    const loginData = {
      email: registerData.email,
      password: registerData.password,
    };
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData);

    const accessToken = loginRes.body.data.tokens.access_token;

    // 获取当前用户
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe(registerData.email);
    expect(response.body.data.role).toBe(registerData.role);
  });

  // AUTH-INT-022
  it('应该拒绝未认证请求', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  // AUTH-INT-023
  it('应该拒绝无效 Token', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid_token')
      .expect(401);

    expect(response.body.success).toBe(false);
  });
});
```

#### 2.1.5 验证码测试

```typescript
describe('POST /api/v1/auth/verification-code', () => {
  
  // AUTH-INT-024
  it('应该成功发送邮箱验证码', async () => {
    const data = {
      type: 'email' as const,
      target: 'verify@example.com',
      purpose: 'register',
    };

    const response = await request(app)
      .post('/api/v1/auth/verification-code')
      .send(data)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('验证码已发送');
  });

  // AUTH-INT-025
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

  // AUTH-INT-026
  it('应该限制发送频率', async () => {
    const data = {
      type: 'email' as const,
      target: 'ratelimit@example.com',
      purpose: 'register',
    };

    // 连续发送 5 次
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/auth/verification-code')
        .send(data);
    }

    // 第 6 次应该被限流
    const response = await request(app)
      .post('/api/v1/auth/verification-code')
      .send(data)
      .expect(429);

    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('POST /api/v1/auth/verify-code', () => {
  
  // AUTH-INT-027
  it('应该成功验证验证码', async () => {
    // 先发送验证码
    const data = {
      type: 'email' as const,
      target: 'verifycode@example.com',
      purpose: 'register',
    };
    await request(app)
      .post('/api/v1/auth/verification-code')
      .send(data);

    // 使用正确的验证码（开发环境会打印在日志中）
    const verifyData = {
      type: 'email' as const,
      target: data.target,
      code: '123456', // 测试环境固定验证码
      purpose: 'register',
    };

    const response = await request(app)
      .post('/api/v1/auth/verify-code')
      .send(verifyData)
      .expect(200);

    expect(response.body.success).toBe(true);
  });

  // AUTH-INT-028
  it('应该拒绝错误验证码', async () => {
    const verifyData = {
      type: 'email' as const,
      target: 'wrongcode@example.com',
      code: '000000',
      purpose: 'register',
    };

    const response = await request(app)
      .post('/api/v1/auth/verify-code')
      .send(verifyData)
      .expect(400);

    expect(response.body.error.code).toBe('CODE_EXPIRED');
  });

  // AUTH-INT-029
  it('应该拒绝过期验证码', async () => {
    const verifyData = {
      type: 'email' as const,
      target: 'expired@example.com',
      code: '123456',
      purpose: 'register',
    };

    const response = await request(app)
      .post('/api/v1/auth/verify-code')
      .send(verifyData)
      .expect(400);

    expect(response.body.error.code).toBe('CODE_EXPIRED');
  });
});
```

#### 2.1.6 密码重置测试

```typescript
describe('POST /api/v1/auth/reset-password', () => {
  
  // AUTH-INT-030
  it('应该成功重置密码', async () => {
    // 注册用户
    const registerData = {
      email: 'reset@example.com',
      password: 'OldPass123!',
      role: 'advertiser',
    };
    await request(app).post('/api/v1/auth/register').send(registerData);

    // 重置密码
    const resetData = {
      type: 'email' as const,
      target: registerData.email,
      code: '123456',
      new_password: 'NewPass123!',
    };

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send(resetData)
      .expect(200);

    expect(response.body.success).toBe(true);

    // 验证新密码可以登录
    const loginData = {
      email: registerData.email,
      password: resetData.new_password,
    };
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send(loginData)
      .expect(200);

    expect(loginRes.body.success).toBe(true);
  });
});
```

### 2.2 用户管理模块 (Users)

**测试文件**: `/src/backend/tests/users.test.ts`

#### 2.2.1 获取用户详情测试

```typescript
describe('GET /api/v1/users/:id', () => {
  
  // USERS-INT-001
  it('应该返回用户详情', async () => {
    // 注册用户
    const registerData = {
      email: 'userdetail@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData);

    const userId = registerRes.body.data.user.id;
    const accessToken = registerRes.body.data.tokens.access_token;

    // 获取用户详情
    const response = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe(userId);
    expect(response.body.data.email).toBe(registerData.email);
  });

  // USERS-INT-002
  it('应该拒绝访问其他用户数据', async () => {
    // 注册用户 A
    const userA = {
      email: 'usera@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send(userA);

    // 注册用户 B
    const userB = {
      email: 'userb@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send(userB);

    // 用户 A 尝试访问用户 B 的数据
    const response = await request(app)
      .get(`/api/v1/users/${resB.body.data.user.id}`)
      .set('Authorization', `Bearer ${resA.body.data.tokens.access_token}`)
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  // USERS-INT-003
  it('应该拒绝未认证请求', async () => {
    const response = await request(app)
      .get('/api/v1/users/some-id')
      .expect(401);

    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  // USERS-INT-004
  it('应该返回 404 当用户不存在', async () => {
    const registerData = {
      email: 'finduser@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData);

    const accessToken = registerRes.body.data.tokens.access_token;

    const response = await request(app)
      .get('/api/v1/users/non-existent-id')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
```

#### 2.2.2 更新用户信息测试

```typescript
describe('PUT /api/v1/users/:id', () => {
  
  // USERS-INT-005
  it('应该成功更新用户信息', async () => {
    const registerData = {
      email: 'updateuser@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData);

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
  });

  // USERS-INT-006
  it('应该拒绝更新其他用户', async () => {
    // 注册用户 A
    const userA = {
      email: 'updatera@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send(userA);

    // 注册用户 B
    const userB = {
      email: 'updaterb@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send(userB);

    // 用户 A 尝试更新用户 B
    const response = await request(app)
      .put(`/api/v1/users/${resB.body.data.user.id}`)
      .set('Authorization', `Bearer ${resA.body.data.tokens.access_token}`)
      .send({ nickname: '非法更新' })
      .expect(403);

    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  // USERS-INT-007
  it('应该拒绝无效字段', async () => {
    const registerData = {
      email: 'invalidupdate@example.com',
      password: 'SecurePass123!',
      role: 'advertiser',
    };
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerData);

    const userId = registerRes.body.data.user.id;
    const accessToken = registerRes.body.data.tokens.access_token;

    const response = await request(app)
      .put(`/api/v1/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'cannot-change@email.com' }) // email 不可修改
      .expect(422);

    expect(response.body.success).toBe(false);
  });
});
```

---

## 3. 前端测试用例

### 3.1 通用组件测试

**测试文件**: `/src/frontend/src/components/common/__tests__/Button.test.tsx`

#### 3.1.1 Button 组件测试

```typescript
describe('Button', () => {
  
  // BTN-UNIT-001
  it('应该渲染按钮', () => {
    render(<Button>点击</Button>);
    
    const button = screen.getByRole('button', { name: '点击' });
    expect(button).toBeInTheDocument();
  });

  // BTN-UNIT-002
  it('应该处理点击事件', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击</Button>);
    
    const button = screen.getByRole('button', { name: '点击' });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // BTN-UNIT-003
  it('应该显示加载状态', () => {
    render(<Button loading>加载中</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('加载中...');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // BTN-UNIT-004
  it('应该禁用按钮当 loading 为 true', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>点击</Button>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  // BTN-UNIT-005
  it('应该支持不同尺寸', () => {
    const { container: small } = render(<Button size="small">小</Button>);
    const { container: medium } = render(<Button size="medium">中</Button>);
    const { container: large } = render(<Button size="large">大</Button>);
    
    expect(small.querySelector('.MuiButton-sizeSmall')).toBeInTheDocument();
    expect(medium.querySelector('.MuiButton-sizeMedium')).toBeInTheDocument();
    expect(large.querySelector('.MuiButton-sizeLarge')).toBeInTheDocument();
  });

  // BTN-UNIT-006
  it('应该支持不同颜色变体', () => {
    const { container: primary } = render(<Button color="primary">主色</Button>);
    const { container: secondary } = render(<Button color="secondary">次要</Button>);
    const { container: error } = render(<Button color="error">错误</Button>);
    
    expect(primary.querySelector('.MuiButton-colorPrimary')).toBeInTheDocument();
    expect(secondary.querySelector('.MuiButton-colorSecondary')).toBeInTheDocument();
    expect(error.querySelector('.MuiButton-colorError')).toBeInTheDocument();
  });
});
```

### 3.2 认证页面测试

**测试文件**: `/src/frontend/src/pages/auth/__tests__/LoginPage.test.tsx`

#### 3.2.1 登录页面测试

```typescript
describe('LoginPage', () => {
  
  // LOGIN-UNIT-001
  it('应该渲染登录表单', () => {
    render(<LoginPage />);
    
    expect(screen.getByLabelText(/邮箱/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/密码/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
    expect(screen.getByText(/记住我/i)).toBeInTheDocument();
    expect(screen.getByText(/忘记密码/i)).toBeInTheDocument();
  });

  // LOGIN-UNIT-002
  it('应该显示表单验证错误', async () => {
    render(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /登录/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/请输入邮箱地址/i)).toBeInTheDocument();
    expect(await screen.findByText(/请输入密码/i)).toBeInTheDocument();
  });

  // LOGIN-UNIT-003
  it('应该验证邮箱格式', async () => {
    render(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/邮箱/i);
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    
    const submitButton = screen.getByRole('button', { name: /登录/i });
    fireEvent.click(submitButton);
    
    expect(await screen.findByText(/邮箱格式不正确/i)).toBeInTheDocument();
  });

  // LOGIN-UNIT-004
  it('应该成功提交登录表单', async () => {
    const mockLogin = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com', role: 'advertiser' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
    });
    
    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    expect(await screen.findByText(/登录成功/i)).toBeInTheDocument();
  });

  // LOGIN-UNIT-005
  it('应该显示登录错误信息', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new Error('邮箱或密码错误'));
    
    render(<LoginPage />);
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'wrongpassword' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /登录/i }));
    
    expect(await screen.findByText(/邮箱或密码错误/i)).toBeInTheDocument();
  });

  // LOGIN-UNIT-006
  it('应该记住我功能', () => {
    render(<LoginPage />);
    
    const rememberCheckbox = screen.getByLabelText(/记住我/i);
    expect(rememberCheckbox).not.toBeChecked();
    
    fireEvent.click(rememberCheckbox);
    expect(rememberCheckbox).toBeChecked();
  });

  // LOGIN-UNIT-007
  it('应该显示/隐藏密码', () => {
    render(<LoginPage />);
    
    const passwordInput = screen.getByLabelText(/密码/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const visibilityButton = screen.getByRole('button', { name: /visibility/i });
    fireEvent.click(visibilityButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  // LOGIN-UNIT-008
  it('应该跳转到注册页面', () => {
    render(<LoginPage />);
    
    const registerLink = screen.getByText(/立即注册/i);
    expect(registerLink).toHaveAttribute('href', '/register');
  });
});
```

**测试文件**: `/src/frontend/src/pages/auth/__tests__/RegisterPage.test.tsx`

#### 3.2.2 注册页面测试

```typescript
describe('RegisterPage', () => {
  
  // REG-UNIT-001
  it('应该渲染注册表单', () => {
    render(<RegisterPage />);
    
    expect(screen.getByText(/选择您的角色/i)).toBeInTheDocument();
    expect(screen.getByText(/广告主/i)).toBeInTheDocument();
    expect(screen.getByText(/KOL/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /下一步/i })).toBeInTheDocument();
  });

  // REG-UNIT-002
  it('应该验证密码强度', async () => {
    render(<RegisterPage />);
    
    // 选择角色
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 输入弱密码
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: '123' },
    });
    
    expect(await screen.findByText(/密码强度/i)).toBeInTheDocument();
    expect(screen.getByText(/弱/i)).toBeInTheDocument();
  });

  // REG-UNIT-003
  it('应该验证邮箱格式', async () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'invalid' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(await screen.findByText(/邮箱格式不正确/i)).toBeInTheDocument();
  });

  // REG-UNIT-004
  it('应该验证服务条款同意', async () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 填写信息但不同意条款
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(await screen.findByText(/请同意服务条款/i)).toBeInTheDocument();
  });

  // REG-UNIT-005
  it('应该成功提交注册表单', async () => {
    const mockRegister = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com', role: 'advertiser' },
      tokens: { accessToken: 'token', refreshToken: 'refresh' },
    });
    
    render(<RegisterPage />);
    
    // 步骤 1: 选择角色
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 步骤 2: 填写信息
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 步骤 3: 验证邮箱
    fireEvent.change(screen.getByLabelText(/验证码/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /完成注册/i }));
    
    expect(await screen.findByText(/注册成功/i)).toBeInTheDocument();
  });

  // REG-UNIT-006
  it('应该发送验证码', async () => {
    const mockSendCode = vi.fn().mockResolvedValue({});
    
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    fireEvent.click(screen.getByRole('button', { name: /重新发送/i }));
    
    expect(await screen.findByText(/验证码已发送/i)).toBeInTheDocument();
  });

  // REG-UNIT-007
  it('应该验证验证码格式', async () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    fireEvent.change(screen.getByLabelText(/邮箱/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.click(screen.getByLabelText(/我已阅读并同意/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 输入错误长度的验证码
    fireEvent.change(screen.getByLabelText(/验证码/i), {
      target: { value: '123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /完成注册/i }));
    
    expect(await screen.findByText(/验证码为 6 位数字/i)).toBeInTheDocument();
  });

  // REG-UNIT-008
  it('应该可以返回上一步', () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    expect(screen.getByRole('button', { name: /上一步/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /上一步/i }));
    
    expect(screen.getByText(/选择您的角色/i)).toBeInTheDocument();
  });

  // REG-UNIT-009
  it('应该显示密码可见切换', () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    const passwordInput = screen.getByLabelText(/密码/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    const visibilityButton = screen.getByRole('button', { name: /visibility/i });
    fireEvent.click(visibilityButton);
    
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  // REG-UNIT-010
  it('应该显示密码强度指示器', async () => {
    render(<RegisterPage />);
    
    fireEvent.click(screen.getByLabelText(/广告主/i));
    fireEvent.click(screen.getByRole('button', { name: /下一步/i }));
    
    // 输入强密码
    fireEvent.change(screen.getByLabelText(/密码/i), {
      target: { value: 'SecurePass123!' },
    });
    
    expect(await screen.findByText(/强/i)).toBeInTheDocument();
    expect(screen.getAllByRole('progressbar')).toHaveLength(4);
  });
});
```

---

## 4. E2E 测试用例

### 4.1 广告主认证流程

**测试文件**: `/tests/e2e/advertiser-auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('广告主认证流程', () => {
  
  // E2E-ADV-001
  test('应该完成广告主注册和登录全流程', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `advertiser${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 1. 访问首页
    await page.goto('http://localhost:3000');
    await expect(page).toHaveTitle(/AIAds/);

    // 2. 点击注册
    await page.click('text=立即注册');
    await expect(page).toHaveURL(/\/register/);

    // 3. 选择广告主角色
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');

    // 4. 填写注册信息
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');

    // 5. 验证邮箱（使用测试验证码）
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 6. 验证跳转到仪表板
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
    await expect(page.locator('text=仪表板')).toBeVisible();

    // 7. 登出
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');
    await expect(page).toHaveURL(/\/login/);

    // 8. 登录
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('button:has-text("登录")');

    // 9. 验证登录后跳转
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });

  // E2E-ADV-002
  test('应该记住登录状态', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `remember${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 注册
    await page.goto('http://localhost:3000/register');
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 刷新页面
    await page.reload();

    // 验证仍然登录
    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });
});
```

### 4.2 KOL 认证流程

**测试文件**: `/tests/e2e/kol-auth.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('KOL 认证流程', () => {
  
  // E2E-KOL-001
  test('应该完成 KOL 注册和登录全流程', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `kol${timestamp}@test.com`;
    const testPassword = 'TestPass123!';

    // 1. 访问注册页面
    await page.goto('http://localhost:3000/register');

    // 2. 选择 KOL 角色
    await page.click('text=KOL');
    await page.click('button:has-text("下一步")');

    // 3. 填写注册信息
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');

    // 4. 验证邮箱
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 5. 验证跳转到 KOL 仪表板
    await expect(page).toHaveURL(/\/kol\/dashboard/);
    await expect(page.locator('text=KOL 仪表板')).toBeVisible();

    // 6. 登出并重新登录
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');

    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('button:has-text("登录")');

    await expect(page).toHaveURL(/\/kol\/dashboard/);
  });
});
```

### 4.3 忘记密码流程

**测试文件**: `/tests/e2e/forgot-password.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('忘记密码流程', () => {
  
  // E2E-PWD-001
  test('应该完成密码重置流程', async ({ page }) => {
    const testEmail = 'reset@test.com';
    const testPassword = 'OldPass123!';
    const newPassword = 'NewPass456!';

    // 1. 先注册账号
    await page.goto('http://localhost:3000/register');
    await page.click('text=广告主');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', testPassword);
    await page.click('text=我已阅读并同意');
    await page.click('button:has-text("下一步")');
    await page.fill('label:has-text("验证码") input', '123456');
    await page.click('button:has-text("完成注册")');

    // 2. 登出
    await page.click('[data-testid="user-menu"]');
    await page.click('text=登出');

    // 3. 访问忘记密码页面
    await page.click('text=忘记密码？');
    await expect(page).toHaveURL(/\/forgot-password/);

    // 4. 输入邮箱
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.click('button:has-text("发送验证码")');

    // 5. 输入验证码和新密码
    await page.fill('label:has-text("验证码") input', '123456');
    await page.fill('label:has-text("新密码") input', newPassword);
    await page.fill('label:has-text("确认密码") input', newPassword);
    await page.click('button:has-text("重置密码")');

    // 6. 验证重置成功
    await expect(page.locator('text=密码重置成功')).toBeVisible();

    // 7. 使用新密码登录
    await page.fill('label:has-text("邮箱") input', testEmail);
    await page.fill('label:has-text("密码") input', newPassword);
    await page.click('button:has-text("登录")');

    await expect(page).toHaveURL(/\/advertiser\/dashboard/);
  });
});
```

---

## 5. 测试用例统计

### 5.1 后端测试用例

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 总计 |
|-----|---------|---------|---------|------|
| 认证 (Auth) | 15 | 15 | 2 | 32 |
| 用户 (Users) | 5 | 7 | 0 | 12 |
| 广告主 (Advertisers) | 5 | 11 | 2 | 18 |
| KOL | 5 | 19 | 2 | 26 |
| 活动 (Campaigns) | 5 | 18 | 2 | 25 |
| 订单 (Orders) | 5 | 15 | 2 | 22 |
| 支付 (Payments) | 5 | 17 | 2 | 24 |
| 追踪 (Tracking) | 5 | 13 | 0 | 18 |
| **总计** | **50** | **115** | **12** | **177** |

### 5.2 前端测试用例

| 模块 | 单元测试 | 集成测试 | E2E 测试 | 总计 |
|-----|---------|---------|---------|------|
| 通用组件 | 30 | 0 | 0 | 30 |
| 布局组件 | 15 | 0 | 0 | 15 |
| 登录页面 | 8 | 0 | 2 | 10 |
| 注册页面 | 10 | 0 | 2 | 12 |
| 忘记密码 | 6 | 0 | 1 | 7 |
| 广告主仪表板 | 6 | 0 | 2 | 8 |
| KOL 仪表板 | 6 | 0 | 2 | 8 |
| 活动管理 | 10 | 0 | 2 | 12 |
| **总计** | **91** | **0** | **11** | **102** |

### 5.3 总体统计

| 类别 | 数量 | 占比 |
|-----|------|------|
| 单元测试 | 141 | 50.4% |
| 集成测试 | 115 | 41.1% |
| E2E 测试 | 23 | 8.5% |
| **总计** | **279** | **100%** |

### 5.4 优先级分布

| 优先级 | 数量 | 占比 | 通过率要求 |
|-------|------|------|-----------|
| P0 | 85 | 30.5% | 100% |
| P1 | 120 | 43.0% | ≥ 95% |
| P2 | 60 | 21.5% | ≥ 90% |
| P3 | 14 | 5.0% | ≥ 80% |
| **总计** | **279** | **100%** | - |

---

## 6. 附录

### 6.1 测试数据工厂

```typescript
// 用户工厂
const userFactory = {
  advertiser: (overrides = {}) => ({
    email: `advertiser_${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'advertiser' as const,
    nickname: '测试广告主',
    ...overrides,
  }),
  kol: (overrides = {}) => ({
    email: `kol_${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'kol' as const,
    nickname: '测试 KOL',
    ...overrides,
  }),
  admin: (overrides = {}) => ({
    email: `admin_${Date.now()}@test.com`,
    password: 'TestPass123!',
    role: 'admin' as const,
    nickname: '测试管理员',
    ...overrides,
  }),
};
```

### 6.2 测试辅助函数

```typescript
// 获取认证 Token
async function getAuthToken(role: 'advertiser' | 'kol' | 'admin') {
  const userData = userFactory[role]();
  await request(app).post('/api/v1/auth/register').send(userData);
  const res = await request(app).post('/api/v1/auth/login').send({
    email: userData.email,
    password: userData.password,
  });
  return res.body.data.tokens.access_token;
}

// 清理测试数据
async function cleanupTestData() {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: '@test.com',
      },
    },
  });
}
```

---

**文档结束**
