# AIAds 阿里云部署指南

**部署时间**: 2026-03-25  
**目标服务器**: 阿里云轻量应用服务器  
**域名**: 待配置

---

## 📋 部署前准备

### 1. 服务器信息

请在下方填写您的服务器信息：

```
公网 IP: _____________________
SSH 端口：22（默认）
SSH 用户：root
SSH 密码：_____________________
域名：_____________________
```

### 2. 域名解析

登录阿里云控制台，将域名解析到服务器 IP：

```
记录类型：A
主机记录：@（或 www）
记录值：[您的服务器 IP]
TTL: 600
```

---

## 🚀 部署步骤

### 步骤 1: 连接服务器

```bash
# macOS/Linux
ssh root@您的服务器 IP

# Windows (使用 PowerShell)
ssh root@您的服务器 IP
```

### 步骤 2: 安装必要软件

```bash
# 更新系统
yum update -y

# 安装 Node.js 20.x
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 安装 Nginx
yum install -y nginx

# 安装 Git
yum install -y git

# 安装 PM2 (进程管理)
npm install -g pm2

# 验证安装
node -v
npm -v
nginx -v
```

### 步骤 3: 上传项目代码

**方法 A: 使用 Git**

```bash
# 在服务器上
cd /var/www
git clone [您的 Git 仓库地址] aiads
cd aiads
```

**方法 B: 使用 SCP 上传**

```bash
# 在本地电脑上
cd /Users/surferboy/.openclaw/workspace/AIAds
tar -czf aiads.tar.gz --exclude node_modules --exclude dist .
scp aiads.tar.gz root@您的服务器 IP:/tmp/

# 在服务器上
mkdir -p /var/www/aiads
tar -xzf /tmp/aiads.tar.gz -C /var/www/aiads
cd /var/www/aiads
```

### 步骤 4: 安装依赖

```bash
cd /var/www/aiads

# 安装后端依赖
cd src/backend
npm install

# 安装前端依赖
cd ../frontend
npm install

# 构建前端
npm run build
```

### 步骤 5: 配置环境变量

```bash
# 创建环境变量文件
cd /var/www/aiads/src/backend
cp .env.example .env

# 编辑环境变量
vi .env
```

**.env 文件内容**:

```env
# 服务器配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 数据库配置 (Supabase PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/aiads"

# Redis 配置 (可选)
REDIS_URL="redis://localhost:6379"

# JWT 配置
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"

# 文件存储 (阿里云 OSS)
OSS_BUCKET="aiads-files"
OSS_REGION="oss-cn-hangzhou"
OSS_ACCESS_KEY="your-access-key"
OSS_SECRET_KEY="your-secret-key"

# 邮件配置
SMTP_HOST="smtp.qq.com"
SMTP_PORT=465
SMTP_USER="noreply@aiads.com"
SMTP_PASS="your-smtp-password"

# 域名配置
DOMAIN="https://您的域名.com"
ADMIN_URL="https://您的域名.com/admin"
```

### 步骤 6: 数据库迁移

```bash
cd /var/www/aiads/src/backend

# 初始化数据库
npx prisma migrate deploy
npx prisma generate

# 创建初始管理员
node scripts/create-admin.js
```

### 步骤 7: 配置 PM2

```bash
cd /var/www/aiads/src/backend

# 创建 PM2 配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aiads-backend',
    script: 'dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 启动服务
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 8: 配置 Nginx

```bash
# 创建 Nginx 配置文件
cat > /etc/nginx/conf.d/aiads.conf << 'EOF'
server {
    listen 80;
    server_name 您的域名.com www.您的域名.com;
    
    # 前端静态文件
    location / {
        root /var/www/aiads/src/frontend/dist;
        try_files $uri $uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 静态资源
    location /assets/ {
        root /var/www/aiads/src/frontend/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 日志
    access_log /var/log/nginx/aiads-access.log;
    error_log /var/log/nginx/aiads-error.log;
}
EOF

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx
```

### 步骤 9: 配置 SSL 证书（推荐）

```bash
# 安装 Certbot
yum install -y certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 您的域名.com -d www.您的域名.com

# 自动续期
crontab -e
# 添加：0 3 * * * certbot renew --quiet
```

### 步骤 10: 配置防火墙

```bash
# 阿里云控制台操作：
# 1. 登录阿里云控制台
# 2. 进入轻量应用服务器
# 3. 点击"防火墙"
# 4. 添加规则：
#    - HTTP (80)
#    - HTTPS (443)
#    - SSH (22)
```

---

## 📝 部署验证

### 检查服务状态

```bash
# 检查 PM2 进程
pm2 status

# 检查 Nginx 状态
systemctl status nginx

# 查看日志
pm2 logs aiads-backend
tail -f /var/log/nginx/aiads-access.log
```

### 访问测试

打开浏览器访问：
- http://您的域名.com
- https://您的域名.com（SSL 配置后）

测试以下页面：
- 登录中心：http://您的域名.com/index.html
- 管理后台：http://您的域名.com/admin-pro.html
- 广告主登录：http://您的域名.com/advertiser-login.html
- KOL 登录：http://您的域名.com/kol-login.html

---

## 🔧 常用命令

### 服务管理

```bash
# 重启后端
pm2 restart aiads-backend

# 停止后端
pm2 stop aiads-backend

# 重启 Nginx
systemctl restart nginx

# 查看日志
pm2 logs
```

### 代码更新

```bash
cd /var/www/aiads

# 拉取最新代码
git pull

# 安装依赖
cd src/backend && npm install
cd ../frontend && npm install

# 重新构建前端
cd src/frontend && npm run build

# 重启服务
cd ../backend
pm2 restart aiads-backend
```

---

## 📊 服务器推荐配置

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|---------|
| CPU | 1 核 | 2 核 |
| 内存 | 1GB | 2GB |
| 硬盘 | 20GB | 40GB |
| 带宽 | 1Mbps | 3Mbps+ |

---

## ⚠️ 注意事项

1. **安全组配置**: 确保阿里云控制台开放了 80/443 端口
2. **数据库备份**: 定期备份 Supabase 数据库
3. **日志轮转**: 配置日志自动清理
4. **监控告警**: 配置服务器监控和告警
5. **定期更新**: 定期更新系统和依赖包

---

## 📞 技术支持

如遇到问题，请检查：
1. 服务器日志：`/var/log/nginx/`
2. PM2 日志：`pm2 logs`
3. 后端日志：`/var/www/aiads/src/backend/logs/`

---

**部署完成时间**: _______________  
**部署人员**: _______________  
**验收人员**: _______________
