# Instagram Integration Documentation

## Overview

AIAds Platform 集成了 Instagram Graph API，实现 KOL 账号绑定、数据同步和定时更新功能。

## 功能特性

- **OAuth 2.0 认证**: 安全的 Instagram/Facebook 账号授权流程
- **数据同步**: 自动同步粉丝数、帖子数、互动率等关键指标
- **定时任务**: 每小时同步活跃 KOL，每天同步所有 KOL
- **Token 管理**: 自动刷新过期的访问令牌（长期令牌 60 天有效期）
- **失败重试**: 内置重试机制，确保数据同步可靠性

## 环境配置

在 `.env` 文件中添加以下配置：

```bash
# Instagram API Credentials (Facebook App)
INSTAGRAM_CLIENT_ID=your_app_id
INSTAGRAM_CLIENT_SECRET=your_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/v1/integrations/instagram/callback
```

### 获取 Instagram API 凭证

1. 访问 [Facebook for Developers](https://developers.facebook.com/)
2. 创建 Facebook App 或选择现有 App
3. 添加 Instagram Graph API 产品
4. 配置 OAuth 重定向 URI
5. 获取 App ID 和 App Secret

#### 详细步骤：

1. **创建 Facebook App**
   - 访问 [Facebook Developers](https://developers.facebook.com/)
   - 点击"创建应用"
   - 选择"商务"应用类型
   - 填写应用信息

2. **添加 Instagram Graph API**
   - 在应用仪表板中，点击"添加产品"
   - 找到"Instagram Graph API"并添加

3. **配置 OAuth**
   - 进入"设置" > "基本"
   - 添加有效的 OAuth 重定向 URI
   - 例如：`http://localhost:3000/api/v1/integrations/instagram/callback`

4. **获取凭据**
   - App ID = INSTAGRAM_CLIENT_ID
   - App Secret = INSTAGRAM_CLIENT_SECRET

5. **配置 Instagram Basic Display**
   - 添加"Instagram Basic Display"产品
   - 配置重定向 URI
   - 创建 Instagram 测试账号（用于开发测试）

## API 端点

### 1. OAuth 认证

#### GET /api/v1/integrations/instagram/auth

获取 Instagram OAuth 授权 URL。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://www.instagram.com/oauth/authorize?client_id=...&redirect_uri=...&scope=...",
    "state": "random_state_string"
  },
  "message": "请前往 Instagram 授权"
}
```

#### GET /api/v1/integrations/instagram/callback

Instagram OAuth 回调处理。

**查询参数:**
- `code`: 授权码
- `state`: 状态参数
- `kol_id`: KOL ID

**说明:**
此端点由 Instagram 回调使用，完成授权后重定向到前端页面。

### 2. 账号管理

#### GET /api/v1/integrations/instagram/status

获取 Instagram 集成状态。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "isConnected": true,
    "accountId": "account-uuid",
    "platformUsername": "instagram_username",
    "platformDisplayName": "Display Name",
    "followerCount": 100000,
    "lastSyncedAt": "2024-01-01T12:00:00.000Z",
    "tokenExpiresAt": "2024-03-01T12:00:00.000Z",
    "needsReauth": false
  }
}
```

#### POST /api/v1/kols/connect/instagram

连接 Instagram 账号。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://www.instagram.com/oauth/authorize?..."
  },
  "message": "请前往 Instagram 完成授权"
}
```

#### DELETE /api/v1/kols/instagram/disconnect

断开 Instagram 账号连接。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "Instagram 账号已解绑"
}
```

### 3. 数据同步

#### POST /api/v1/kols/instagram/sync

手动同步 Instagram 数据。

**请求头:**
```
Authorization: Bearer <access_token>
```

**请求体:**
```json
{
  "full_sync": true
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "synced_at": "2024-01-01T12:00:00.000Z",
    "username": "instagram_username",
    "followers": 100000
  },
  "message": "数据同步成功"
}
```

