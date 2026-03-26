# AIAds 广告主仪表盘开发文档

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**作者**: AIAds 开发团队
**状态**: 已完成

---

## 1. 概述

广告主仪表盘是 AIAds 平台的核心功能模块，为广告主提供完整的广告投放管理功能，包括活动创建、管理、KOL 发现、数据分析等功能。

---

## 2. 技术架构

### 2.1 技术栈

- **React 19**: 前端框架
- **TypeScript**: 类型安全的 JavaScript 超集
- **MUI (Material-UI) v7**: UI 组件库
- **Zustand**: 轻量级状态管理
- **React Query (TanStack Query)**: 数据获取和缓存
- **React Router v7**: 路由管理
- **Axios**: HTTP 客户端

### 2.2 目录结构

```
src/frontend/src/
├── pages/advertiser/
│   ├── Dashboard.tsx           # 广告主仪表盘主页
│   ├── CampaignList.tsx        # 活动列表页面
│   ├── CampaignCreate.tsx      # 活动创建页面
│   ├── CampaignDetail.tsx      # 活动详情页面
│   └── KolDiscovery.tsx        # KOL 发现页面
├── stores/
│   ├── campaignStore.ts        # 活动状态管理
│   ├── advertiserStore.ts      # 广告主状态管理
│   └── authStore.ts            # 认证状态管理
├── services/
│   └── advertiserApi.ts        # 广告主相关 API 服务
└── types/
    └── index.ts                # TypeScript 类型定义
```

---

## 3. 页面功能详解

### 3.1 广告主仪表盘 (Dashboard.tsx)

**路径**: `/advertiser/dashboard`

**功能**:
- 显示账户余额和充值按钮
- 显示活动统计（总数/进行中/已完成）
- 显示总曝光量
- 显示最近活动列表
- 提供快速入口（创建活动、发现 KOL、活动管理、数据分析）

**主要组件**:
- 余额卡片：展示当前余额，提供充值入口
- 统计卡片：四个统计指标卡片
- 快速入口：四个快捷操作卡片
- 最近活动：最近创建的活动列表

**API 调用**:
- `GET /advertisers/me` - 获取广告主信息
- `GET /campaigns` - 获取活动列表

**状态管理**:
- 使用 `useAuthStore` 获取用户信息
- 使用 `useAdvertiserStore` 存储广告主数据
- 使用 React Query 进行数据获取和缓存

---

### 3.2 活动列表 (CampaignList.tsx)

**路径**: `/advertiser/campaigns`

**功能**:
- 活动列表展示（表格形式）
- 多维度筛选（状态/目标/关键词）
- 搜索功能（支持活动名称）
- 状态标签（草稿/进行中/已完成/已暂停/已取消）
- 操作按钮（编辑/删除/查看）
- 分页功能

**筛选条件**:
- 状态：全部/草稿/进行中/已暂停/已完成/已取消
- 目标：全部/品牌曝光/用户互动/转化购买
- 关键词：活动名称搜索

**操作**:
- 创建活动：跳转到活动创建页面
- 查看：跳转到活动详情页面
- 编辑：跳转到活动编辑页面
- 删除：弹出确认对话框

**API 调用**:
- `GET /campaigns` - 获取活动列表
- `DELETE /campaigns/:id` - 删除活动

---

### 3.3 活动创建 (CampaignCreate.tsx)

**路径**: `/advertiser/campaigns/create`

**功能**:
- 多步骤表单（4 步）
- 表单验证
- 实时预览
- 草稿保存（待实现）

**步骤详情**:

#### 步骤 1: 基本信息
- 活动标题（必填，5-50 字符）
- 活动描述（必填，最多 500 字符）
- 活动目标（单选）：
  - 品牌曝光 (awareness)
  - 用户互动 (consideration)
  - 转化购买 (conversion)

#### 步骤 2: 目标受众
- 年龄范围（必填）
- 性别（全部/男性/女性）
- 目标地区（多选）
- 兴趣标签（多选）
- 目标平台（多选）
- KOL 粉丝要求（滑块控制）
- 最低互动率（滑块控制）

#### 步骤 3: 预算设置
- 预算类型（固定预算/动态预算）
- 预算金额（必填，最低¥100）
- 开始日期（必填）
- 结束日期（必填）
- 自动计算活动持续天数

#### 步骤 4: 确认提交
- 实时预览所有填写的信息
- 确认无误后提交

**API 调用**:
- `POST /campaigns` - 创建活动

**表单验证**:
- 必填项验证
- 字符长度验证
- 日期逻辑验证（结束日期必须晚于开始日期）
- 数值范围验证

---

### 3.4 活动详情 (CampaignDetail.tsx)

**路径**: `/advertiser/campaigns/:id`

