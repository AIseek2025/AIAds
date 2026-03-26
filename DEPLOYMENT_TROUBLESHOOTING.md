# USKing 部署完整故障排除记录

**部署日期**: 2026-03-25 ~ 2026-03-26  
**服务器**: 阿里云轻量应用服务器 47.239.7.62  
**项目**: USKing (美股王) - Python FastAPI 应用  
**GitHub**: https://github.com/AIseek2025/USKing

---

## 📋 项目信息

| 项目 | 值 |
|------|-----|
| 项目类型 | Python FastAPI Web 应用 |
| 运行端口 | 8002 (Docker 内 8000) |
| 部署方式 | Docker 容器 |
| 域名 | usking.vip, www.usking.vip |
| Nginx 反向代理 | 443 → 8002 |

---

## 🎯 最终成功方案（Docker 方式）

### 一键部署脚本

```bash
# 在服务器上执行
cd /opt/usking && sudo ./deploy.sh
```

### 手动部署步骤

```bash
# 1. SSH 登录服务器
ssh admin@47.239.7.62

# 2. 进入项目目录
cd /opt/usking

# 3. 停止旧容器
docker stop usking-web 2>/dev/null || true
docker rm usking-web 2>/dev/null || true

# 4. 拉取最新代码
git fetch origin
git reset --hard origin/main

# 5. 修复代码（Starlette 兼容性）
sed -i 's/templates\.TemplateResponse("\([^"]*\)", {"request": request})/templates.TemplateResponse(request, "\1")/g' server/main.py

# 6. 运行 Docker 容器
docker run -d --name usking-web --restart always \
  -p 8002:8000 \
  -v $(pwd):/app \
  -w /app \
  python:3.12-slim-bookworm \
  bash -c "pip install -r requirements.txt && uvicorn server.main:app --host 0.0.0.0 --port 8000"

# 7. 等待启动
sleep 30

# 8. 验证
docker ps | grep usking
curl http://localhost:8002/ | head -20
```

### Nginx 配置

```nginx
server {
    server_name usking.vip www.usking.vip;
    location / {
        proxy_pass http://127.0.0.1:8002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/usking.vip/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/usking.vip/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}
```

---

## ⚠️ 遇到的所有问题及解决方案

### 问题 1: 端口 8000 被占用

**现象**:
```
Error response from daemon: driver failed programming external connectivity on endpoint usking-web-1: 
Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use
```

**原因**: 
- 服务器上的 ainews.cool 项目已经占用了 8000 端口（Node.js 进程 PID 1017）
- 多次尝试使用 8000 端口都失败

**尝试的失败方案**:
1. ❌ 尝试停止 ainews 服务 - 会影响其他网站
2. ❌ 尝试修改 docker-compose.prod.yml - sed 命令转义问题导致失败
3. ❌ 多次 vi 编辑 - 终端行号问题导致配置混乱

**✅ 成功方案**:
```bash
# 使用 8002 端口（空闲端口）
docker run -d --name usking-web --restart always -p 8002:8000 ...

# Nginx 配置使用 8002
proxy_pass http://127.0.0.1:8002;
```

**经验教训**:
- 部署前先检查端口占用：`sudo netstat -tlnp`
- 避免使用常用端口（8000, 3000, 5000）
- 为每个服务分配独立端口

---

### 问题 2: Starlette/TemplateResponse 版本兼容性

**现象**:
```json
{"detail":"服务器内部错误，请稍后重试"}
```

**日志错误**:
```
TypeError: unhashable type: 'dict'
  File "/app/server/main.py", line 238, in index
    return templates.TemplateResponse("index.html", {"request": request})
  File "/usr/local/lib/python3.12/site-packages/starlette/templating.py", line 148
```

**原因**: 
- Starlette 0.33+ 版本改变了 `TemplateResponse` API 参数顺序
- GitHub 代码使用旧格式：`TemplateResponse("xxx.html", {"request": request})`
- 需要改为新格式：`TemplateResponse(request, "xxx.html")`

**尝试的失败方案**:
1. ❌ 在服务器上直接用 sed 修复 - 转义字符复杂，容易出错
2. ❌ 在 Mac 本地修复后忘记重新打包 - 代码没同步
3. ❌ 修复后忘记重新构建 Docker 镜像 - 代码在镜像内