## 定时任务

系统自动运行以下定时任务（时区：Asia/Shanghai）：

| 任务 | Cron 表达式 | 说明 |
|------|------------|------|
| 活跃 KOL 同步 | `0 * * * *` | 每小时同步一次活跃 KOL 数据 |
| 全部 KOL 同步 | `0 3 * * *` | 每天凌晨 3 点同步所有 KOL 数据 |
| Token 刷新检查 | `*/30 * * * *` | 每 30 分钟检查并刷新即将过期的 Token |

### 活跃 KOL 定义

- 已连接 Instagram 账号
- 有有效的访问令牌
- 最近 7 天内同步过数据
- KOL 状态为 active

## 数据同步内容

### 账号信息
- 粉丝数 (followersCount)
- 关注数 (followsCount)
- 帖子总数 (mediaCount)
- 用户名 (username)
- 显示名称 (name)
- 个人简介 (biography)
- 网站链接 (website)
- 验证状态 (isVerified)
- 账号类型 (accountType)
- 头像 URL

### 帖子统计
- 点赞数 (likeCount)
- 评论数 (commentsCount)
- 保存数 (saved)
- 覆盖人数 (reach)
- 展示次数 (impressions)
- 视频观看数 (videoViews)
- 互动率 (engagementRate)

### 互动率计算

```
互动率 = (点赞数 + 评论数) / 粉丝数 × 100%
```

## 限流处理

Instagram Graph API 有速率限制，系统采用以下策略：

1. **批量处理**: 每次同步最多 5 个 KOL
2. **延迟控制**: 批次间延迟 2-5 秒
3. **重试机制**: 失败请求最多重试 3 次
4. **指数退避**: 重试间隔递增（5s, 10s, 15s）

### API 限流

Instagram Graph API 限流：
- 每小时 200 次请求（每个用户）
- 长期令牌有效期 60 天

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| INSTAGRAM_TOKEN_ERROR | 获取访问令牌失败 |
| INSTAGRAM_TOKEN_EXCHANGE_ERROR | 交换授权码失败 |
| INSTAGRAM_TOKEN_REFRESH_ERROR | 刷新令牌失败 |
| INSTAGRAM_ACCOUNT_INFO_ERROR | 获取账号信息失败 |
| INSTAGRAM_MEDIA_LIST_ERROR | 获取媒体列表失败 |
| INSTAGRAM_MEDIA_STATS_ERROR | 获取媒体统计失败 |
| INSTAGRAM_NOT_CONNECTED | Instagram 账号未连接 |
| INSTAGRAM_TOKEN_MISSING | 访问令牌缺失 |
| INSTAGRAM_SYNC_ERROR | 数据同步失败 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "INSTAGRAM_NOT_CONNECTED",
    "message": "Instagram 账号未连接"
  }
}
```

## 前端集成示例

### React/TypeScript

```typescript
// 获取授权 URL
async function getInstagramAuthUrl() {
  const response = await fetch('/api/v1/integrations/instagram/auth', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (data.success) {
    // 重定向到 Instagram 授权页面
    window.location.href = data.data.auth_url;
  }
}

// 检查连接状态
async function checkInstagramStatus() {
  const response = await fetch('/api/v1/integrations/instagram/status', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data.data;
}

// 手动同步数据
async function syncInstagramData(fullSync = false) {
  const response = await fetch('/api/v1/kols/instagram/sync', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ full_sync: fullSync }),
  });

  const data = await response.json();
  return data;
}