**功能**:
- 活动详细信息展示
- 数据统计卡片
- 订单列表
- KOL 列表
- 数据分析图表（待集成图表库）

**统计指标**:
- 预算使用：已花费/总预算，带进度条
- 总曝光量
- 总互动数（点赞 + 评论）
- 合作 KOL 数

**Tab 页面**:
1. **活动详情**: 基本信息、目标受众、投放平台、内容要求、必需标签
2. **订单列表**: KOL 名称、平台、状态、金额、交付内容、创建日期
3. **KOL 列表**: KOL 卡片展示
4. **数据分析**: 曝光趋势、互动趋势、CTR、转化率、ROI

**API 调用**:
- `GET /campaigns/:id` - 获取活动详情
- `GET /campaigns/:id/stats` - 获取活动统计数据
- `DELETE /campaigns/:id` - 删除活动

---

### 3.5 KOL 发现 (KolDiscovery.tsx)

**路径**: `/advertiser/kols`

**功能**:
- KOL 卡片列表展示
- 多维度筛选
- KOL 详情弹窗
- 联系合作功能

**筛选条件**:
- 平台：TikTok/YouTube/Instagram/Facebook/Twitter/LinkedIn
- 类别：美妆/时尚/科技/美食/旅行/健身/教育/游戏/音乐/娱乐/母婴/生活
- 地区：美国/英国/加拿大/澳大利亚/德国/法国/日本/韩国/中国/印度/巴西/墨西哥
- 粉丝数范围：滑块控制（0-1M）
- 最低互动率：滑块控制（0%-10%）
- 关键词：KOL 名称搜索

**KOL 卡片信息**:
- 头像和名称
- 平台标识
- 粉丝数
- 互动率
- 基础价格
- 评分
- 标签

**详情弹窗**:
- 基本信息：平台、类别、地区、认证状态
- 数据统计：粉丝数、关注数、平均观看、平均点赞
- 互动数据：互动率、平均评论、平均分享、视频总数
- 合作信息：基础价格、视频价格、完成订单、平均评分
- 标签列表

**联系合作**:
- 弹窗输入合作意向
- 包括合作内容、预算、时间要求等

**API 调用**:
- `GET /kols` - 获取 KOL 列表
- `GET /kols/:id` - 获取 KOL 详情

---

## 4. 状态管理

### 4.1 Campaign Store

**文件**: `stores/campaignStore.ts`

**状态**:
```typescript
interface CampaignState {
  campaigns: Campaign[];       // 活动列表
  currentCampaign: Campaign | null;  // 当前活动
  filters: CampaignFilters;    // 筛选条件
  isLoading: boolean;          // 加载状态
  error: string | null;        // 错误信息
  total: number;               // 总数
  page: number;                // 当前页
  pageSize: number;            // 每页数量
}
```

**Actions**:
- `setCampaigns`: 设置活动列表
- `setCurrentCampaign`: 设置当前活动
- `addCampaign`: 添加活动
- `updateCampaign`: 更新活动
- `deleteCampaign`: 删除活动
- `setFilters`: 设置筛选条件
- `setPage`: 设置页码
- `setPageSize`: 设置每页数量
- `setLoading`: 设置加载状态
- `setError`: 设置错误信息
- `resetFilters`: 重置筛选条件

### 4.2 Advertiser Store

**文件**: `stores/advertiserStore.ts`

**状态**:
```typescript
interface AdvertiserState {
  advertiser: Advertiser | null;  // 广告主信息
  stats: AdvertiserStats | null;  // 统计数据
  isLoading: boolean;             // 加载状态
  error: string | null;           // 错误信息
}
```

**Actions**:
- `setAdvertiser`: 设置广告主信息
- `setStats`: 设置统计数据
- `updateBalance`: 更新余额
- `setLoading`: 设置加载状态
- `setError`: 设置错误信息
- `refreshAdvertiser`: 刷新广告主信息

---

## 5. API 服务

**文件**: `services/advertiserApi.ts`

### 5.1 广告主 API

```typescript
advertiserAPI.getProfile()      // 获取广告主信息
advertiserAPI.createProfile()   // 创建广告主信息
advertiserAPI.updateProfile()   // 更新广告主信息
advertiserAPI.getBalance()      // 获取余额
advertiserAPI.recharge()        // 充值
advertiserAPI.getTransactions() // 获取交易记录
```

### 5.2 活动 API

```typescript
campaignAPI.getCampaigns()      // 获取活动列表
campaignAPI.getCampaign()       // 获取活动详情
campaignAPI.createCampaign()    // 创建活动
campaignAPI.updateCampaign()    // 更新活动
campaignAPI.deleteCampaign()    // 删除活动
campaignAPI.submitCampaign()    // 提交活动
campaignAPI.getCampaignStats()  // 获取活动统计
```

