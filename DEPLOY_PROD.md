# AIAds 正式发布说明

本文档对应当前已验证可用的阿里云生产发布方案。

## 当前生产架构

- 服务器：`admin@47.239.7.62`
- 代码发布目录：`/opt/aiads-releases/<timestamp>`
- 当前代码软链：`/opt/aiads-current`
- 前端静态目录：`/var/www/aiads/releases/<timestamp>`
- 前端 current 软链：`/var/www/aiads/current`
- Nginx 站点配置：`/etc/nginx/conf.d/aiads.conf`
- 后端进程：`pm2` 的 `aiads-api`
- 后端端口：`3001`
- 生产环境文件：`/opt/aiads/src/backend/.env.production`
- Git 仓库：`https://github.com/AIseek2025/AIAds.git`

## 首次安装发布脚本

在本地仓库根目录执行：

```bash
scp "scripts/deploy-prod-aliyun.sh" admin@47.239.7.62:/tmp/aiads-deploy-prod.sh
ssh admin@47.239.7.62 "sudo mkdir -p /opt/aiads/bin && sudo install -m 755 /tmp/aiads-deploy-prod.sh /opt/aiads/bin/deploy-prod-aliyun.sh"
```

安装后，服务器上固定入口为：

```bash
/opt/aiads/bin/deploy-prod-aliyun.sh
```

## 标准发布流程

1. 本地完成开发、测试、提交并推送到 `GitHub`
2. SSH 登录服务器
3. 执行发布脚本，传入分支名、tag 或 commit

示例：

```bash
ssh admin@47.239.7.62
bash /opt/aiads/bin/deploy-prod-aliyun.sh main
```

按 commit 精确发布：

```bash
bash /opt/aiads/bin/deploy-prod-aliyun.sh 71983b8
```

## 脚本做了什么

- 从 `GitHub` 拉取指定版本到新的 release 目录
- 复制现有 `.env.production` 到新 release
- 在新 release 内执行后端 `npm ci`、`prisma generate`、`npm run build`
- 对生产库执行 `prisma db push`
- 在新 release 内执行前端 `npm ci --include=dev`、`npm run build`
- 将前端静态文件发布到新的静态 release 目录
- 更新 `/var/www/aiads/current` 软链
- 重启 `pm2` 里的 `aiads-api`
- 做本机和公网健康检查
- 清理旧 release，默认保留最近 `5` 个

## 常用命令

查看当前线上版本：

```bash
readlink /opt/aiads-current
pm2 status aiads-api
```

检查健康状态：

```bash
curl -fsSL https://aiads.fun/api/v1/health
curl -I https://aiads.fun
```

查看日志：

```bash
pm2 logs aiads-api --lines 200
```

## 最近上线记录

### 2026-03-27

- 发布 commit：`00ba403`
- 发布命令：`bash /opt/aiads/bin/deploy-prod-aliyun.sh 00ba403`
- 发布后代码目录：`/opt/aiads-releases/20260327-043400`
- 当前代码软链：`/opt/aiads-current -> /opt/aiads-releases/20260327-043400`
- 发布结果：成功

本次发布内容：

- 修复首页白屏问题，恢复路由懒加载兜底组件
- 清理前端管理台存量 `build:check` TypeScript 报错
- 发布前已完成本地 `npm run build:check` 验证

发布后验收：

- `https://aiads.fun/api/v1/health` 返回成功
- `https://aiads.fun/` 返回 `HTTP 200`
- 首页截图验收通过，页面正常显示 `AIAds` 品牌、欢迎回来、邮箱/密码输入框、登录按钮、Google 登录按钮和注册链接
- 本次发布仅切换 AIAds release 与 `pm2` 进程，未改动其他项目配置

## 回滚

先查看可回滚版本：

```bash
ls -1dt /opt/aiads-releases/*
```

然后直接发布旧版本目录对应的 commit，或者重新指定旧 commit：

```bash
bash /opt/aiads/bin/deploy-prod-aliyun.sh <old-commit>
```

如果只需要临时把代码软链切回旧版本，可先手工确认后端和静态目录都存在，再执行发布脚本完成正式回滚。

## 注意事项

- 脚本依赖：`git`、`node`、`npm`、`pm2`、`sudo`
- 脚本默认从 `/opt/aiads/src/backend/.env.production` 复制环境文件
- 如环境文件迁移了位置，发布前设置 `AIADS_ENV_SOURCE`
- 当前 Nginx 已固定代理 `/api/` 到 `127.0.0.1:3001`，不要再改成 `3000`
- 前端发布时必须保留 `vite.config.ts` 中的 `base: '/'`
- 生产库当前使用 `prisma db push`，后续如果补齐正式 migration，可把脚本中的这一步替换为 `prisma migrate deploy`

## 可选环境变量

```bash
AIADS_REPO_URL=https://github.com/AIseek2025/AIAds.git
AIADS_RELEASES_DIR=/opt/aiads-releases
AIADS_CURRENT_LINK=/opt/aiads-current
AIADS_STATIC_ROOT=/var/www/aiads/releases
AIADS_STATIC_LINK=/var/www/aiads/current
AIADS_ENV_SOURCE=/opt/aiads/src/backend/.env.production
AIADS_PM2_NAME=aiads-api
AIADS_KEEP_RELEASES=5
VITE_API_URL=https://aiads.fun/api/v1
```
