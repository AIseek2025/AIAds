# AIAds 合规检查清单

**版本**: 1.0
**创建日期**: 2026 年 3 月 24 日
**适用法规**: GDPR, CCPA, 网络安全法
**审核周期**: 季度

---

## 1. GDPR（通用数据保护条例）合规

### 1.1 适用范围检查

- [ ] 是否处理欧盟公民个人数据
- [ ] 是否监控欧盟用户行为
- [ ] 是否在欧盟境内有业务

**AIAds 评估**: ⚠️ 需要确认
- 平台面向全球用户，可能处理欧盟公民数据
- 需要 GDPR 合规

---

### 1.2 合法性基础（Lawful Basis）

| 条款 | 要求 | 状态 | 证据 |
|-----|------|------|------|
| Art. 6(1)(a) | 用户同意 | ⚠️ 部分 | 注册时同意条款 |
| Art. 6(1)(b) | 合同履行 | ✅ 符合 | 服务条款 |
| Art. 6(1)(c) | 法律义务 | ✅ 符合 | 数据保留政策 |
| Art. 6(1)(d) | 切身利益 | ✅ 符合 | 安全措施 |
| Art. 6(1)(e) | 公共利益 | N/A | 不适用 |
| Art. 6(1)(f) | 合法利益 | ⚠️ 需评估 | 营销用途 |

**改进建议**:
- [ ] 明确每种数据处理活动的合法性基础
- [ ] 在隐私政策中说明合法性基础
- [ ] 对于营销用途，获取明确同意

---

### 1.3 同意管理（Consent）

| 要求 | 状态 | 实现情况 |
|-----|------|---------|
| 自由给予 | ⚠️ 部分 | 注册时强制同意 |
| 具体明确 | ⚠️ 部分 | 一揽子同意 |
| 知情同意 | ⚠️ 部分 | 隐私政策过长 |
| 明确肯定 | ❌ 缺失 | 无主动勾选 |
| 易于撤回 | ❌ 缺失 | 无撤回渠道 |

**改进建议**:
```typescript
// ✅ 改进同意管理
interface ConsentOptions {
  essential: boolean;      // 必需（不可拒绝）
  analytics: boolean;      // 分析（可选）
  marketing: boolean;      // 营销（可选）
  thirdParty: boolean;     // 第三方（可选）
}

// 分别获取同意
<Checkbox 
  label="我同意隐私政策（必需）"
  checked={consent.essential}
  disabled
/>
<Checkbox 
  label="我同意数据分析（可选）"
  checked={consent.analytics}
  onChange={...}
/>
```

**待办事项**:
- [ ] 实现同意管理平台（CMP）
- [ ] 提供细粒度同意选项
- [ ] 记录同意时间和内容
- [ ] 提供便捷的撤回渠道

---

### 1.4 数据主体权利（Data Subject Rights）

| 权利 | 条款 | 状态 | 实现情况 |
|-----|------|------|---------|
| 知情权 | Art. 15 | ⚠️ 部分 | 隐私政策说明 |
| 访问权 | Art. 15 | ❌ 缺失 | 无数据导出功能 |
| 更正权 | Art. 16 | ✅ 部分 | 可修改个人资料 |
| 删除权 | Art. 17 | ❌ 缺失 | 无账号删除功能 |
| 限制处理权 | Art. 18 | ❌ 缺失 | 未实现 |
| 数据可携权 | Art. 20 | ❌ 缺失 | 无数据导出 |
| 反对权 | Art. 21 | ❌ 缺失 | 未实现 |
| 自动决策权 | Art. 22 | ⚠️ 部分 | AI 推荐需说明 |

**改进建议**:

**实现数据访问接口**:
```typescript
// GET /api/v1/users/me/data
async getUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      advertiser: true,
      kol: true,
      campaigns: true,
      orders: true,
      transactions: true,
    },
  });
  
  return {
    format: 'json',
    downloadUrl: generateSignedUrl(user.id),
    expiresAt: new Date(Date.now() + 24 * 3600000),
  };
}
```

**实现删除账号接口**:
```typescript
// DELETE /api/v1/users/me
async deleteAccount(userId: string) {
  // 1. 检查是否有未完成订单
  const hasActiveOrders = await checkActiveOrders(userId);
  if (hasActiveOrders) {
    throw new Error('有未完成的订单，无法删除账号');
  }
  
  // 2. 软删除（GDPR 允许为法律义务保留数据）
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'deleted',
      deletedAt: new Date(),
      email: anonymize(userId),  // 匿名化邮箱
      phone: null,
      nickname: '已删除用户',
    },
  });
  
  // 3. 删除或匿名化相关数据
  await anonymizeRelatedData(userId);
}
```