### 5.3 KOL API

```typescript
kolAPI.getKols()              // 获取 KOL 列表
kolAPI.getKol()               // 获取 KOL 详情
kolAPI.getRecommendedKols()   // 获取推荐 KOL
kolAPI.contactKol()           // 联系 KOL
```

---

## 6. 组件设计

### 6.1 通用组件

以下组件在多个页面中复用：

- **StatCard**: 统计卡片组件
- **KolCard**: KOL 卡片组件
- **StatusChip**: 状态标签组件
- **ActionButton**: 操作按钮组件

### 6.2 样式规范

使用 MUI 的 styled 组件和 sx 属性：

```typescript
// styled 组件
const StatCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

// sx 属性
<Box
  sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    mb: 4,
  }}
/>
```

---

## 7. 响应式设计

### 7.1 断点

使用 MUI 的默认断点：

- `xs`: 0-599px (手机)
- `sm`: 600-899px (平板)
- `md`: 900-1199px (小屏桌面)
- `lg`: 1200-1529px (大屏桌面)
- `xl`: 1530px+ (超大屏)

### 7.2 响应式布局

```typescript
// Grid 响应式
<Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
  <Card />
</Grid>

// 显示/隐藏
<Box sx={{ display: { xs: 'block', md: 'none' } }}>
  仅在手机显示
</Box>
```

---

## 8. 加载状态和错误处理

### 8.1 加载状态

使用 MUI 组件：

- `LinearProgress`: 页面级加载
- `CircularProgress`: 按钮级加载
- `Skeleton`: 内容占位符

### 8.2 错误处理

```typescript
// React Query 错误处理
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['campaigns'],
  queryFn: campaignAPI.getCampaigns,
  retry: 1,
});

if (error) {
  return <Alert severity="error">加载失败</Alert>;
}

// 错误提示
<Snackbar open={snackbar.open} autoHideDuration={3000}>
  <Alert severity={snackbar.severity}>
    {snackbar.message}
  </Alert>
</Snackbar>
```

---

## 9. 表单验证

### 9.1 验证规则

```typescript
// 活动创建表单验证
const validateStep = (step: number): boolean => {
  const newErrors: Record<string, string> = {};

  if (step === 0) {
    // 基本信息验证
    if (!formData.title?.trim()) {
      newErrors.title = '请输入活动标题';
    } else if (formData.title.length < 5) {
      newErrors.title = '活动标题至少 5 个字符';
    }
    if (!formData.description?.trim()) {
      newErrors.description = '请输入活动描述';
    }
  }

  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### 9.2 错误显示

```typescript
<TextField
  error={!!errors.title}
  helperText={errors.title || `${formData.title?.length || 0}/50 字符`}
/>
```

---

## 10. 路由配置

**文件**: `AppRouter.tsx`

```typescript
// 广告主路由
<Route
  path="/advertiser"
  element={
    <ProtectedRoute allowedRoles={['advertiser']}>
      <MainLayout role="advertiser">
        <AdvertiserDashboardPage />
      </MainLayout>
    </ProtectedRoute>
  }
>
  <Route path="dashboard" element={<AdvertiserDashboardPage />} />
  <Route path="campaigns" element={<CampaignListPage />} />
  <Route path="campaigns/create" element={<CampaignCreatePage />} />
  <Route path="campaigns/:id" element={<CampaignDetailPage />} />
  <Route path="kols" element={<KolDiscoveryPage />} />
</Route>
```

---

## 11. 待办事项

### 11.1 功能完善

- [ ] 活动编辑功能
- [ ] 活动提交功能
- [ ] 活动暂停/恢复功能
- [ ] 充值功能
- [ ] 交易记录页面
- [ ] 数据分析页面（集成图表库）
- [ ] 订单管理功能
- [ ] 消息通知功能

### 11.2 优化建议

- [ ] 集成图表库（Recharts / Chart.js）
- [ ] 实现文件上传功能
- [ ] 添加数据导出功能
- [ ] 实现批量操作功能
- [ ] 添加快捷键支持
- [ ] 优化移动端体验
- [ ] 添加 PWA 支持

### 11.3 测试

- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 性能测试

---

## 12. 相关文件

- [API 规范](./API_SPEC.md)
- [广告主模块](./ADVERTISER_MODULE.md)
- [前端代码](../src/frontend/src/pages/advertiser/)
- [类型定义](../src/frontend/src/types/index.ts)

---

## 13. 开发说明

### 13.1 开发环境运行

```bash
cd src/frontend
npm install
npm run dev
```

### 13.2 构建

```bash
npm run build
```

### 13.3 测试

```bash
npm run test
npm run test:run
npm run test:coverage
```

---

**文档结束**
