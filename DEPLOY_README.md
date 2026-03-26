# AIAds 阿里云部署指南

**部署时间**: 2026-03-25
**目标服务器**: 阿里云轻量应用服务器
**服务器 IP**: 47.239.7.62
**部署网站**:
- aiads.fun (AIAds 平台) - 静态网站
- ainews.cool (AI 新闻) - Node.js + PM2
- bestgoods.vip (商品评测) - Node.js + systemd
- usking.vip (美股王) - Python/FastAPI + Docker

---

## 📋 部署前准备

### 1. 服务器信息

| 项目 | 值 |
|------|-----|
| 公网 IP | 47.239.7.62 |
| SSH 端口 | 22 |
| SSH 用户 | admin |
| 操作系统 | Alibaba Cloud Linux 3 |
| Docker | 26.1.3 |
| Docker Compose | v2.27.0 |
| Nginx | 1.20.1 |
| Node.js | v24.14.0 |
| Python | 3.6.8 (系统) / 3.12 (Docker) |
| 域名 | aiads.fun, ainews.cool, bestgoods.vip, usking.vip |

### 2. 本地环境要求

- macOS / Linux 终端
- SSH 客户端
- SCP 文件传输工具

---

## 🚀 完整部署步骤

### 步骤 1: 生成 SSH 密钥（本地 Mac）

```bash
# 在 Mac 本地终端执行
ssh-keygen -t rsa -b 4096
# 一直回车，密码留空
```

### 步骤 2: 查看 Mac 公钥

```bash
cat ~/.ssh/id_rsa.pub
```

复制输出的整行内容（从 `ssh-rsa` 开始）。

### 步骤 3: 添加公钥到阿里云服务器

1. 登录阿里云控制台：https://ecs.console.aliyun.com
2. 找到服务器 `47.239.7.62`
3. 点击 **远程连接** → **Workbench**
4. 在网页终端执行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-rsa AAAA... (粘贴 Mac 公钥)" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 步骤 4: 测试 SSH 连接（Mac 本地）

```bash
ssh admin@47.239.7.62
```

能成功登录后，继续下一步。

### 步骤 5: 上传项目文件

在 **Mac 本地终端** 执行：

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds
scp aiads-deploy.zip admin@47.239.7.62:/home/admin/
```

### 步骤 6: 登录服务器并解压

```bash
# SSH 登录服务器
ssh admin@47.239.7.62

# 解压项目
mkdir -p ~/aiads-deploy
unzip aiads-deploy.zip -d ~/aiads-deploy/

# 查看解压结果
ls -la ~/aiads-deploy/
```

### 步骤 7: 配置 Nginx（支持 HTTPS）

```bash
# 创建 Nginx 配置文件
cd ~

echo 'server {' > aiads-ssl.conf
echo '    listen 80;' >> aiads-ssl.conf
echo '    server_name aiads.fun www.aiads.fun;' >> aiads-ssl.conf
echo '    return 301 https://$server_name$request_uri;' >> aiads-ssl.conf
echo '}' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo 'server {' >> aiads-ssl.conf
echo '    listen 443 ssl http2;' >> aiads-ssl.conf
echo '    server_name aiads.fun www.aiads.fun;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    ssl_certificate /etc/letsencrypt/live/aiads.fun/fullchain.pem;' >> aiads-ssl.conf
echo '    ssl_certificate_key /etc/letsencrypt/live/aiads.fun/privkey.pem;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    ssl_protocols TLSv1.2 TLSv1.3;' >> aiads-ssl.conf
echo '    ssl_ciphers HIGH:!aNULL:!MD5;' >> aiads-ssl.conf
echo '    ssl_prefer_server_ciphers on;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    root /var/www/aiads;' >> aiads-ssl.conf
echo '    index index.html;' >> aiads-ssl.conf
echo '    location / {' >> aiads-ssl.conf
echo '        try_files $uri $uri/ /index.html;' >> aiads-ssl.conf
echo '    }' >> aiads-ssl.conf
echo '}' >> aiads-ssl.conf

# 复制配置到 Nginx 目录
sudo cp aiads-ssl.conf /etc/nginx/conf.d/aiads.conf

# 测试配置
sudo nginx -t
```

### 步骤 8: 复制网站文件到 Nginx 目录

```bash
# 创建网站目录
sudo mkdir -p /var/www/aiads

