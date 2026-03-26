# AIAds 快速部署指南

**创建时间**: 2026-03-25  
**部署方式**: 一键脚本部署

---

## 🚀 方式一：一键脚本部署（推荐）

### 1. 运行部署脚本

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds
./deploy-to-aliyun.sh
```

### 2. 按提示输入

脚本会提示您输入：
- 阿里云服务器公网 IP
- SSH 端口（默认 22）
- SSH 用户（默认 root）

### 3. 等待部署完成

脚本会自动完成：
- ✅ 上传代码
- ✅ 安装 Node.js
- ✅ 安装 Nginx
- ✅ 安装依赖
- ✅ 构建前端
- ✅ 配置 PM2
- ✅ 配置 Nginx
- ✅ 启动服务

---

## 📋 方式二：手动部署

详细步骤请查看：`DEPLOYMENT.md`

---

## 🔧 部署后配置

### 1. 配置环境变量

```bash
# SSH 登录服务器
ssh root@您的服务器 IP

# 编辑环境变量
vi /var/www/aiads/src/backend/.env
```

**.env 文件内容**:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="postgresql://user:password@host:5432/aiads"
JWT_SECRET="your-super-secret-key"
DOMAIN="https://您的域名.com"
```

### 2. 配置域名（阿里云控制台）

1. 登录 [阿里云控制台](https://homenew.console.aliyun.com/)
2. 进入 **域名控制台**
3. 点击您的域名
4. 添加解析记录：
   - 记录类型：A
   - 主机记录：@
   - 记录值：您的服务器 IP
   - TTL: 600

### 3. 配置防火墙（阿里云控制台）

1. 进入 **轻量应用服务器控制台**
2. 点击您的服务器
3. 点击 **防火墙**
4. 添加规则：
   - HTTP (80) ✅
   - HTTPS (443) ✅
   - SSH (22) ✅

### 4. 配置 SSL 证书（推荐）

```bash
# 登录服务器
ssh root@您的服务器 IP

# 安装 Certbot
yum install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 您的域名.com -d www.您的域名.com

# 自动续期
crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

---

## ✅ 验证部署

### 访问测试

打开浏览器访问：

| 页面 | 地址 |
|------|------|
| 登录中心 | http://您的域名.com/index.html |
| 管理后台 | http://您的域名.com/admin-pro.html |
| 广告主登录 | http://您的域名.com/advertiser-login.html |
| KOL 登录 | http://您的域名.com/kol-login.html |

### 测试账号

| 角色 | 账号 | 密码 |
|------|------|------|
| 管理员 | admin | admin123 |
| 广告主 | advertiser@aiads.com | password123 |
| KOL | @fashion_guru | password123 |

---

## 🔍 故障排查

### 查看服务状态

```bash
# SSH 登录服务器
ssh root@您的服务器 IP

# 查看 PM2 进程
pm2 status

# 查看 PM2 日志
pm2 logs

# 查看 Nginx 状态
systemctl status nginx

# 查看 Nginx 日志
tail -f /var/log/nginx/aiads-access.log
tail -f /var/log/nginx/aiads-error.log
```

### 重启服务

```bash
# 重启后端
pm2 restart aiads-backend

# 重启 Nginx
systemctl restart nginx
```

### 常见问题

**1. 页面无法访问**
- 检查防火墙是否开放 80 端口
- 检查 Nginx 是否运行：`systemctl status nginx`

**2. API 请求失败**
- 检查后端是否运行：`pm2 status`
- 检查后端日志：`pm2 logs`

**3. 域名无法解析**
- 等待 DNS 生效（通常 5-10 分钟）
- 检查域名解析配置

---

## 📊 服务器推荐配置

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| CPU | 1 核 | 2 核 |
| 内存 | 1GB | 2GB |
| 硬盘 | 20GB | 40GB |
| 带宽 | 1Mbps | 3Mbps+ |
| 系统 | CentOS 7+ | CentOS 8+ |

---

## 📞 技术支持

如遇到问题，请提供：
1. 服务器 IP（隐藏部分数字）
2. 错误日志
3. 问题描述

---

**部署完成日期**: _______________  
**部署人员**: _______________  
**验收结果**: □ 成功 □ 失败