**待办事项**:
- [ ] 实现数据导出功能（30 天内）
- [ ] 实现账号删除功能（30 天内）
- [ ] 提供数据更正接口
- [ ] 实现数据处理限制功能

---

### 1.5 数据最小化（Data Minimization）

| 要求 | 状态 | 评估 |
|-----|------|------|
| 充分性 | ⚠️ 部分 | 收集必要数据 |
| 相关性 | ⚠️ 部分 | 需审查字段 |
| 必要性 | ⚠️ 部分 | 部分数据可优化 |

**数据收集审查**:

```typescript
// 当前收集的数据
interface UserData {
  // ✅ 必要数据
  email: string;          // 登录和通知
  password: string;       // 认证
  role: string;           // 权限控制
  
  // ⚠️ 需评估
  phone: string;          // 可选？仅用于 MFA
  realName: string;       // 仅企业用户需要
  avatarUrl: string;      // 可选
  
  // ❌ 可能不必要
  // 审查 metadata 中的字段
}
```

**待办事项**:
- [ ] 审查每个数据字段的必要性
- [ ] 删除或匿名化不必要数据
- [ ] 实施数据保留期限

---

### 1.6 数据保留（Data Retention）

| 要求 | 状态 | 当前策略 |
|-----|------|---------|
| 保留期限 | ❌ 缺失 | 未定义 |
| 删除机制 | ❌ 缺失 | 仅软删除 |
| 定期审查 | ❌ 缺失 | 未实施 |

**改进建议**:

```typescript
// 数据保留策略
const retentionPolicies = {
  // 用户数据：账号删除后 30 天
  userData: { period: 30, unit: 'days' },
  
  // 交易数据：法律要求保留 7 年
  transactionData: { period: 7, unit: 'years' },
  
  // 日志数据：90 天
  logs: { period: 90, unit: 'days' },
  
  // 分析数据：1 年
  analytics: { period: 1, unit: 'year' },
};

// 定期清理任务
async function cleanupExpiredData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);
  
  // 删除 30 天前标记删除的用户
  await prisma.user.deleteMany({
    where: {
      status: 'deleted',
      deletedAt: { lt: cutoffDate },
    },
  });
}
```

**待办事项**:
- [ ] 制定数据保留政策
- [ ] 实现自动清理任务
- [ ] 记录数据处理活动

---

### 1.7 数据安全（Security of Processing）

| 要求 | 条款 | 状态 | 实现情况 |
|-----|------|------|---------|
| 加密 | Art. 32 | ✅ 符合 | bcrypt + HTTPS |
| 机密性 | Art. 32 | ✅ 符合 | 访问控制 |
| 完整性 | Art. 32 | ✅ 符合 | 数据验证 |
| 可用性 | Art. 32 | ⚠️ 部分 | 需完善备份 |
| 恢复能力 | Art. 32 | ⚠️ 部分 | 需应急预案 |
| 定期测试 | Art. 32 | ❌ 缺失 | 未实施 |

**待办事项**:
- [ ] 实施数据备份（每周）
- [ ] 制定应急预案
- [ ] 定期安全测试（每季度）
- [ ] 员工安全培训

---

### 1.8 数据泄露通知（Data Breach Notification）

| 要求 | 期限 | 状态 |
|-----|------|------|
| 监管机构 | 72 小时 | ❌ 缺失 |
| 数据主体 | 无不当延迟 | ❌ 缺失 |

**改进建议**:

```typescript
// 数据泄露响应流程
async function handleDataBreach(breach: DataBreach) {
  // 1. 评估泄露严重程度
  const severity = assessBreachSeverity(breach);
  
  // 2. 遏制泄露
  await containBreach(breach);
  
  // 3. 通知监管机构（72 小时内）
  if (severity === 'high') {
    await notifySupervisor({
      within: 72 * 3600000,  // 72 小时
      authority: 'relevant_DPA',
      details: breach.details,
    });
  }
  
  // 4. 通知受影响用户
  if (severity === 'high' || severity === 'medium') {
    await notifyUsers({
      users: breach.affectedUsers,
      template: 'data_breach_notification',
      details: breach.userDetails,
    });
  }
  
  // 5. 记录和报告
  await logBreach(breach);
}
```

