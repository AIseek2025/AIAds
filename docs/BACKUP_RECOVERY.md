# AIAds 管理后台备份恢复文档

**版本**: 1.0.0
**创建日期**: 2026 年 3 月 25 日
**作者**: DevOps Team
**保密级别**: 内部机密

---

## 目录

1. [备份策略](#1-备份策略)
2. [数据库备份](#2-数据库备份)
3. [文件备份](#3-文件备份)
4. [配置备份](#4-配置备份)
5. [恢复流程](#5-恢复流程)
6. [灾备演练](#6-灾备演练)
7. [附录](#7-附录)

---

## 1. 备份策略

### 1.1 备份架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    AIAds Backup Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Production    │     │    Backup       │     │   Disaster      │
│   Environment   │────▶│    Storage      │────▶│   Recovery      │
│                 │     │                 │     │   Site          │
│ • Railway       │     │ • S3 Bucket     │     │ • Secondary     │
│ • Supabase      │     │ • Cloudflare R2 │     │   Region        │
│ • Upstash       │     │ • Glacier       │     │ • Cold Standby  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1.2 备份类型

| 备份类型 | 频率 | 保留期 | 存储位置 | RPO | RTO |
|---------|------|--------|---------|-----|-----|
| **全量备份** | 每天 | 30 天 | S3 Standard | 24h | 4h |
| **增量备份** | 每小时 | 7 天 | S3 Standard | 1h | 2h |
| **归档备份** | 每周 | 1 年 | S3 Glacier | 7d | 8h |
| **异地备份** | 每天 | 90 天 | 不同区域 S3 | 24h | 8h |

### 1.3 备份对象

| 对象 | 备份方式 | 频率 | 大小估算 |
|-----|---------|------|---------|
| PostgreSQL 数据库 | pg_dump | 每天 + 每小时 | 1-5GB |
| Redis 数据 | RDB 快照 | 每天 | 100-500MB |
| 文件存储 (R2) | 跨区域复制 | 实时 | 10-50GB |
| 环境变量 | 加密导出 | 每次变更 | <1KB |
| 代码版本 | Git Tag | 每次部署 | 100-500MB |
| 配置文件 | 版本控制 | 每次变更 | <1MB |

### 1.4 备份目标

| 指标 | 目标值 | 说明 |
|-----|-------|------|
| **RPO (恢复点目标)** | < 1 小时 | 最多丢失 1 小时数据 |
| **RTO (恢复时间目标)** | < 4 小时 | 4 小时内恢复服务 |
| **备份成功率** | > 99.9% | 备份任务成功率 |
| **恢复测试频率** | 每月 1 次 | 定期验证备份有效性 |

---

## 2. 数据库备份

### 2.1 Supabase 自动备份

#### 配置自动备份

1. 登录 Supabase Dashboard
2. 选择项目 → Database → Backups
3. 开启自动备份
4. 配置备份策略:

| 设置 | 值 | 说明 |
|-----|-----|------|
| 备份频率 | 每天 02:00 UTC | 低峰时段 |
| 保留期 | 30 天 | 默认保留 |
| 增量备份 | 每小时 | PITR 支持 |
| 跨区域复制 | 启用 | 灾难恢复 |

#### 手动备份

```bash
#!/bin/bash
# scripts/backup-database.sh

set -e

BACKUP_DIR="./backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql"

# 创建备份目录
mkdir -p ${BACKUP_DIR}

# 导出数据库
echo "📦 Starting database backup..."
pg_dump "$DATABASE_URL" > ${BACKUP_FILE}

# 压缩备份
echo "🗜️  Compressing backup..."
gzip ${BACKUP_FILE}

# 上传到 S3
echo "☁️  Uploading to S3..."
aws s3 cp ${BACKUP_FILE}.gz s3://aiads-backups/database/

# 清理本地备份
rm ${BACKUP_FILE}.gz

echo "✅ Database backup completed: backup_${TIMESTAMP}.sql.gz"
```

#### 备份验证

```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Usage: verify-backup.sh <backup-file>"
  exit 1
fi

echo "🔍 Verifying backup: ${BACKUP_FILE}"

# 解压并检查
gunzip -t ${BACKUP_FILE}
if [ $? -eq 0 ]; then
  echo "✅ Compression check passed"
else
  echo "❌ Compression check failed"
  exit 1
fi

# 检查 SQL 语法
gunzip -c ${BACKUP_FILE} | pg_restore --list > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ SQL syntax check passed"
else
  echo "❌ SQL syntax check failed"
  exit 1
fi

echo "✅ Backup verification completed"
```

### 2.2 备份脚本

#### 完整备份脚本

```bash
#!/bin/bash
# scripts/full-backup.sh

set -e

# 配置
BACKUP_BUCKET="aiads-backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ROOT="/tmp/aiads-backup-${TIMESTAMP}"

echo "🚀 Starting full backup at ${TIMESTAMP}"

# 创建临时目录
mkdir -p ${BACKUP_ROOT}/{database,redis,config}

# ========== 数据库备份 ==========
echo "📦 Backing up database..."
pg_dump "$DATABASE_URL" > ${BACKUP_ROOT}/database/full_backup.sql
gzip ${BACKUP_ROOT}/database/full_backup.sql

# 备份 Prisma 迁移记录
cp -r src/backend/prisma/migrations ${BACKUP_ROOT}/database/

# ========== Redis 备份 ==========
echo "📦 Backing up Redis..."
redis-cli -u "$REDIS_URL" BGSAVE
sleep 5  # 等待保存完成
redis-cli -u "$REDIS_URL" SAVE
# 注意：Upstash 不支持直接下载 RDB，使用导出命令
redis-cli -u "$REDIS_URL" KEYS '*' > ${BACKUP_ROOT}/redis/keys.txt

# ========== 配置文件备份 ==========
echo "📦 Backing up configurations..."

# Railway 环境变量
railway variables export > ${BACKUP_ROOT}/config/railway_vars.json 2>/dev/null || true

# Vercel 环境变量
vercel env ls > ${BACKUP_ROOT}/config/vercel_env.txt 2>/dev/null || true

# 代码版本
git rev-parse HEAD > ${BACKUP_ROOT}/config/git_commit.txt
git tag --points-at HEAD > ${BACKUP_ROOT}/config/git_tags.txt

# ========== 上传到云存储 ==========
echo "☁️  Uploading backups to S3..."

# 数据库备份
aws s3 cp ${BACKUP_ROOT}/database/ s3://${BACKUP_BUCKET}/database/${TIMESTAMP}/ --recursive

# Redis 备份
aws s3 cp ${BACKUP_ROOT}/redis/ s3://${BACKUP_BUCKET}/redis/${TIMESTAMP}/ --recursive

# 配置备份
aws s3 cp ${BACKUP_ROOT}/config/ s3://${BACKUP_BUCKET}/config/${TIMESTAMP}/ --recursive

# ========== 清理旧备份 ==========
echo "🧹 Cleaning up old backups..."
aws s3 ls s3://${BACKUP_BUCKET}/database/ | while read -r line; do
  file_date=$(echo $line | awk '{print $1}')
  if [[ $(date -d "$file_date" +%s) -lt $(date -d "-${RETENTION_DAYS} days" +%s) ]]; then
    aws s3 rm s3://${BACKUP_BUCKET}/database/${file_date}/ --recursive
    echo "Deleted old backup: ${file_date}"
  fi
done

# ========== 清理临时文件 ==========
rm -rf ${BACKUP_ROOT}

echo "✅ Full backup completed successfully"
```

### 2.3 备份监控

#### 备份状态检查

```bash
#!/bin/bash
# scripts/check-backup-status.sh

echo "📊 Backup Status Report"
echo "======================"
echo ""

# 检查最新数据库备份
LATEST_BACKUP=$(aws s3 ls s3://aiads-backups/database/ | tail -1)
BACKUP_DATE=$(echo $LATEST_BACKUP | awk '{print $1}')

echo "Latest Database Backup: ${BACKUP_DATE}"

# 计算备份年龄
BACKUP_AGE=$(( ($(date +%s) - $(date -d "$BACKUP_DATE" +%s)) / 3600 ))
echo "Backup Age: ${BACKUP_AGE} hours"

if [ $BACKUP_AGE -gt 24 ]; then
  echo "⚠️  WARNING: Backup is older than 24 hours!"
  exit 1
fi

echo "✅ Backup status is healthy"
```

---

## 3. 文件备份

### 3.1 Cloudflare R2 备份

#### 跨区域复制配置

1. 登录 Cloudflare Dashboard
2. 选择 R2 → Buckets
3. 选择 `aiads-storage` bucket
4. 配置 Replication:

```json
{
  "replication": {
    "enabled": true,
    "destination": {
      "bucket": "aiads-storage-backup",
      "region": "us-west-2"
    },
    "rules": [
      {
        "prefix": "avatars/",
        "enabled": true
      },
      {
        "prefix": "documents/",
        "enabled": true
      },
      {
        "prefix": "videos/",
        "enabled": true
      }
    ]
  }
}
```

#### 版本控制

```bash
# 启用版本控制
aws s3api put-bucket-versioning \
  --bucket aiads-storage \
  --versioning-configuration Status=Enabled

# 查看版本状态
aws s3api get-bucket-versioning --bucket aiads-storage
```

### 3.2 文件恢复

```bash
#!/bin/bash
# scripts/restore-files.sh

BUCKET="aiads-backups"
SOURCE_PATH=$1
DEST_PATH=$2

if [ -z "$SOURCE_PATH" ] || [ -z "$DEST_PATH" ]; then
  echo "❌ Usage: restore-files.sh <s3-source-path> <local-dest-path>"
  exit 1
fi

echo "📥 Restoring files from ${SOURCE_PATH} to ${DEST_PATH}"

# 下载文件
aws s3 cp s3://${BUCKET}/${SOURCE_PATH} ${DEST_PATH} --recursive

if [ $? -eq 0 ]; then
  echo "✅ Files restored successfully"
else
  echo "❌ Failed to restore files"
  exit 1
fi
```

---

## 4. 配置备份

### 4.1 环境变量备份

```bash
#!/bin/bash
# scripts/backup-env.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/env/env_backup_${TIMESTAMP}.enc"

mkdir -p backups/env

# 导出 Railway 环境变量
railway variables export > /tmp/railway_vars.json

# 导出 Vercel 环境变量
vercel env ls > /tmp/vercel_env.txt

# 合并并加密
cat /tmp/railway_vars.json /tmp/vercel_env.txt | \
  age -r age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx > ${BACKUP_FILE}

# 上传到安全存储
aws s3 cp ${BACKUP_FILE} s3://aiads-backups/configs/encrypted/

# 清理
rm /tmp/railway_vars.json /tmp/vercel_env.txt

echo "✅ Environment backup completed: ${BACKUP_FILE}"
```

### 4.2 代码版本备份

```bash
#!/bin/bash
# scripts/backup-code.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TAG="backup-${TIMESTAMP}"
CURRENT_COMMIT=$(git rev-parse HEAD)

echo "📦 Creating code backup..."

# 创建备份标签
git tag -a ${BACKUP_TAG} -m "Automated backup tag"
git push origin ${BACKUP_TAG}

# 创建归档
git archive --format=tar.gz --prefix=aiads-${BACKUP_TAG}/ ${BACKUP_TAG} > \
  /tmp/aiads-${BACKUP_TAG}.tar.gz

# 上传到 S3
aws s3 cp /tmp/aiads-${BACKUP_TAG}.tar.gz s3://aiads-backups/code/

# 清理
rm /tmp/aiads-${BACKUP_TAG}.tar.gz

echo "✅ Code backup completed: ${BACKUP_TAG}"
echo "   Commit: ${CURRENT_COMMIT}"
```

---

## 5. 恢复流程

### 5.1 数据库恢复

#### 完整恢复

```bash
#!/bin/bash
# scripts/restore-database-full.sh

set -e

BACKUP_FILE=$1
TARGET_DB=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$TARGET_DB" ]; then
  echo "❌ Usage: restore-database-full.sh <backup-file> <target-database-url>"
  exit 1
fi

echo "⚠️  WARNING: This will overwrite the target database!"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "❌ Aborted"
  exit 1
fi

# 下载备份 (如果是 S3 路径)
if [[ $BACKUP_FILE == s3://* ]]; then
  echo "📥 Downloading backup from S3..."
  aws s3 cp ${BACKUP_FILE} /tmp/restore_backup.sql.gz
  BACKUP_FILE="/tmp/restore_backup.sql.gz"
fi

# 解压
echo "🗜️  Decompressing backup..."
gunzip -f ${BACKUP_FILE}
SQL_FILE="${BACKUP_FILE%.gz}"

# 恢复数据库
echo "💾 Restoring database..."
psql "$TARGET_DB" < ${SQL_FILE}

# 验证恢复
echo "🔍 Verifying restoration..."
TABLE_COUNT=$(psql "$TARGET_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "Tables restored: ${TABLE_COUNT}"

# 清理
rm ${SQL_FILE}

echo "✅ Database restoration completed"
```

#### 时间点恢复 (PITR)

```bash
#!/bin/bash
# scripts/restore-database-pitr.sh

TARGET_TIME=$1
TARGET_DB=$2

if [ -z "$TARGET_TIME" ] || [ -z "$TARGET_DB" ]; then
  echo "❌ Usage: restore-database-pitr.sh <target-time> <target-database-url>"
  echo "   Example: restore-database-pitr.sh '2026-03-25 10:30:00' postgresql://..."
  exit 1
fi

echo "⚠️  Starting Point-in-Time Recovery to ${TARGET_TIME}"

# Supabase PITR 通过 Dashboard 操作
# 1. 进入 Supabase Dashboard
# 2. 选择项目 → Database → Backups
# 3. 选择 "Restore to point in time"
# 4. 输入目标时间
# 5. 确认恢复

echo "📋 Manual steps required:"
echo "1. Go to Supabase Dashboard"
echo "2. Navigate to Database → Backups"
echo "3. Click 'Restore to point in time'"
echo "4. Enter target time: ${TARGET_TIME}"
echo "5. Confirm restoration"

read -p "Press Enter when restoration is complete..."

# 验证恢复
echo "🔍 Verifying restoration..."
psql "$TARGET_DB" -c "SELECT NOW() as current_time;"
```

### 5.2 应用恢复

#### Railway 回滚

```bash
#!/bin/bash
# scripts/rollback-railway.sh

DEPLOYMENT_ID=$1

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "📋 Available deployments:"
  railway deployments
  echo ""
  echo "❌ Usage: rollback-railway.sh <deployment-id>"
  exit 1
fi

echo "🔄 Rolling back Railway to deployment: ${DEPLOYMENT_ID}"

railway rollback ${DEPLOYMENT_ID}

echo "✅ Railway rollback completed"
```

#### Vercel 回滚

```bash
#!/bin/bash
# scripts/rollback-vercel.sh

DEPLOYMENT_URL=$1

if [ -z "$DEPLOYMENT_URL" ]; then
  echo "📋 Available deployments:"
  vercel ls
  echo ""
  echo "❌ Usage: rollback-vercel.sh <deployment-url>"
  exit 1
fi

echo "🔄 Rolling back Vercel to deployment: ${DEPLOYMENT_URL}"

vercel rollback ${DEPLOYMENT_URL} --yes

echo "✅ Vercel rollback completed"
```

### 5.3 完整灾难恢复

```bash
#!/bin/bash
# scripts/disaster-recovery.sh

set -e

echo "🚨 DISASTER RECOVERY PROCEDURE"
echo "=============================="
echo ""

# 确认操作
echo "⚠️  WARNING: This will perform a full disaster recovery!"
read -p "Type 'DISASTER-RECOVERY' to confirm: " CONFIRM

if [ "$CONFIRM" != "DISASTER-RECOVERY" ]; then
  echo "❌ Aborted"
  exit 1
fi

# 步骤 1: 恢复数据库
echo ""
echo "📦 Step 1: Restoring database..."
LATEST_BACKUP=$(aws s3 ls s3://aiads-backups/database/ | tail -1 | awk '{print $4}')
./scripts/restore-database-full.sh "s3://aiads-backups/database/${LATEST_BACKUP}" "$NEW_DATABASE_URL"

# 步骤 2: 恢复环境变量
echo ""
echo "🔐 Step 2: Restoring environment variables..."
# 手动从加密备份恢复

# 步骤 3: 部署应用
echo ""
echo "🚀 Step 3: Deploying application..."
cd src/backend && npm install && npm run build
cd ../frontend && npm install && npm run build

# 步骤 4: 验证服务
echo ""
echo "🔍 Step 4: Verifying services..."
curl -f https://api.aiads.com/health || exit 1
curl -f https://admin.aiads.com/ || exit 1

echo ""
echo "✅ DISASTER RECOVERY COMPLETED SUCCESSFULLY"
```

---

## 6. 灾备演练

### 6.1 演练计划

| 演练类型 | 频率 | 参与人员 | 时长 |
|---------|------|---------|------|
| 桌面演练 | 每月 | 运维团队 | 2 小时 |
| 部分恢复 | 每季度 | 运维 + 开发 | 4 小时 |
| 完整恢复 | 每半年 | 全员 | 8 小时 |
| 异地切换 | 每年 | 全员 | 1 天 |

### 6.2 演练场景

#### 场景 1: 数据库故障

```markdown
## 场景描述
Supabase 数据库不可用，需要恢复到备用数据库。

## 演练步骤
1. 检测故障 (监控告警)
2. 评估影响 (业务中断)
3. 启动恢复流程
4. 从备份恢复数据
5. 切换应用到新数据库
6. 验证功能正常
7. 通知用户恢复

## 成功标准
- RTO < 4 小时
- RPO < 1 小时
- 数据完整性验证通过
```

#### 场景 2: 服务完全中断

```markdown
## 场景描述
Railway 和 Vercel 同时不可用，需要切换到灾备环境。

## 演练步骤
1. 确认主环境不可用
2. 启动灾备环境
3. 恢复最新备份
4. 切换 DNS 到灾备环境
5. 验证服务可用
6. 通知用户

## 成功标准
- RTO < 8 小时
- 核心功能可用
- 数据丢失 < 1 小时
```

### 6.3 演练报告模板

```markdown
# 灾备演练报告

## 基本信息
- 演练日期：2026-03-25
- 演练类型：季度部分恢复
- 参与人员：DevOps Team, Backend Team
- 演练场景：数据库故障恢复

## 演练过程

### 时间线
| 时间 | 事件 | 负责人 |
|-----|------|--------|
| 09:00 | 开始演练 | DevOps |
| 09:15 | 确认故障 | DevOps |
| 09:30 | 启动恢复 | DevOps |
| 10:30 | 数据库恢复完成 | Backend |
| 11:00 | 服务验证通过 | QA |
| 11:30 | 演练结束 | DevOps |

### 恢复指标
- RTO: 2 小时 (目标：4 小时) ✅
- RPO: 30 分钟 (目标：1 小时) ✅

## 发现问题
1. 备份下载速度较慢
2. 恢复脚本需要手动干预

## 改进措施
1. 优化备份存储位置
2. 自动化恢复流程
3. 增加恢复演练频率

## 结论
演练成功，恢复时间优于目标值。需要改进自动化程度。
```

---

## 7. 附录

### A. 备份检查清单

#### 每日检查

- [ ] 确认昨日备份完成
- [ ] 检查备份文件大小正常
- [ ] 验证备份上传成功

#### 每周检查

- [ ] 备份完整性验证
- [ ] 备份存储空间检查
- [ ] 备份日志审查

#### 每月检查

- [ ] 恢复测试执行
- [ ] 备份策略审查
- [ ] 备份成本分析

### B. 恢复检查清单

#### 恢复前

- [ ] 确认故障范围
- [ ] 选择合适的备份
- [ ] 通知相关人员
- [ ] 准备恢复环境

#### 恢复中

- [ ] 按步骤执行恢复
- [ ] 记录恢复过程
- [ ] 监控恢复进度

#### 恢复后

- [ ] 验证数据完整性
- [ ] 验证服务功能
- [ ] 通知用户恢复
- [ ] 编写恢复报告

### C. 联系人列表

| 角色 | 姓名 | 联系方式 | 备用联系 |
|-----|------|---------|---------|
| DevOps 负责人 | xxx | phone/email | slack |
| 后端负责人 | xxx | phone/email | slack |
| 数据库管理员 | xxx | phone/email | slack |
| 云服务商支持 | Supabase | support@supabase.com | 工单 |

### D. 相关文档

- [部署报告](./DEPLOYMENT_REPORT.md)
- [运维手册](./OPERATIONS_MANUAL.md)
- [监控配置](./MONITORING_SETUP.md)

### E. 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|-----|------|---------|------|
| 1.0.0 | 2026-03-25 | 初始版本 | DevOps Team |

---

**文档维护**: DevOps Team
**审核周期**: 每季度
**下次审核**: 2026-06-25

*最后更新：2026 年 3 月 25 日*
