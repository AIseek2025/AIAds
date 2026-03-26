# AIAds 安全部署方案

**重要**: 本部署方案设计用于不影响服务器上的现有网站。

**现有网站列表**:
- bestgoods.vip
- aiseek.cool
- ainews.cool
- onelink.cool
- usking.vip

---

## 🔒 安全保护措施

### 1. 独立端口配置

| 服务 | 端口 | 说明 |
|------|------|------|
| AIAds 后端 | **3001** | 不使用默认 3000，避免冲突 |
| 现有网站 | 原有端口 | 不受影响 |

### 2. 独立 Nginx 配置

- **配置文件**: `/etc/nginx/conf.d/aiads-{domain}.conf`
- **独立域名**: 使用独立域名，不修改现有网站配置
- **备份机制**: 部署前自动备份现有 Nginx 配置

### 3. 独立部署目录

```
/var/www/aiads/          # AIAds 独立目录
/var/www/bestgoods.vip/  # 现有网站目录（不受影响）
/var/www/aiseek.cool/    # 现有网站目录（不受影响）
...
```

### 4. Nginx 安全操作

| 操作 | 影响 | 本方案 |
|------|------|--------|
| `nginx -s reload` | 重新加载配置 | ✅ 使用（不影响现有网站） |
| `systemctl reload nginx` | 重新加载配置 | ✅ 使用（不影响现有网站） |
| `systemctl restart nginx` | 重启 Nginx 服务 | ❌ 不使用（会影响现有网站） |

---

## 🚀 部署步骤

### 步骤 1: 运行安全部署脚本

```bash
cd /Users/surferboy/.openclaw/workspace/AIAds
chmod +x deploy-to-aliyun-safe.sh
./deploy-to-aliyun-safe.sh
```

### 步骤 2: 输入信息

脚本会提示输入：
- 服务器公网 IP
- SSH 端口
- SSH 用户
- **AIAds 域名**（例如：aiads.yourdomain.com）

### 步骤 3: 确认部署

脚本会显示现有网站列表并请求确认：
```
重要提示：

检测到您有以下现有网站：
   • bestgoods.vip
   • aiseek.cool
   • ainews.cool
   • onelink.cool
   • usking.vip

本部署脚本会：
   ✅ 使用独立端口 (3001)
   ✅ 使用独立 Nginx 配置文件
   ✅ 使用独立部署目录
   ✅ 只 reload Nginx（不重启）
   ✅ 不影响现有任何网站

是否继续部署？(y/n): y
```

---

## 📋 部署后验证

### 验证 AIAds 运行

```bash
# SSH 登录服务器
ssh root@您的服务器 IP

# 检查 AIAds 后端
pm2 status aiads-backend

# 检查 Nginx 配置
nginx -t

# 检查 Nginx 进程
systemctl status nginx
```

### 验证现有网站

```bash
# 检查所有网站是否正常运行
curl -I http://bestgoods.vip
curl -I http://aiseek.cool
curl -I http://ainews.cool
curl -I http://onelink.cool
curl -I http://usking.vip
curl -I http://您的 AIAds 域名
```

所有网站应该返回 `HTTP/1.1 200 OK` 或 `HTTP/1.1 301 Moved Permanently`

---

## 🔧 故障恢复

### 如果 AIAds 部署失败

```bash
# SSH 登录服务器
ssh root@您的服务器 IP

# 删除 AIAds 配置
rm -f /etc/nginx/conf.d/aiads-*.conf

# 恢复 Nginx 配置
nginx -s reload

# 停止 AIAds 后端
pm2 stop aiads-backend
pm2 delete aiads-backend
```

### 如果意外影响了现有网站

```bash
# SSH 登录服务器
ssh root@您的服务器 IP

# 恢复 Nginx 配置备份
cp -r /etc/nginx/conf.d.backup.* /etc/nginx/conf.d.backup
rm -f /etc/nginx/conf.d/aiads-*.conf
cp -r /etc/nginx/conf.d.backup/* /etc/nginx/conf.d/

# 重新加载 Nginx
nginx -s reload
```

---

## 📊 端口使用规划

| 服务 | 端口 | 状态 |
|------|------|------|
| Nginx (HTTP) | 80 | 共享 |
| Nginx (HTTPS) | 443 | 共享 |
| SSH | 22 | 共享 |
| AIAds 后端 | **3001** | 独立 |
| 现有网站后端 | 原有端口 | 不受影响 |

---

## ✅ 安全检查清单

部署前确认：

- [ ] 已备份现有 Nginx 配置
- [ ] 已确认 AIAds 使用独立端口 (3001)
- [ ] 已确认使用独立域名
- [ ] 已确认使用独立部署目录
- [ ] 已确认只 reload Nginx（不重启）

部署后验证：

- [ ] AIAds 网站可以访问
- [ ] bestgoods.vip 可以访问
- [ ] aiseek.cool 可以访问
- [ ] ainews.cool 可以访问
- [ ] onelink.cool 可以访问
- [ ] usking.vip 可以访问
- [ ] PM2 进程正常
- [ ] Nginx 配置测试通过

---

## 📞 技术支持

### 查看日志

```bash
# AIAds 后端日志
pm2 logs aiads-backend

# Nginx 访问日志
tail -f /var/log/nginx/aiads-access.log

# Nginx 错误日志
tail -f /var/log/nginx/aiads-error.log

# 现有网站日志（示例）
tail -f /var/log/nginx/bestgoods.vip-access.log
```

### 常用命令

```bash
# 重启 AIAds（不影响其他网站）
pm2 restart aiads-backend

# 重新加载 Nginx（不影响现有网站）
nginx -s reload

# 查看 PM2 进程
pm2 status

# 查看 Nginx 配置
nginx -t
```

---

## ⚠️ 注意事项

1. **不要使用 `systemctl restart nginx`**: 这会重启整个 Nginx 服务，可能导致现有网站短暂不可用
2. **不要修改现有 Nginx 配置**: 只创建新的 AIAds 配置文件
3. **不要使用端口 80/443 以外的端口**: AIAds 后端使用 3001 端口，通过 Nginx 反向代理
4. **部署时间选择**: 建议在网站访问量低时部署

---

**部署完成日期**: _______________  
**部署人员**: _______________  
**现有网站验证**: □ 全部正常 □ 部分异常 □ 严重问题