// 断开连接
async function disconnectInstagram() {
  const response = await fetch('/api/v1/kols/instagram/disconnect', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data;
}
```

## 数据库结构

### kol_accounts 表

```prisma
model KolAccount {
  id                String   @id @default(uuid())
  kolId             String   @map("kol_id")
  platform          KolPlatform
  platformId        String   @map("platform_id")      // Instagram User ID
  platformUsername  String   @map("platform_username") // Instagram Username
  platformDisplayName String? @map("platform_display_name")
  platformAvatarUrl String?  @map("platform_avatar_url")
  followers         Int      @default(0)               // Follower count
  following         Int?     @map("following")         // Following count
  totalVideos       Int?     @map("total_videos")      // Media count
  accessToken       String?  @map("access_token")
  refreshToken      String?  @map("refresh_token")
  expiresAt         DateTime? @map("expires_at")
  lastSyncedAt      DateTime? @map("last_synced_at")
  // ... other fields
  
  @@unique([kolId, platform])
  @@map("kol_accounts")
}
```

## 安全考虑

1. **Token 存储**: 访问令牌和刷新令牌加密存储
2. **状态验证**: OAuth state 参数防止 CSRF 攻击
3. **权限控制**: 所有端点需要认证
4. **速率限制**: 防止滥用 API
5. **最小权限**: 只请求必要的权限

## OAuth 权限范围

系统请求以下权限：
- `user_profile` - 读取用户基本信息
- `user_media` - 读取用户媒体内容
- `instagram_basic` - Instagram 基础信息
- `pages_show_list` - 显示主页列表
- `pages_read_engagement` - 读取主页互动数据
- `instagram_manage_insights` - 读取 Instagram 洞察数据

## Token 管理

### 短期令牌 vs 长期令牌

1. **短期令牌**: 初始 OAuth 交换获得，有效期 1 小时
2. **长期令牌**: 交换后获得，有效期 60 天

### Token 刷新

- 系统自动在令牌过期前 30 分钟刷新
- 刷新后有效期延长 60 天
- 刷新失败时会记录日志并通知用户重新授权

## 故障排查

### Token 过期

如果收到 401 错误，表示 Token 已过期：

1. 调用 `/api/v1/kols/instagram/disconnect` 断开连接
2. 重新调用 `/api/v1/kols/connect/instagram` 进行授权

### 同步失败

检查日志文件 `logs/combined.log` 和 `logs/error.log`：

```bash
# 查看最近的 Instagram 相关日志
grep -i "instagram" logs/error.log | tail -50
```

### 权限不足

如果收到 403 Forbidden 错误：
1. 检查 App 审核状态
2. 确保用户已授权所有必要权限
3. 对于生产环境，确保 App 已通过 Facebook 审核

## 测试

### 单元测试

```bash
npm test -- tests/services/instagram.service.test.ts
```

### 集成测试

```bash
npm test -- tests/integrations/instagram.test.ts
```

## 相关文件

```
src/
├── services/
│   ├── instagram.service.ts          # Instagram API 服务
│   ├── instagram-sync.service.ts     # Instagram 同步服务
│   └── instagram.types.ts            # Instagram 类型定义
├── controllers/
│   └── integrations.controller.ts    # 集成控制器
├── routes/
│   └── integrations.routes.ts        # 集成路由
└── index.ts                          # 应用入口（初始化定时任务）
```

## 支持的平台

当前支持以下平台的集成：

- ✅ TikTok
- ✅ YouTube
- ✅ Instagram
- 🔄 小红书 (计划中)
- 🔄 微博 (计划中)

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- OAuth 2.0 认证
- 账号信息同步
- 媒体数据统计
- 定时任务调度
- Token 自动刷新（60 天长期令牌）

## 注意事项

### Instagram Business vs Creator vs Personal

- **Business 账号**: 完整 API 访问权限，推荐使用
- **Creator 账号**: 大部分 API 访问权限
- **Personal 账号**: 有限的 API 访问权限

### Facebook 商务管理平台

要使用 Instagram Graph API，需要：
1. Facebook 商务管理平台账号
2. Instagram Business 或 Creator 账号
3. Facebook 主页与 Instagram 账号关联

## 联系方式

如有问题，请联系开发团队或提交 Issue。