**待办事项**:
- [ ] 制定数据泄露响应流程
- [ ] 准备通知模板
- [ ] 建立通知渠道
- [ ] 定期演练

---

### 1.9 跨境数据传输（International Transfers）

| 要求 | 状态 | 说明 |
|-----|------|------|
| 充分性决定 | ⚠️ 需确认 | 云服务提供商 |
| 适当保障 | ⚠️ 需确认 | SCC 条款 |
| 克减情形 | N/A | 不适用 |

**AIAds 评估**:
- 数据库：Supabase（可能在美国）
- 前端：Vercel（全球 CDN）
- 后端：Railway（可能在美国）

**待办事项**:
- [ ] 确认数据存储服务位置
- [ ] 签署标准合同条款（SCC）
- [ ] 实施额外保障措施

---

### 1.10 问责制（Accountability）

| 要求 | 状态 | 证据 |
|-----|------|------|
| 处理记录 | ❌ 缺失 | 未记录 |
| DPO 任命 | ⚠️ 需确认 | 未指定 |
| DPIA | ❌ 缺失 | 未实施 |
| 设计保护 | ⚠️ 部分 | 部分实现 |
| 默认保护 | ⚠️ 部分 | 部分实现 |

**待办事项**:
- [ ] 指定数据保护官（DPO）
- [ ] 维护处理活动记录
- [ ] 实施数据保护影响评估（DPIA）
- [ ] 实施隐私设计（Privacy by Design）

---

## 2. CCPA（加州消费者隐私法案）合规

### 2.1 适用范围检查

- [ ] 年总收入超过 2500 万美元
- [ ] 处理 5 万以上加州消费者数据
- [ ] 50% 以上收入来自出售数据

**AIAds 评估**: ⚠️ 需要确认
- 如面向加州用户，可能适用
- 建议按 CCPA 标准实施

---

### 2.2 消费者权利

| 权利 | 要求 | 状态 |
|-----|------|------|
| 知情权 | 收集哪些数据 | ❌ 缺失 |
| 访问权 | 获取个人数据 | ❌ 缺失 |
| 删除权 | 删除个人数据 | ❌ 缺失 |
| 选择退出权 | 拒绝出售数据 | ❌ 缺失 |
| 不受歧视权 | 同等服务 | ✅ 符合 |

**改进建议**:

**实现"不出售我的个人信息"**:
```typescript
// GET /api/v1/users/me/do-not-sell
async optOutSale(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { doNotSellMyInfo: true },
  });
  
  // 停止向第三方提供数据
  await disableThirdPartySharing(userId);
}
```

**待办事项**:
- [ ] 实现数据访问接口（与 GDPR 共享）
- [ ] 实现删除接口（与 GDPR 共享）
- [ ] 添加"不出售我的信息"链接
- [ ] 更新隐私政策

---

### 2.3 通知要求

| 要求 | 状态 |
|-----|------|
| 收集时通知 | ⚠️ 部分 |
| 数据类别 | ⚠️ 部分 |
| 使用目的 | ⚠️ 部分 |
| 第三方共享 | ⚠️ 部分 |

**待办事项**:
- [ ] 在收集点提供通知
- [ ] 列出数据类别
- [ ] 说明使用目的
- [ ] 披露第三方共享

---

## 3. 网络安全法（中国）合规

### 3.1 适用范围检查

- [ ] 在中国境内运营
- [ ] 处理中国公民数据
- [ ] 关键信息基础设施

**AIAds 评估**: ⚠️ 需要确认
- 如在中国运营，需遵守网络安全法
- 可能需要数据本地化

---

### 3.2 网络安全等级保护

| 等级 | 要求 | 状态 |
|-----|------|------|
| 第一级 | 自主保护 | ✅ 可能符合 |
| 第二级 | 指导保护 | ⚠️ 需备案 |
| 第三级 | 监督保护 | ❌ 需改进 |
| 第四级 | 强制保护 | N/A |
| 第五级 | 专控保护 | N/A |

**待办事项**:
- [ ] 确定系统等级
- [ ] 进行等级保护测评
- [ ] 向公安机关备案

---

### 3.3 个人信息保护