# 复制文件
sudo cp -r ~/aiads-deploy/* /var/www/aiads/

# 设置权限
sudo chmod -R o+r /var/www/aiads
```

### 步骤 9: 重启 Nginx

```bash
sudo systemctl restart nginx
sudo systemctl enable nginx
sudo systemctl status nginx
```

### 步骤 10: 配置域名 DNS 解析

登录 **阿里云控制台** → **域名管理** → `aiads.fun` → **解析设置** → **添加记录**：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 47.239.7.62 | 600 |
| A | www | 47.239.7.62 | 600 |

等待 1-5 分钟 DNS 生效。

### 步骤 11: 安装 SSL 证书（Certbot）

```bash
# 安装 Certbot
sudo yum install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d aiads.fun -d www.aiads.fun
```

按提示操作：
1. 输入邮箱地址（用于续期通知）
2. 输入 `A` 同意条款
3. 输入 `Y` 或 `N` 决定是否共享邮箱给 EFF

### 步骤 12: 更新 Nginx 配置使用 SSL 证书

Certbot 可能无法自动配置，需要手动更新：

```bash
# 重新创建配置（使用 Certbot 生成的证书路径）
cd ~

echo 'server {' > aiads-ssl.conf
echo '    listen 80;' >> aiads-ssl.conf
echo '    server_name aiads.fun www.aiads.fun;' >> aiads-ssl.conf
echo '    return 301 https://$server_name$request_uri;' >> aiads-ssl.conf
echo '}' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo 'server {' >> aiads-ssl.conf
echo '    listen 443 ssl http2;' >> aiads-ssl.conf
echo '    server_name aiads.fun www.aiads.fun;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    ssl_certificate /etc/letsencrypt/live/aiads.fun/fullchain.pem;' >> aiads-ssl.conf
echo '    ssl_certificate_key /etc/letsencrypt/live/aiads.fun/privkey.pem;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    ssl_protocols TLSv1.2 TLSv1.3;' >> aiads-ssl.conf
echo '    ssl_ciphers HIGH:!aNULL:!MD5;' >> aiads-ssl.conf
echo '    ssl_prefer_server_ciphers on;' >> aiads-ssl.conf
echo '' >> aiads-ssl.conf
echo '    root /var/www/aiads;' >> aiads-ssl.conf
echo '    index index.html;' >> aiads-ssl.conf
echo '    location / {' >> aiads-ssl.conf
echo '        try_files $uri $uri/ /index.html;' >> aiads-ssl.conf
echo '    }' >> aiads-ssl.conf
echo '}' >> aiads-ssl.conf

sudo cp aiads-ssl.conf /etc/nginx/conf.d/aiads.conf
sudo nginx -t && sudo systemctl restart nginx
```

### 步骤 13: 验证部署

```bash
# 测试 HTTP 跳转
curl -I http://aiads.fun

# 测试 HTTPS
curl -I https://aiads.fun

# 测试证书续期
sudo certbot renew --dry-run
```

### 步骤 14: 清理大文件

```bash
# 删除部署包节省空间
rm ~/aiads-deploy.zip
rm -rf ~/aiads-deploy/aiads-safe-deploy-*.tar.gz

# 查看磁盘空间
df -h
```

---

## ✅ 部署完成

### 访问地址

| 网站 | 协议 | 地址 | 状态 |
|------|------|------|------|
| AIAds | HTTPS | https://aiads.fun | ✅ |
| AIAds | HTTPS | https://www.aiads.fun | ✅ |
| Ainews | HTTPS | https://ainews.cool | ✅ |
| Ainews | HTTPS | https://www.ainews.cool | ✅ |
| BestGoods | HTTP | http://bestgoods.vip | ✅ |
| BestGoods | HTTP | http://www.bestgoods.vip | ✅ |
| BestGoods | HTTPS | https://bestgoods.vip | ✅ |
| BestGoods | HTTPS | https://www.bestgoods.vip | ✅ |

### AIAds 测试账号

| 角色 | 用户名/邮箱 | 密码 |
|------|-----------|------|
| 管理员 | `admin` | `admin123` |
| 广告主 | `advertiser@aiads.com` | `password123` |
| KOL | `@fashion_guru` | `password123` |

### SSL 证书信息

| 域名 | 有效期 | 证书路径 |
|------|--------|---------|
| aiads.fun | 90 天 | /etc/letsencrypt/live/aiads.fun/ |
| ainews.cool | 90 天 | /etc/letsencrypt/live/ainews.cool/ |
| bestgoods.vip | 90 天 | /etc/letsencrypt/live/bestgoods.vip/ |

**自动续期**: Certbot 已配置自动续期，会在到期前自动更新。

---

## ⚠️ 遇到的问题及解决方案

### 问题 1: SSH 无法连接 - Permission denied

**现象**:
```
admin@47.239.7.62: Permission denied (publickey,gssapi-keyex,gssapi-with-mic).
```

**原因**: Mac 本地的 SSH 公钥没有添加到服务器。

**解决方案**:
1. 在 Mac 上生成 SSH 密钥：`ssh-keygen -t rsa -b 4096`
2. 查看公钥：`cat ~/.ssh/id_rsa.pub`
3. 通过阿里云 Workbench 登录服务器
4. 将 Mac 公钥添加到 `~/.ssh/authorized_keys`

**注意**: 不要在服务器上生成密钥后直接在服务器上使用，需要在**本地 Mac**生成并添加到服务器。

---

### 问题 2: Nginx 配置文件语法错误

**现象**:
```
nginx: [emerg] unknown directive "6" in /etc/nginx/conf.d/aiads.conf:2
```

**原因**: 终端在每行前面自动添加了行号，导致配置文件格式错误。

**解决方案**:
使用 `echo` 逐行写入，避免 heredoc 语法：

```bash
echo 'server {' > aiads.conf
echo '    listen 80;' >> aiads.conf
echo '    server_name 47.239.7.62;' >> aiads.conf
# ... 继续添加其他行
sudo cp aiads.conf /etc/nginx/conf.d/aiads.conf
```

**避免使用**:
```bash
# 这种方式会在每行前添加行号
cat > file.conf << 'EOF'
server {
    listen 80;
}
EOF
```

---

### 问题 3: Nginx 403 Forbidden / Permission denied

**现象**:
```
HTTP/1.1 403 Forbidden
nginx 错误日志：stat() "/home/admin/aiads-deploy/index.html" failed (13: Permission denied)
```

**原因**: Nginx 运行在 `nginx` 用户下，无法读取 `/home/admin/` 目录。

**解决方案**:

方案 A - 修改目录权限：
```bash
sudo chmod o+x /home/admin
sudo chmod -R o+r /home/admin/aiads-deploy
```

方案 B - 复制到 Nginx 默认目录（推荐）：
```bash
sudo mkdir -p /var/www/aiads
sudo cp -r /home/admin/aiads-deploy/* /var/www/aiads/
# 修改 Nginx 配置 root 为 /var/www/aiads
```

---

### 问题 4: Certbot 无法自动安装证书

**现象**:
```
Could not install certificate
Could not automatically find a matching server block for aiads.fun
```

**原因**: Nginx 配置中的 `server_name` 指令与 Certbot 不匹配。

**解决方案**:
手动更新 Nginx 配置，使用 Certbot 生成的证书路径：

```bash
ssl_certificate /etc/letsencrypt/live/aiads.fun/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/aiads.fun/privkey.pem;
```

然后重启 Nginx：
```bash
sudo nginx -t && sudo systemctl restart nginx
```

---

### 问题 5: TypeScript 编译错误（169 个错误）

**现象**:
```
src/controllers/admin/finance.controller.ts:35:46 - error TS2339: Property 'getFinanceOverview' does not exist on type 'AdminFinanceService'.
...
Found 169 errors in 9 files.
```

**原因**: Prisma schema 和代码不匹配，部分方法未实现。

**临时解决方案**:
先部署静态版本，后端 API 服务后续修复。

**长期解决方案**:
1. 检查 Prisma schema 定义
2. 修复缺失的服务方法
3. 修复类型定义问题
4. 重新编译：`npm run build`

---

### 问题 6: HTTPS 证书域名不匹配

**现象**:
```
ERR_CERT_COMMON_NAME_INVALID
Attackers might be trying to steal your information from ainews.cool
```

**原因**: 该域名没有 SSL 证书或证书域名不匹配。

**解决方案**:
```bash
# 查看当前证书
sudo certbot certificates

# 为域名申请证书
sudo certbot --nginx -d ainews.cool -d www.ainews.cool

# 重启 Nginx
sudo systemctl restart nginx
```

**注意**: 同一服务器上部署多个 HTTPS 网站时，需要为每个域名单独申请证书。

---

### 问题 7: BestGoods 网站跳转到其他网站

**现象**:
访问 `http://www.bestgoods.vip` 跳转到其他网站（如 aiads.fun）。

**原因**: 
1. `bestgoods.conf` 被禁用（`.disabled` 后缀）
2. Nginx 默认服务器配置冲突

**解决方案**:
```bash
# 1. 启用 bestgoods 配置
sudo cp /etc/nginx/conf.d/bestgoods.conf.disabled /etc/nginx/conf.d/bestgoods.conf

# 2. 确保配置中有 default_server
# 编辑 /etc/nginx/conf.d/bestgoods.conf，确保第一行是：
# listen 80 default_server;

# 3. 启动后端服务（如果已停止）
sudo systemctl start bestgoods
sudo systemctl enable bestgoods

# 4. 重启 Nginx
sudo nginx -t && sudo systemctl restart nginx

# 5. 验证
curl -I http://www.bestgoods.vip
```

---

### 问题 8: HTTPS 访问显示错误的网站内容

**现象**:
访问 `https://www.bestgoods.vip` 显示的是 AIAds 的内容。

**原因**: 
`bestgoods.vip` 没有自己的 SSL 证书，HTTPS 请求被其他配置（如 aiads.conf）捕获。

**解决方案**:
```bash
# 1. 查看当前证书
sudo certbot certificates

# 2. 为 bestgoods 申请 SSL 证书
sudo certbot --nginx -d bestgoods.vip -d www.bestgoods.vip

# 3. 验证证书已安装
sudo certbot certificates

# 4. 重启 Nginx（如果 Certbot 没有自动重启）
sudo systemctl restart nginx

# 5. 验证 HTTPS 访问
curl -I https://www.bestgoods.vip
```

**注意**: 同一服务器上部署多个 HTTPS 网站时，每个域名都需要单独的 SSL 证书。

---

## 🔧 常用命令

### Nginx 管理

```bash
# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx

# 查看状态
sudo systemctl status nginx

# 查看日志
sudo tail -f /var/log/nginx/error.log
```

### SSL 证书管理

```bash
# 测试续期
sudo certbot renew --dry-run

# 手动续期
sudo certbot renew

# 查看证书信息
sudo certbot certificates
```

### 文件管理

```bash
# 查看磁盘空间
df -h

# 查看目录大小
du -sh /var/www/aiads

# 清理大文件
rm ~/aiads-deploy.zip
```

### 服务检查

```bash
# 查看端口监听
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 查看运行进程
ps aux | grep nginx
```

---

## 📊 服务器配置

| 配置项 | 值 |
|--------|-----|
| CPU | 2 核 |
| 内存 | 4GB |
| 硬盘 | 80GB |
| 带宽 | 5Mbps |
| 操作系统 | Alibaba Cloud Linux 3 |
| 部署网站 | 3 个 (aiads.fun, ainews.cool, bestgoods.vip) |

### 网站技术栈

| 网站 | 技术栈 | 端口 | 进程管理 |
|------|--------|------|---------|
| aiads.fun | 静态 HTML | 443 | Nginx |
| ainews.cool | Node.js | 443 | PM2 |
| bestgoods.vip | Node.js | 3100/443 | systemd |

---

## ⚡ 快速部署检查清单

### 基础部署
- [ ] 生成 SSH 密钥（本地 Mac）
- [ ] 添加公钥到服务器
- [ ] 测试 SSH 连接
- [ ] 上传项目文件
- [ ] 解压项目
- [ ] 创建 Nginx 配置
- [ ] 复制文件到 /var/www/aiads
- [ ] 配置 DNS 解析
- [ ] 安装 Certbot
- [ ] 获取 SSL 证书
- [ ] 更新 Nginx 配置使用 SSL
- [ ] 测试 HTTPS 访问
- [ ] 清理大文件

### 多网站部署
- [ ] 为每个域名配置 Nginx
- [ ] 为每个域名申请 SSL 证书
- [ ] 确保每个域名有独立的 server 配置
- [ ] 设置 default_server 避免冲突
- [ ] 启动后端服务（systemd 或 PM2）
- [ ] 测试所有网站的 HTTP 和 HTTPS 访问

### 验证清单
- [ ] https://aiads.fun/ ✅
- [ ] https://www.aiads.fun/ ✅
- [ ] https://ainews.cool/ ✅
- [ ] https://www.ainews.cool/ ✅
- [ ] http://bestgoods.vip/ ✅
- [ ] http://www.bestgoods.vip/ ✅
- [ ] https://bestgoods.vip/ ✅
- [ ] https://usking.vip/ ✅
- [ ] https://www.usking.vip/ ✅

---

## 📝 USKing (美股王) 部署指南

### 项目信息

| 项目 | 值 |
|------|-----|
| 项目名称 | USKing (美股王) |
| 项目类型 | Python FastAPI |
| 运行端口 | 8000 (Docker 内) / 8002 (宿主机) |
| 部署方式 | Docker Compose |
| 域名 | usking.vip, www.usking.vip |

### 部署步骤

#### 1. 打包项目文件（Mac 本地）

```bash
cd /Users/surferboy/.openclaw/workspace/USKing

# 打包项目（排除 .venv、.git 和大文件）
tar --exclude='.venv' --exclude='.git' --exclude='*.db' --exclude='__pycache__' -czf usking-deploy.tar.gz .

# 上传到服务器
scp usking-deploy.tar.gz admin@47.239.7.62:/tmp/
```

#### 2. 解压到服务器（SSH 终端）

```bash
# 解压到 /opt/usking
sudo tar -xzf /tmp/usking-deploy.tar.gz -C /opt/usking/

# 查看解压结果
ls -la /opt/usking/
```

#### 3. 配置环境变量

```bash
cd /opt/usking

# 复制环境配置
sudo cp .env.example .env

# 编辑 .env（确保以下配置正确）
# SECRET_KEY=76fa5f614cea549d560212af310fc1f4ed88cdcaf5f9444b58b3f9ff5ac6ed65
# DEV_MODE=false
# MEIGUWANG_ADMIN_PASSWORD=Admin@123456
# DATABASE_URL=sqlite:///./meiguwang.db
```

#### 4. 修改 Docker Compose 端口

```bash
cd /opt/usking

# 查看当前配置
cat docker-compose.prod.yml

# 修改端口（使用 vi 编辑器）
sudo vi docker-compose.prod.yml
# 将 ports: 下面的 "8000:8000" 改为 "8002:8000"

# 验证修改
cat docker-compose.prod.yml | grep ports -A1
```

#### 5. 构建并启动 Docker 容器

```bash
cd /opt/usking

# 停止旧容器（如果有）
sudo docker compose -f docker-compose.prod.yml down
sudo docker rm -f usking-web-1 2>/dev/null

# 启动容器
sudo docker compose -f docker-compose.prod.yml up -d --build

# 查看容器状态
sudo docker ps | grep usking

# 查看日志
sudo docker logs usking-web-1 | tail -20
```

#### 6. 配置 Nginx

```bash
cd ~

# 创建 Nginx 配置
echo 'server {' > usking.conf
echo '    listen 80;' >> usking.conf
echo '    server_name usking.vip www.usking.vip;' >> usking.conf
echo '    location / {' >> usking.conf
echo '        proxy_pass http://127.0.0.1:8002;' >> usking.conf
echo '        proxy_set_header Host $host;' >> usking.conf
echo '        proxy_set_header X-Real-IP $remote_addr;' >> usking.conf
echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> usking.conf
echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> usking.conf
echo '    }' >> usking.conf
echo '}' >> usking.conf

# 复制配置
sudo cp usking.conf /etc/nginx/conf.d/usking.conf

# 测试并重啟
sudo nginx -t && sudo systemctl restart nginx
```

#### 7. 申请/更新 SSL 证书

```bash
# 申请证书
sudo certbot --nginx -d usking.vip -d www.usking.vip

# 如果证书已存在，选择选项 1（重新安装现有证书）

# 验证证书
sudo certbot certificates
```

#### 8. 测试访问

```bash
# 测试 HTTP
curl http://usking.vip/ | head -30

# 测试 HTTPS
curl https://usking.vip/ | head -30
```

---

### USKing 遇到的问题及解决方案

#### 问题 1: 端口 8000 被占用

**现象**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use
```

**原因**: 服务器上的 ainews 项目已经占用了 8000 端口（Node.js 进程 PID 1017）。

**端口检查命令**:
```bash
# 查看所有占用端口
sudo netstat -tlnp

# 查看特定端口
sudo netstat -tlnp | grep :8000
sudo ss -tlnp | grep :8000
```

**解决方案**:
1. 修改 Docker Compose 配置，使用不同的端口（如 8002）：
```bash
# 编辑 docker-compose.prod.yml
sudo vi docker-compose.prod.yml

# 修改前：
ports:
  - "8000:8000"

# 修改后：
ports:
  - "8002:8000"
```

2. 更新 Nginx 配置：
```nginx
location / {
    proxy_pass http://127.0.0.1:8002;  # 改为新端口
    ...
}
```

3. 重启容器：
```bash
sudo docker compose -f docker-compose.prod.yml up -d
sudo netstat -tlnp | grep 8002  # 验证端口
```

---

#### 问题 2: Jinja2/Starlette 版本兼容性错误

**现象**:
```
TypeError: unhashable type: 'dict'
  File "/usr/local/lib/python3.12/site-packages/starlette/templating.py", line 148, in TemplateResponse
    template = self.get_template(name)
  File "/app/server/main.py", line 238, in index
    return templates.TemplateResponse("index.html", {"request": request})
```

**原因**: 新版 Starlette (0.33+) 的 `TemplateResponse` API 改变了参数顺序。

**解决方案**:

1. **修复代码** - 修改所有 `TemplateResponse` 调用：

```python
# 旧格式（错误）:
return templates.TemplateResponse("index.html", {"request": request})

# 新格式（正确）:
return templates.TemplateResponse(request, "index.html")
```

2. **批量修复命令**:
```bash
cd /opt/usking
sed -i 's/templates.TemplateResponse("\([^"]*\)", {"request": request})/templates.TemplateResponse(request, "\1")/g' server/main.py
```

3. **重新构建 Docker 镜像**（重要！代码在镜像里）:
```bash
sudo docker compose -f docker-compose.prod.yml build
sudo docker compose -f docker-compose.prod.yml up -d
```

4. **验证**:
```bash
sudo docker logs usking-web-1 | tail -20
curl https://usking.vip/ | head -30
```

**预期输出**: 应该返回 HTML 内容而不是错误。

---

#### 问题 3: Docker 容器内代码不同步

**现象**: 修改了 `/opt/usking/server/main.py` 但重启容器后错误依旧。

**原因**: Docker 镜像构建时复制了代码到镜像内，直接修改源文件不会影响运行中的容器。

**解决方案**:
每次修改代码后，必须重新构建镜像：
```bash
# 停止容器
sudo docker compose -f docker-compose.prod.yml down

# 重新构建
sudo docker compose -f docker-compose.prod.yml build

# 启动容器
sudo docker compose -f docker-compose.prod.yml up -d
```

---

#### 问题 4: 终端 heredoc 语法问题

**现象**:
```bash
cat > file.conf << 'EOF'
server {
    listen 80;
}
EOF
```
执行后每行前面会添加行号，导致配置文件语法错误。

**原因**: 某些终端环境下，heredoc 语法会被错误处理。

**解决方案**:
使用 `echo` 逐行写入：
```bash
echo 'server {' > file.conf
echo '    listen 80;' >> file.conf
echo '    server_name example.com;' >> file.conf
echo '}' >> file.conf
```

或者先创建脚本文件再执行。

---

#### 问题 5: sed 替换失败

**现象**:
```bash
sudo sed -i 's/8001:8000/8002:8000/g' docker-compose.prod.yml
cat docker-compose.prod.yml | grep ports -A1
# 输出仍然是 "8000:8000"
```

**原因**: sed 命令可能因为引号或特殊字符没有正确匹配。

**解决方案**:
1. 使用 vi 手动编辑：
```bash
sudo vi docker-compose.prod.yml
# 找到 ports: 部分，手动修改
```

2. 或者使用更精确的 sed 命令：
```bash
sudo sed -i 's/"8000:8000"/"8002:8000"/g' docker-compose.prod.yml
```

3. 验证修改：
```bash
cat docker-compose.prod.yml | grep ports -A1
```

---

#### 问题 6: Git 仓库未初始化

**现象**:
```bash
sudo git pull origin main
fatal: not a git repository (or any of the parent directories): .git
```

**原因**: 项目是通过 tar 打包上传的，没有 Git 仓库。

**解决方案**:

**方案 A - 重新打包上传（推荐）**:
```bash
# Mac 本地打包
cd /Users/surferboy/.openclaw/workspace/USKing
tar --exclude='.venv' --exclude='.git' --exclude='*.db' --exclude='__pycache__' -czf usking-deploy.tar.gz .
scp usking-deploy.tar.gz admin@47.239.7.62:/tmp/

# 服务器解压
cd /opt/usking
sudo docker compose -f docker-compose.prod.yml down
sudo rm -rf app server templates static views *.py *.txt *.yml Dockerfile
sudo tar -xzf /tmp/usking-deploy.tar.gz -C .
sudo docker compose -f docker-compose.prod.yml up -d --build
```

**方案 B - 初始化 Git 仓库**:
```bash
cd /opt/usking
sudo git init
sudo git remote add origin https://github.com/AIseek2025/USKing.git
sudo git fetch origin
sudo git reset --hard origin/main
sudo docker compose -f docker-compose.prod.yml up -d --build
```

---

#### 问题 7: 更新 GitHub 代码后部署失败

**现象**:
从 GitHub 拉取或上传新代码后，网站返回 500 错误：
```json
{"detail":"服务器内部错误，请稍后重试"}
```

**日志错误**:
```
TypeError: unhashable type: 'dict'
  File "/app/server/main.py", line 238, in index
    return templates.TemplateResponse("index.html", {"request": request})
```

**原因**: 
1. Starlette 0.33+ 版本改变了 `TemplateResponse` API 参数顺序
2. GitHub 代码使用旧格式：`TemplateResponse("xxx.html", {"request": request})`
3. 需要改为新格式：`TemplateResponse(request, "xxx.html")`

**解决方案**:

**步骤 1 - 在 Mac 本地修复代码**:
```bash
cd /Users/surferboy/.openclaw/workspace/USKing

# 批量修复 TemplateResponse 调用
# 将旧格式改为新格式
sed -i '' 's/templates\.TemplateResponse("\([^"]*\)", {"request": request})/templates.TemplateResponse(request, "\1")/g' server/main.py

# 验证修复（应该显示 request 参数在前）
grep -n "TemplateResponse" server/main.py | head -15

# 修复后示例：
# 238:    return templates.TemplateResponse(request, "index.html")
# 242:    return templates.TemplateResponse(request, "login.html")
```

**步骤 2 - 重新打包上传**:
```bash
# 打包项目（排除不必要的文件）
tar --exclude='.venv' --exclude='.git' --exclude='*.db' --exclude='__pycache__' -czf usking-deploy.tar.gz .

# 上传到服务器
scp usking-deploy.tar.gz admin@47.239.7.62:/tmp/
```

**步骤 3 - 在服务器上部署**:
```bash
# SSH 登录服务器
ssh admin@47.239.7.62

# 进入项目目录
cd /opt/usking

# 停止容器
sudo docker compose -f docker-compose.prod.yml down

# 清理旧代码
sudo rm -rf app server templates static views capture composer stream

# 解压新代码
sudo tar -xzf /tmp/usking-deploy.tar.gz -C .

# 检查端口配置（确保是 8002:8000）
cat docker-compose.prod.yml | grep ports -A1

# 如果端口不对，用 vi 修改
sudo vi docker-compose.prod.yml
# 找到 ports: 下面的 "8000:8000" 改为 "8002:8000"
# 按 :wq 保存退出

# 重新构建并启动
sudo docker compose -f docker-compose.prod.yml up -d --build

# 验证容器状态
sudo docker ps | grep usking

# 验证端口监听
sudo netstat -tlnp | grep 8002

# 测试访问
curl https://usking.vip/ | head -30
```

**预期输出**: 应该返回 HTML 内容，而不是错误 JSON。

**注意事项**:
1. **不要在终端直接输入 Python 代码** - 这会在 shell 中执行而不是编辑文件
2. **sed 命令在 Mac 和 Linux 上参数不同**:
   - Mac: `sed -i '' 's/old/new/g' file`
   - Linux: `sed -i 's/old/new/g' file`
3. **Docker 镜像构建后代码在镜像内** - 修改源文件后必须重新构建
4. **端口冲突** - 8000 端口被 ainews 占用，USKing 使用 8002

---

---

## 📞 技术支持

如遇到问题，请检查：
1. Nginx 日志：`/var/log/nginx/error.log`
2. Certbot 日志：`/var/log/letsencrypt/letsencrypt.log`
3. 系统日志：`journalctl -xe`
4. 服务状态：`systemctl status <服务名>` 或 `pm2 list`

---

## 🎊 部署总结

### 已部署网站

| 网站 | 域名 | 协议 | 技术栈 | 状态 |
|------|------|------|--------|------|
| AIAds 平台 | aiads.fun | HTTPS | 静态 HTML | ✅ |
| AI 新闻 | ainews.cool | HTTPS | Node.js + PM2 | ✅ |
| 商品评测 | bestgoods.vip | HTTP/HTTPS | Node.js + systemd | ✅ |
| 美股王 | usking.vip | HTTPS | Python/FastAPI + Docker | ✅ |

### SSL 证书

| 域名 | 有效期 | 自动续期 |
|------|--------|---------|
| aiads.fun | 90 天 | ✅ |
| ainews.cool | 90 天 | ✅ |
| bestgoods.vip | 90 天 | ✅ |
| usking.vip | 90 天 | ✅ |

- 所有域名均已配置 SSL 证书
- 证书有效期：90 天
- 自动续期：Certbot 已配置

### 服务器资源使用

| 项目 | 域名 | 端口 | 协议 | 进程管理 | 状态 |
|------|------|------|------|---------|------|
| **Nginx** | 所有域名 | 80/443 | HTTP/HTTPS | systemd | ✅ 运行中 |
| **ainews.cool** | ainews.cool | 8000 | HTTP | Node.js (PID 1017) | ✅ 运行中 |
| **bestgoods.vip** | bestgoods.vip | 3100 | HTTP | systemd (PID 52598) | ✅ 运行中 |
| **usking.vip** | usking.vip | 8002 | HTTP | Docker | ✅ 运行中 |
| **aliyun-backend** | - | 5001 | HTTP | Docker | ✅ 运行中 |
| **PostgreSQL** | - | 5432 | Database | Docker | ✅ 运行中 |
| **searxng** | - | 8080 | HTTP | Docker | ✅ 运行中 |
| **openclaw-gateway** | - | 13073/13076 | HTTP | 独立进程 | ✅ 运行中 |

### 端口分配总览

| 端口 | 项目 | 域名 | 说明 |
|------|------|------|------|
| **80** | Nginx | 所有 | HTTP 入口，自动跳转 HTTPS |
| **443** | Nginx | 所有 | HTTPS 入口 |
| **8000** | ainews.cool | ainews.cool | Node.js 应用 |
| **3100** | bestgoods.vip | bestgoods.vip | Node.js 应用 |
| **5001** | aliyun-backend | - | Docker 容器 |
| **5432** | PostgreSQL | - | 数据库 |
| **8002** | usking.vip | usking.vip | Python/FastAPI 应用 |
| **8080** | searxng | - | 搜索引擎 |
| **13073/13076** | openclaw-gateway | - | 网关服务 |

### 网站访问地址

| 网站 | HTTP 地址 | HTTPS 地址 | 状态 |
|------|----------|-----------|------|
| AIAds 平台 | http://aiads.fun | https://aiads.fun | ✅ |
| AI 新闻 | http://ainews.cool | https://ainews.cool | ✅ |
| 商品评测 | http://bestgoods.vip | https://bestgoods.vip | ✅ |
| 美股王 | http://usking.vip | https://usking.vip | ✅ |

### SSL 证书

| 域名 | 有效期 | 自动续期 |
|------|--------|---------|
| aiads.fun | 90 天 | ✅ |
| ainews.cool | 90 天 | ✅ |
| bestgoods.vip | 90 天 | ✅ |
| usking.vip | 90 天 | ✅ |

- 所有域名均已配置 SSL 证书
- 证书有效期：90 天
- 自动续期：Certbot 已配置

### 常用命令速查

```bash
# 查看所有网站证书
sudo certbot certificates

# 查看 Nginx 配置
ls -la /etc/nginx/conf.d/

# Nginx 管理
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl status nginx

# Docker 管理 (USKing)
sudo docker ps | grep usking
sudo docker logs usking-web-1
sudo docker stop usking-web
sudo docker rm usking-web

# USKing 一键部署
cd /opt/usking && ./deploy.sh

# PM2 管理 (Ainews)
pm2 list
pm2 restart ainews

# systemd 管理 (BestGoods)
sudo systemctl status bestgoods
sudo systemctl restart bestgoods

# 查看端口占用
sudo netstat -tlnp
sudo ss -tlnp
```

---

## 🔄 USKing 代码更新快速流程

### 前提条件
- 已在 Mac 本地修改并提交了代码到 GitHub
- 服务器已正常部署过 USKing

### 方法 A: 使用一键部署脚本（推荐）

```bash
# 在服务器上执行
cd /opt/usking && ./deploy.sh
```

### 方法 B: 手动更新

#### 1. Mac 本地修复并打包

```bash
cd /Users/surferboy/.openclaw/workspace/USKing

# 修复 TemplateResponse 兼容性（如果 GitHub 代码未修复）
sed -i '' 's/templates\.TemplateResponse("\([^"]*\)", {"request": request})/templates.TemplateResponse(request, "\1")/g' server/main.py

# 验证修复
grep -n "TemplateResponse" server/main.py | head -10

# 打包
tar --exclude='.venv' --exclude='.git' --exclude='*.db' --exclude='__pycache__' -czf usking-deploy.tar.gz .

# 上传
scp usking-deploy.tar.gz admin@47.239.7.62:/tmp/
```

#### 2. 服务器部署（Docker 方式）

```bash
# SSH 登录
ssh admin@47.239.7.62

# 进入目录
cd /opt/usking

# 停止旧容器
docker stop usking-web 2>/dev/null || true
docker rm usking-web 2>/dev/null || true

# 解压新代码
tar -xzf /tmp/usking-deploy.tar.gz -C .

# 运行 Docker 容器
docker run -d --name usking-web --restart always -p 8002:8000 \
  -v $(pwd):/app -w /app python:3.12-slim-bookworm \
  bash -c "pip install -r requirements.txt && uvicorn server.main:app --host 0.0.0.0 --port 8000"

# 等待启动
sleep 30

# 验证
docker ps | grep usking
curl http://localhost:8002/ | head -20
```

---

### 文档版本

**最后更新**: 2026-03-26  
**部署人员**: AIAds Team  
**文档版本**: v1.4 (USKing Docker 部署 + 一键脚本)  
**部署网站数**: 4 个

### 更新历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2026-03-25 | 初始版本 - AIAds 静态网站部署 |
| v1.1 | 2026-03-25 | 多网站部署 - 添加 ainews.cool, bestgoods.vip |
| v1.2 | 2026-03-25 | USKing 部署指南 - Python/FastAPI + Docker |
| v1.3 | 2026-03-25 | USKing 代码更新流程 - TemplateResponse 修复方案 |
| v1.4 | 2026-03-26 | USKing Docker 一键部署脚本 + 简化流程 |
