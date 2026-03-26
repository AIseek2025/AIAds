# TikTok Integration Documentation

## Overview

AIAds Platform 集成了 TikTok API，实现 KOL 账号绑定、数据同步和定时更新功能。

## 功能特性

- **OAuth 2.0 认证**: 安全的 TikTok 账号授权流程
- **数据同步**: 自动同步粉丝数、互动率等关键指标
- **定时任务**: 每小时同步活跃 KOL，每天同步所有 KOL
- **Token 管理**: 自动刷新过期的访问令牌
- **失败重试**: 内置重试机制，确保数据同步可靠性

## 环境配置

在 `.env` 文件中添加以下配置：

```bash
# TikTok API Credentials
TIKTOK_CLIENT_ID=your_client_id
TIKTOK_CLIENT_SECRET=your_client_secret
TIKTOK_REDIRECT_URI=http://localhost:3000/api/v1/integrations/tiktok/callback
```

### 获取 TikTok API 凭证

1. 访问 [TikTok for Developers](https://developers.tiktok.com/)
2. 创建开发者账号和应用
3. 获取 Client ID 和 Client Secret
4. 配置重定向 URI

## API 端点

### 1. OAuth 认证

#### GET /api/v1/integrations/tiktok/auth

获取 TikTok OAuth 授权 URL。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://www.tiktok.com/auth/authorize?client_key=...&redirect_uri=...&state=...&scope=...",
    "state": "random_state_string"
  },
  "message": "请前往 TikTok 授权"
}
```

#### GET /api/v1/integrations/tiktok/callback

TikTok OAuth 回调处理。

**查询参数:**
- `code`: 授权码
- `state`: 状态参数
- `kol_id`: KOL ID

**说明:**
此端点由 TikTok 回调使用，完成授权后重定向到前端页面。

### 2. 账号管理

#### GET /api/v1/integrations/tiktok/status

获取 TikTok 集成状态。

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
    "platformUsername": "tiktok_username",
    "platformDisplayName": "Display Name",
    "followerCount": 100000,
    "lastSyncedAt": "2024-01-01T12:00:00.000Z",
    "tokenExpiresAt": "2024-01-02T12:00:00.000Z",
    "needsReauth": false
  }
}
```

#### POST /api/v1/kols/connect/tiktok

连接 TikTok 账号。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://www.tiktok.com/auth/authorize?..."
  },
  "message": "请前往 TikTok 完成授权"
}
```

#### DELETE /api/v1/kols/tiktok/disconnect

断开 TikTok 账号连接。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "TikTok 账号已解绑"
}
```

### 3. 数据同步

#### POST /api/v1/kols/tiktok/sync

手动同步 TikTok 数据。

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
    "username": "tiktok_username",
    "followers": 100000
  },
  "message": "数据同步成功"
}
```

#### GET /api/v1/integrations/tiktok/stats

获取同步任务统计信息（仅管理员）。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "activeKols": {
      "totalJobs": 50,
      "successfulJobs": 48,
      "failedJobs": 2,
      "lastRunAt": "2024-01-01T12:00:00.000Z",
      "nextRunAt": "2024-01-01T13:00:00.000Z"
    },
    "allKols": {
      "totalJobs": 200,
      "successfulJobs": 195,
      "failedJobs": 5,
      "lastRunAt": "2024-01-01T03:00:00.000Z",
      "nextRunAt": "2024-01-02T03:00:00.000Z"
    }
  }
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

- 已连接 TikTok 账号
- 有有效的访问令牌
- 最近 7 天内同步过数据
- KOL 状态为 active

## 数据同步内容

### 用户信息
- 粉丝数 (followers)
- 关注数 (following)
- 视频总数 (videoCount)
- 点赞总数 (heartCount)
- 验证状态 (isVerified)
- 头像 URL
- 用户名

### 视频统计
- 播放量 (playCount)
- 点赞数 (likeCount)
- 评论数 (commentCount)
- 分享数 (shareCount)
- 互动率 (engagementRate)

### 互动率计算

```
互动率 = (点赞数 + 评论数 + 分享数) / 播放量 × 100%
```

## 限流处理

TikTok API 有速率限制，系统采用以下策略：

1. **批量处理**: 每次同步最多 5 个 KOL
2. **延迟控制**: 批次间延迟 2-5 秒
3. **重试机制**: 失败请求最多重试 3 次
4. **指数退避**: 重试间隔递增（5s, 10s, 15s）

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| TIKTOK_TOKEN_ERROR | 获取访问令牌失败 |
| TIKTOK_TOKEN_EXCHANGE_ERROR | 交换授权码失败 |
| TIKTOK_TOKEN_REFRESH_ERROR | 刷新令牌失败 |
| TIKTOK_USER_INFO_ERROR | 获取用户信息失败 |
| TIKTOK_VIDEO_LIST_ERROR | 获取视频列表失败 |
| TIKTOK_VIDEO_STATS_ERROR | 获取视频统计失败 |
| TIKTOK_NOT_CONNECTED | TikTok 账号未连接 |
| TIKTOK_TOKEN_MISSING | 访问令牌缺失 |
| TIKTOK_SYNC_ERROR | 数据同步失败 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "TIKTOK_NOT_CONNECTED",
    "message": "TikTok 账号未连接"
  }
}
```