**✅ 成功方案**:
```bash
# 在 Mac 本地修复代码
cd /Users/surferboy/.openclaw/workspace/USKing
sed -i '' 's/templates\.TemplateResponse("\([^"]*\)", {"request": request})/templates.TemplateResponse(request, "\1")/g' server/main.py

# 验证修复
grep -n "TemplateResponse" server/main.py | head -15

# 重新打包上传
tar --exclude='.venv' --exclude='.git' --exclude='*.db' --exclude='__pycache__' -czf usking-deploy.tar.gz .
scp usking-deploy.tar.gz admin@47.239.7.62:/tmp/

# 服务器上重新构建
cd /opt/usking
tar -xzf /tmp/usking-deploy.tar.gz -C .
docker run -d --name usking-web ... (重新运行容器)
```

**经验教训**:
- Docker 镜像构建后代码在镜像内，修改源文件必须重新构建
- Starlette 版本更新频繁，注意 API 兼容性
- 批量修复用 sed，但要小心转义字符

---

### 问题 3: Python 3.6 版本太老

**现象**:
```
/usr/bin/python3: No module named uvicorn
```

和

```
TypeError: 'type' object is not subscriptable
  File "./server/config.py", line 39, in <module>
    def effective_news_rss_urls() -> list[str]:
```

**原因**: 
- 服务器系统 Python 是 3.6.8
- 项目需要 Python 3.9+（支持 `list[str]` 类型注解）
- pip3 安装权限问题

**尝试的失败方案**:
1. ❌ 尝试用系统 Python 3.6 安装依赖 - 权限问题
2. ❌ 尝试修复代码兼容 Python 3.6 - 需要改太多地方
3. ❌ 尝试安装 Python 3.10 - 命令不存在

**✅ 成功方案**:
```bash
# 使用 Docker，镜像内有 Python 3.12
docker run -d --name usking-web ... python:3.12-slim-bookworm ...
```

**经验教训**:
- 现代 Python 项目最好用 Docker 部署
- 避免在系统 Python 上安装依赖
- 类型注解 `list[str]` 需要 Python 3.9+

---

### 问题 4: Docker 容器代码不同步

**现象**:
```
ModuleNotFoundError: No module named 'server'
```

**原因**: 
- Docker 镜像构建时复制了代码到镜像内
- 修改源文件后没有重新构建镜像
- 容器运行的是旧代码

**尝试的失败方案**:
1. ❌ 修改源文件后直接重启容器 - 代码在镜像内，不会变
2. ❌ 用 docker-compose up -d - 使用了缓存

**✅ 成功方案**:
```bash
# 方案 A: 重新构建镜像
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# 方案 B: 删除旧容器重新运行
docker stop usking-web
docker rm usking-web
docker run -d --name usking-web ... (完整命令)
```

**经验教训**:
- Docker 镜像构建后是独立的
- 修改代码必须重新构建
- 使用 `--no-cache` 强制重新构建

---

### 问题 5: 终端 heredoc 语法问题

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

**尝试的失败方案**:
1. ❌ 多次尝试 heredoc - 每次都有行号
2. ❌ 尝试不同的引号 - 还是有问题

**✅ 成功方案**:
```bash
# 使用 echo 逐行写入
echo 'server {' > file.conf
echo '    listen 80;' >> file.conf
echo '    server_name example.com;' >> file.conf
echo '}' >> file.conf

# 或使用 printf
printf '%s\n' 'line1' 'line2' 'line3' | sudo tee file.conf

# 或使用 vi 手动编辑
sudo vi file.conf
```

**经验教训**:
- 避免在远程终端使用 heredoc
- echo 逐行写入最可靠
- 复杂配置用 vi 编辑

---

### 问题 6: sed 替换失败

**现象**:
```bash
sudo sed -i 's/8001:8000/8002:8000/g' docker-compose.prod.yml
cat docker-compose.prod.yml | grep ports -A1
# 输出仍然是 "8000:8000"
```

**原因**: sed 命令可能因为引号或特殊字符没有正确匹配。

**尝试的失败方案**:
1. ❌ 多次尝试不同的 sed 语法 - 转义问题
2. ❌ 尝试单引号双引号混合 - 更复杂

**✅ 成功方案**:
```bash
# 方案 A: 使用 vi 手动编辑
sudo vi docker-compose.prod.yml
# 找到 ports: 部分，手动修改
# :wq 保存退出

# 方案 B: 使用更精确的 sed 命令
sudo sed -i 's/"8000:8000"/"8002:8000"/g' docker-compose.prod.yml

# 方案 C: 使用 printf 创建新文件
printf '%s\n' '  ports:' '    - "8002:8000"' | sudo tee config.yml
```

