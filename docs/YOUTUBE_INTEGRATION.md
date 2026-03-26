# YouTube Integration Documentation

## Overview

AIAds Platform 集成了 YouTube Data API v3，实现 KOL 账号绑定、数据同步和定时更新功能。

## 功能特性

- **OAuth 2.0 认证**: 安全的 Google/YouTube 账号授权流程
- **数据同步**: 自动同步订阅者数、视频数、观看次数等关键指标
- **定时任务**: 每小时同步活跃 KOL，每天同步所有 KOL
- **Token 管理**: 自动刷新过期的访问令牌
- **失败重试**: 内置重试机制，确保数据同步可靠性

## 环境配置

在 `.env` 文件中添加以下配置：

```bash
# YouTube API Credentials
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/v1/integrations/youtube/callback
```

### 获取 YouTube API 凭证

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建新项目或选择现有项目
3. 启用 YouTube Data API v3
4. 创建 OAuth 2.0 凭据
5. 配置授权重定向 URI
6. 获取 Client ID 和 Client Secret

## API 端点

### 1. OAuth 认证

#### GET /api/v1/integrations/youtube/auth

获取 YouTube OAuth 授权 URL。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=...&scope=...",
    "state": "random_state_string"
  },
  "message": "请前往 YouTube 授权"
}
```

#### GET /api/v1/integrations/youtube/callback

YouTube OAuth 回调处理。

**查询参数:**
- `code`: 授权码
- `state`: 状态参数
- `kol_id`: KOL ID

**说明:**
此端点由 YouTube 回调使用，完成授权后重定向到前端页面。

### 2. 账号管理

#### GET /api/v1/integrations/youtube/status

获取 YouTube 集成状态。

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
    "platformUsername": "channel_custom_url",
    "platformDisplayName": "Channel Name",
    "subscriberCount": 100000,
    "lastSyncedAt": "2024-01-01T12:00:00.000Z",
    "tokenExpiresAt": "2024-01-02T12:00:00.000Z",
    "needsReauth": false
  }
}
```

#### POST /api/v1/kols/connect/youtube