## 前端集成示例

### React/TypeScript

```typescript
// 获取授权 URL
async function getTikTokAuthUrl() {
  const response = await fetch('/api/v1/integrations/tiktok/auth', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  if (data.success) {
    // 重定向到 TikTok 授权页面
    window.location.href = data.data.auth_url;
  }
}

// 检查连接状态
async function checkTikTokStatus() {
  const response = await fetch('/api/v1/integrations/tiktok/status', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  
  const data = await response.json();
  return data.data;
}

// 手动同步数据
async function syncTikTokData(fullSync = false) {
  const response = await fetch('/api/v1/kols/tiktok/sync', {
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
async function disconnectTikTok() {
  const response = await fetch('/api/v1/kols/tiktok/disconnect', {
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
  platformId        String   @map("platform_id")
  platformUsername  String   @map("platform_username")
  platformDisplayName String? @map("platform_display_name")
  platformAvatarUrl String?  @map("platform_avatar_url")
  followers         Int      @default(0)
  following         Int?     @map("following")
  totalVideos       Int?     @map("total_videos")
  totalLikes        Int?     @map("total_likes")
  avgViews          Int?     @map("avg_views")
  avgLikes          Int?     @map("avg_likes")
  avgComments       Int?     @map("avg_comments")
  avgShares         Int?     @map("avg_shares")
  engagementRate    Decimal? @map("engagement_rate")
  isPrimary         Boolean  @default(false) @map("is_primary")
  isVerified        Boolean  @default(false) @map("is_verified")
  accessToken       String?  @map("access_token")
  refreshToken      String?  @map("refresh_token")
  expiresAt         DateTime? @map("expires_at")
  refreshExpiresAt  DateTime? @map("refresh_expires_at")
  lastSyncedAt      DateTime? @map("last_synced_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  kol               Kol      @relation(fields: [kolId], references: [id], onDelete: Cascade)

  @@index([kolId])
  @@index([platform])
  @@unique([kolId, platform])
  @@map("kol_accounts")
}
```

## 安全考虑

1. **Token 存储**: 访问令牌和刷新令牌加密存储
2. **状态验证**: OAuth state 参数防止 CSRF 攻击
3. **权限控制**: 所有端点需要认证，部分需要管理员权限
4. **速率限制**: 防止滥用 API

## 故障排查

### Token 过期

如果收到 401 错误，表示 Token 已过期：

1. 调用 `/api/v1/kols/tiktok/disconnect` 断开连接
2. 重新调用 `/api/v1/kols/connect/tiktok` 进行授权

### 同步失败

检查日志文件 `logs/combined.log` 和 `logs/error.log`：

```bash
# 查看最近的 TikTok 相关日志
grep -i "tiktok" logs/error.log | tail -50
```

### 数据库迁移

如果添加了新字段，运行：

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds/src/backend
npm run prisma:migrate
```

## 测试

### 单元测试

```bash
npm test -- tests/services/tiktok.service.test.ts
```

### 集成测试

```bash
npm test -- tests/integrations/tiktok.test.ts
```

## 相关文件

```
src/
├── services/
│   ├── tiktok.service.ts          # TikTok API 服务
│   ├── tiktok-sync.service.ts     # TikTok 同步服务
│   └── tiktok.types.ts            # TikTok 类型定义
├── controllers/
│   └── integrations.controller.ts # 集成控制器
├── routes/
│   └── integrations.routes.ts     # 集成路由
└── index.ts                       # 应用入口（初始化定时任务）
```

## 支持的平台

当前支持以下平台的集成：

- ✅ TikTok
- 🔄 YouTube (计划中)
- 🔄 Instagram (计划中)
- 🔄 小红书 (计划中)
- 🔄 微博 (计划中)

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- OAuth 2.0 认证
- 用户信息同步
- 视频数据统计
- 定时任务调度
- Token 自动刷新

## 联系方式

如有问题，请联系开发团队或提交 Issue。