**经验教训**:
- sed 转义复杂，简单修改用 vi
- 引号内的内容需要转义引号
- 重要配置修改后要验证

---

### 问题 7: Git 仓库未初始化

**现象**:
```bash
sudo git pull origin main
fatal: not a git repository (or any of the parent directories): .git
```

**原因**: 项目是通过 tar 打包上传的，没有 Git 仓库。

**尝试的失败方案**:
1. ❌ 尝试直接 git pull - 没有仓库
2. ❌ 尝试复制 .git 目录 - 权限问题

**✅ 成功方案**:
```bash
# 方案 A: 初始化 Git 仓库（推荐）
cd /opt/usking
sudo git init
sudo git remote add origin https://github.com/AIseek2025/USKing.git
sudo git fetch origin
sudo git reset --hard origin/main

# 方案 B: 重新打包上传
# Mac 本地打包，服务器解压（见问题 2）
```

**经验教训**:
- 部署时保留 .git 目录
- tar 打包时排除 .git 会导致无法 git pull
- 一键部署脚本需要先检查 Git

---

### 问题 8: 权限问题

**现象**:
```bash
nohup python3 -m uvicorn server.main:app ... > ./usking.log 2>&1 &
-bash: ./usking.log: Permission denied

sed: couldn't open temporary file server/sedHrdyWj: Permission denied
```

**原因**: 
- 当前用户没有目录写权限
- 文件所有者是另一个用户

**尝试的失败方案**:
1. ❌ 尝试直接写入 - 权限拒绝
2. ❌ 尝试 chmod - 需要 root

**✅ 成功方案**:
```bash
# 方案 A: 切换到 root
sudo su -
cd /opt/usking
# 执行操作

# 方案 B: 使用 sudo
sudo chmod -R 755 /opt/usking
sudo chown -R admin:admin /opt/usking

# 方案 C: Docker 方式（推荐）
# Docker 容器内运行，不受主机权限影响
docker run -d --name usking-web ...
```

**经验教训**:
- 部署前检查文件权限
- Docker 可以避免权限问题
- 重要目录设置正确的所有者

---

### 问题 9: Nginx 配置端口不匹配

**现象**:
```
502 Bad Gateway
```

**原因**: 
- Docker 容器运行在 8002 端口
- Nginx 配置还是代理到 8001 或 8000

**尝试的失败方案**:
1. ❌ 修改 Nginx 配置后忘记重启 - 配置不生效
2. ❌ 修改了错误的配置文件 - usking.conf vs usking.confecho

**✅ 成功方案**:
```bash
# 1. 检查 Nginx 配置
sudo cat /etc/nginx/conf.d/usking.conf

# 2. 修改端口
sudo vi /etc/nginx/conf.d/usking.conf
# proxy_pass http://127.0.0.1:8002;

# 3. 测试并重啟
sudo nginx -t && sudo systemctl restart nginx

# 4. 验证
curl -I https://usking.vip/
```

**经验教训**:
- 修改 Nginx 后要重启
- 先用 `nginx -t` 测试配置
- 保持 Docker 端口和 Nginx 配置一致

---

## 📊 端口分配总结

| 端口 | 项目 | 域名 | 说明 |
|------|------|------|------|
| **80/443** | Nginx | 所有 | HTTP/HTTPS 入口 |
| **8000** | ainews.cool | ainews.cool | Node.js 应用 |
| **3100** | bestgoods.vip | bestgoods.vip | Node.js 应用 |
| **5001** | aliyun-backend | - | Docker 容器 |
| **5432** | PostgreSQL | - | 数据库 |
| **8002** | usking.vip | usking.vip | Python/FastAPI |
| **8080** | searxng | - | 搜索引擎 |

**经验教训**:
- 部署前先规划端口
- 记录每个服务的端口
- 避免端口冲突

---

## 🛠️ 最终推荐部署流程

### 首次部署

1. **准备阶段**
   ```bash
   # 检查端口
   sudo netstat -tlnp
   
   # 检查 Docker
   docker --version
   docker ps
   ```

2. **拉取代码**
   ```bash
   cd /opt/usking
   sudo git init
   sudo git remote add origin https://github.com/AIseek2025/USKing.git
   sudo git fetch origin
   sudo git reset --hard origin/main
   ```