| 要求 | 状态 | 实现情况 |
|-----|------|---------|
| 明示同意 | ❌ 缺失 | 需改进 |
| 目的明确 | ⚠️ 部分 | 隐私政策 |
| 最小必要 | ⚠️ 部分 | 需审查 |
| 安全保障 | ⚠️ 部分 | 基本措施 |
| 泄露通知 | ❌ 缺失 | 未实施 |

**待办事项**:
- [ ] 实现单独同意机制
- [ ] 制定隐私政策（中文）
- [ ] 实施数据分类分级
- [ ] 制定泄露应急预案

---

### 3.4 数据本地化

| 要求 | 适用 | 状态 |
|-----|------|------|
| 关键信息基础设施 | ⚠️ 需评估 | 待确认 |
| 个人信息出境 | ⚠️ 需评估 | 待确认 |
| 安全评估 | ⚠️ 需评估 | 待确认 |

**待办事项**:
- [ ] 评估是否属于关键信息基础设施
- [ ] 如数据出境，进行安全评估
- [ ] 考虑数据本地化存储

---

## 4. 合规实施计划

### 4.1 优先级矩阵

| 任务 | GDPR | CCPA | 网安法 | 优先级 | 工作量 |
|-----|------|------|-------|--------|-------|
| 隐私政策更新 | ✅ | ✅ | ✅ | 高 | 2 天 |
| 同意管理 | ✅ | ✅ | ✅ | 高 | 3 天 |
| 数据导出 | ✅ | ✅ | - | 高 | 2 天 |
| 账号删除 | ✅ | ✅ | ✅ | 高 | 2 天 |
| 数据保留政策 | ✅ | - | ✅ | 中 | 1 天 |
| 数据泄露流程 | ✅ | - | ✅ | 中 | 2 天 |
| 处理活动记录 | ✅ | - | - | 中 | 1 天 |
| DPIA | ✅ | - | - | 中 | 2 天 |
| DPO 任命 | ✅ | - | - | 低 | 0.5 天 |
| 等级保护备案 | - | - | ✅ | 高 | 5 天 |

### 4.2 时间表

```
第 1 周:
├── 更新隐私政策
├── 实现同意管理
└── 添加数据导出功能

第 2 周:
├── 实现账号删除
├── 制定数据保留政策
└── 制定泄露响应流程

第 3 周:
├── 维护处理活动记录
├── 实施 DPIA
└── 任命 DPO

第 4 周:
├── 等级保护测评
├── 公安机关备案
└── 员工培训
```

---

## 5. 合规文档清单

### 5.1 对外文档

- [ ] 隐私政策（Privacy Policy）
- [ ] 服务条款（Terms of Service）
- [ ] Cookie 政策（Cookie Policy）
- [ ] 数据主体权利说明
- [ ] 数据泄露通知模板

### 5.2 内部文档

- [ ] 数据处理活动记录（ROPA）
- [ ] 数据保护影响评估（DPIA）
- [ ] 数据泄露响应流程
- [ ] 数据保留政策
- [ ] 安全事件应急预案
- [ ] 员工数据保护培训材料

---

## 6. 合规声明

### 6.1 GDPR 合规声明

**截至 2026 年 3 月 24 日**:

AIAds 平台在 GDPR 合规方面:
- ✅ 基本安全措施已实施
- ⚠️ 数据主体权利功能待完善
- ⚠️ 同意管理需改进
- ❌ 数据保留政策缺失

**整体合规度**: 约 60%

### 6.2 CCPA 合规声明

**截至 2026 年 3 月 24 日**:

AIAds 平台在 CCPA 合规方面:
- ⚠️ 隐私政策需更新
- ❌ 消费者权利功能缺失
- ❌ "不出售"机制缺失

**整体合规度**: 约 40%

### 6.3 网络安全法合规声明

**截至 2026 年 3 月 24 日**:

AIAds 平台在网络安全法合规方面:
- ⚠️ 基本安全措施已实施
- ❌ 等级保护未备案
- ❌ 个人信息保护机制待完善

**整体合规度**: 约 50%

---

## 7. 联系信息

### 7.1 数据保护官（DPO）

**待任命**
- Email: dpo@aiads.com
- 电话：待提供

### 7.2 监管联系

- **欧盟**: 各成员国数据保护机构
- **美国加州**: California Privacy Protection Agency
- **中国**: 国家互联网信息办公室

---

*本清单应每季度审查更新，确保合规状态持续有效*