连接 YouTube 账号。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "data": {
    "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?..."
  },
  "message": "请前往 YouTube 完成授权"
}
```

#### DELETE /api/v1/kols/youtube/disconnect

断开 YouTube 账号连接。

**请求头:**
```
Authorization: Bearer <access_token>
```

**响应:**
```json
{
  "success": true,
  "message": "YouTube 账号已解绑"
}
```

### 3. 数据同步

#### POST /api/v1/kols/youtube/sync

手动同步 YouTube 数据。

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
    "username": "Channel Name",
    "subscribers": 100000
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

- 已连接 YouTube 账号
- 有有效的访问令牌
- 最近 7 天内同步过数据
- KOL 状态为 active

## 数据同步内容

### 频道信息
- 订阅者数 (subscriberCount)
- 视频总数 (videoCount)
- 总观看次数 (viewCount)
- 频道标题 (title)
- 频道描述 (description)
- 自定义 URL (customUrl)
- 国家/地区 (country)
- 头像 URL

### 视频统计
- 观看次数 (viewCount)
- 点赞数 (likeCount)
- 评论数 (commentCount)
- 互动率 (engagementRate)

### 互动率计算

```
互动率 = (点赞数 + 评论数) / 观看次数 × 100%
```

## 限流处理

YouTube Data API 有配额限制，系统采用以下策略：

1. **批量处理**: 每次同步最多 5 个 KOL
2. **延迟控制**: 批次间延迟 2-5 秒
3. **重试机制**: 失败请求最多重试 3 次
4. **指数退避**: 重试间隔递增（5s, 10s, 15s）

### API 配额

YouTube Data API 每日配额为 10,000 单位：
- 读取频道信息：1 单位
- 读取视频列表：1 单位
- 读取视频统计：1 单位

## 错误处理

### 错误码

| 错误码 | 说明 |
|--------|------|
| YOUTUBE_TOKEN_ERROR | 获取访问令牌失败 |
| YOUTUBE_TOKEN_EXCHANGE_ERROR | 交换授权码失败 |
| YOUTUBE_TOKEN_REFRESH_ERROR | 刷新令牌失败 |
| YOUTUBE_CHANNEL_INFO_ERROR | 获取频道信息失败 |
| YOUTUBE_VIDEO_LIST_ERROR | 获取视频列表失败 |
| YOUTUBE_VIDEO_STATS_ERROR | 获取视频统计失败 |
| YOUTUBE_NOT_CONNECTED | YouTube 账号未连接 |
| YOUTUBE_TOKEN_MISSING | 访问令牌缺失 |
| YOUTUBE_SYNC_ERROR | 数据同步失败 |
| YOUTUBE_CHANNEL_NOT_FOUND | 频道不存在 |
| YOUTUBE_VIDEO_NOT_FOUND | 视频不存在 |

### 错误响应示例

```json
{
  "success": false,
  "error": {
    "code": "YOUTUBE_NOT_CONNECTED",
    "message": "YouTube 账号未连接"
  }
}
```

## 前端集成示例

### React/TypeScript

```typescript
// 获取授权 URL
async function getYouTubeAuthUrl() {
  const response = await fetch('/api/v1/integrations/youtube/auth', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  if (data.success) {
    // 重定向到 YouTube 授权页面
    window.location.href = data.data.auth_url;
  }
}

// 检查连接状态
async function checkYouTubeStatus() {
  const response = await fetch('/api/v1/integrations/youtube/status', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data.data;
}

// 手动同步数据
async function syncYouTubeData(fullSync = false) {
  const response = await fetch('/api/v1/kols/youtube/sync', {
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
async function disconnectYouTube() {
  const response = await fetch('/api/v1/kols/youtube/disconnect', {
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
  platformId        String   @map("platform_id")      // YouTube Channel ID
  platformUsername  String   @map("platform_username") // Custom URL or Channel Title
  platformDisplayName String? @map("platform_display_name")
  platformAvatarUrl String?  @map("platform_avatar_url")
  followers         Int      @default(0)               // Subscriber count
  totalVideos       Int?     @map("total_videos")
  totalLikes        Int?     @map("total_likes")       // Total views
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
5. **最小权限**: 只请求只读权限

## OAuth 权限范围

系统请求以下权限：
- `https://www.googleapis.com/auth/youtube.readonly` - 读取频道和视频信息
- `https://www.googleapis.com/auth/youtube.channel.readonly` - 读取频道信息

## 故障排查

### Token 过期

如果收到 401 错误，表示 Token 已过期：

1. 调用 `/api/v1/kols/youtube/disconnect` 断开连接
2. 重新调用 `/api/v1/kols/connect/youtube` 进行授权

### 同步失败

检查日志文件 `logs/combined.log` 和 `logs/error.log`：

```bash
# 查看最近的 YouTube 相关日志
grep -i "youtube" logs/error.log | tail -50
```

### API 配额用尽

如果收到 403 Quota Exceeded 错误：
1. 等待配额重置（每日太平洋时间午夜）
2. 或联系 Google 增加配额

## 测试

### 单元测试

```bash
npm test -- tests/services/youtube.service.test.ts
```

### 集成测试

```bash
npm test -- tests/integrations/youtube.test.ts
```

## 相关文件

```
src/
├── services/
│   ├── youtube.service.ts          # YouTube API 服务
│   ├── youtube-sync.service.ts     # YouTube 同步服务
│   └── youtube.types.ts            # YouTube 类型定义
├── controllers/
│   └── integrations.controller.ts  # 集成控制器
├── routes/
│   └── integrations.routes.ts      # 集成路由
└── index.ts                        # 应用入口（初始化定时任务）
```

## 支持的平台

当前支持以下平台的集成：

- ✅ TikTok
- ✅ YouTube
- 🔄 Instagram (开发中)
- 🔄 小红书 (计划中)
- 🔄 微博 (计划中)

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本
- OAuth 2.0 认证
- 频道信息同步
- 视频数据统计
- 定时任务调度
- Token 自动刷新

## 联系方式

如有问题，请联系开发团队或提交 Issue。