3. **运行 Docker**
   ```bash
   docker run -d --name usking-web --restart always \
     -p 8002:8000 -v $(pwd):/app -w /app \
     python:3.12-slim-bookworm \
     bash -c "pip install -r requirements.txt && uvicorn server.main:app --host 0.0.0.0 --port 8000"
   ```

4. **配置 Nginx**
   ```bash
   sudo vi /etc/nginx/conf.d/usking.conf
   # 配置反向代理到 8002
   sudo nginx -t && sudo systemctl restart nginx
   ```

5. **配置 SSL**
   ```bash
   sudo certbot --nginx -d usking.vip -d www.usking.vip
   ```

### 后续更新

```bash
# 一键部署
cd /opt/usking && sudo ./deploy.sh
```

---

## 📝 一键部署脚本内容

```bash
#!/bin/bash
echo "====== USKing 部署 ======"
cd /opt/usking
docker stop usking-web 2>/dev/null || true
docker rm usking-web 2>/dev/null || true
git pull origin main
docker run -d --name usking-web --restart always -p 8002:8000 \
  -v $(pwd):/app -w /app python:3.12-slim-bookworm \
  bash -c "pip install -r requirements.txt -q && uvicorn server.main:app --host 0.0.0.0 --port 8000"
sleep 30
docker ps | grep usking
echo "====== 完成 ======"
```

---

## ✅ 检查清单

部署前检查：
- [ ] 检查端口占用：`sudo netstat -tlnp`
- [ ] 检查 Docker：`docker --version`
- [ ] 检查 Git：`git --version`
- [ ] 检查 Nginx：`nginx -v`
- [ ] 检查 SSL 证书：`sudo certbot certificates`

部署后验证：
- [ ] 容器运行：`docker ps | grep usking`
- [ ] 端口监听：`sudo netstat -tlnp | grep 8002`
- [ ] HTTP 访问：`curl http://localhost:8002/`
- [ ] HTTPS 访问：`curl https://usking.vip/`
- [ ] Nginx 日志：`sudo tail -20 /var/log/nginx/error.log`

---

## 🎓 关键经验教训

### 1. Docker 端口冲突 - 本地修改优先

**问题场景**：
```bash
Error response from daemon: driver failed programming external connectivity on endpoint usking-web-1: 
Error starting userland proxy: listen tcp4 0.0.0.0:8000: bind: address already in use
```

**错误的解决方式**（耗时 2 小时）：
1. ❌ 在服务器上尝试停止各种服务
2. ❌ 尝试修改 Nginx 配置
3. ❌ 尝试用 docker run 代替 docker compose
4. ❌ 在服务器上编辑 docker-compose.prod.yml

**正确的解决方式**（5 分钟）：
```bash
# 在 Mac 本地修改 docker-compose.prod.yml
cd /Users/surferboy/.openclaw/workspace/USKing

# 编辑 docker-compose.prod.yml
# 将 ports: 下面的 "8000:8000" 改为 "8002:8000"
# 添加 container_name: usking-web

# 推送到 GitHub
git add docker-compose.prod.yml
git commit -m "修复端口配置为 8002"
git push origin main

# 在服务器上拉取并重启
ssh admin@47.239.7.62
cd /opt/usking
sudo git pull origin main
sudo docker stop usking-web
sudo docker rm usking-web
sudo docker compose -f docker-compose.prod.yml up -d --build
```

**经验教训**：
- **Docker Compose 配置在本地修改更可靠** - 服务器终端编辑容易出错
- **端口冲突先查占用** - `sudo netstat -tlnp | grep :8000`
- **修改后必须重启容器** - 旧容器不会自动使用新配置
- **使用 container_name 方便管理** - 避免容器名带随机后缀

---

### 2. 使用 Docker

- 避免 Python 版本问题
- 避免依赖冲突
- 避免权限问题

### 3. 端口规划

- 部署前检查端口占用
- 为每个服务分配独立端口
- 记录端口分配表

### 4. 代码同步

- Docker 镜像构建后代码在镜像内
- 修改代码必须重新构建
- 使用 Git 管理代码版本

### 5. 终端问题

- 避免 heredoc 语法
- 使用 echo 逐行写入
- 复杂配置用 vi 编辑

### 6. 权限管理

- 使用 sudo 执行特权操作
- Docker 可以避免权限问题
- 设置正确的文件所有者

### 7. 自动化

- 创建一键部署脚本
- 记录所有步骤
- 文档化故障排除

---

**文档版本**: v1.0  
**最后更新**: 2026-03-26  
**维护人员**: AIAds Team
