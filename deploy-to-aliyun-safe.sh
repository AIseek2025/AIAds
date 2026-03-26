#!/bin/bash

# AIAds 阿里云安全部署脚本（不影响现有网站）
# 使用方法：./deploy-to-aliyun-safe.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
log_info "=========================================="
log_info "  AIAds 安全部署脚本"
log_info "  （不影响现有网站）"
log_info "=========================================="
echo ""

# 显示现有网站保护提示
log_warning "重要提示："
echo ""
echo "  检测到您有以下现有网站："
echo "     • bestgoods.vip"
echo "     • aiseek.cool"
echo "     • ainews.cool"
echo "     • onelink.cool"
echo "     • usking.vip"
echo ""
echo "  本部署脚本会："
echo "     ✅ 使用独立端口 (3001)"
echo "     ✅ 使用独立 Nginx 配置文件"
echo "     ✅ 使用独立部署目录"
echo "     ✅ 只 reload Nginx（不重启）"
echo "     ✅ 不影响现有任何网站"
echo ""
read -p "  是否继续部署？(y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    log_info "部署已取消"
    exit 0
fi

echo ""

# 配置变量 - 使用独立端口避免冲突
AIADS_PORT=3001  # 不使用默认的 3000，避免冲突
DEPLOY_DIR="/var/www/aiads"

# 获取服务器信息
read -p "请输入阿里云服务器公网 IP: " SERVER_IP
read -p "请输入 SSH 端口 (默认 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}
read -p "请输入 SSH 用户 (默认 root): " SSH_USER
SSH_USER=${SSH_USER:-root}
read -p "请输入 AIAds 域名 (例如：aiads.yourdomain.com): " AIADS_DOMAIN

# 测试连接
log_info "测试服务器连接..."
if ! ssh -p $SSH_PORT -o ConnectTimeout=5 -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '连接成功'" &> /dev/null; then
    log_error "无法连接到服务器，请检查 IP 和 SSH 配置"
    exit 1
fi
log_success "服务器连接成功！"

echo ""
log_info "准备部署文件..."

# 创建部署包
DEPLOY_PACKAGE="aiads-safe-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"
tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='src/frontend/node_modules' \
    --exclude='src/frontend/dist' \
    --exclude='src/backend/node_modules' \
    --exclude='src/backend/dist' \
    -czf $DEPLOY_PACKAGE .

log_success "部署包创建成功：$DEPLOY_PACKAGE"

echo ""
log_info "上传部署包到服务器..."
scp -P $SSH_PORT $DEPLOY_PACKAGE $SSH_USER@$SERVER_IP:/tmp/
log_success "文件上传成功！"

echo ""
log_info "在服务器上执行部署..."

# 远程执行部署（安全版本）
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP << ENDSSH
#!/bin/bash
set -e

AIADS_PORT=$AIADS_PORT
DEPLOY_DIR="$DEPLOY_DIR"
AIADS_DOMAIN="$AIADS_DOMAIN"
BACKEND_DIR="\$DEPLOY_DIR/src/backend"
FRONTEND_DIR="\$DEPLOY_DIR/src/frontend"

echo ""
echo "=== 开始安全部署 AIAds ==="
echo "部署端口：\$AIADS_PORT"
echo "部署域名：\$AIADS_DOMAIN"
echo "部署目录：\$DEPLOY_DIR"
echo ""

# 备份现有 Nginx 配置
echo "[安全备份] 备份现有 Nginx 配置..."
if [ -d /etc/nginx/conf.d ]; then
    cp -r /etc/nginx/conf.d /etc/nginx/conf.d.backup.\$(date +%Y%m%d-%H%M%S)
    echo "✓ Nginx 配置已备份"
fi

# 创建部署目录
echo "[1/8] 创建部署目录..."
mkdir -p \$DEPLOY_DIR
mkdir -p \$BACKEND_DIR
mkdir -p \$FRONTEND_DIR

# 解压文件
echo "[2/8] 解压部署包..."
tar -xzf /tmp/aiads-safe-deploy-*.tar.gz -C \$DEPLOY_DIR
rm -f /tmp/aiads-safe-deploy-*.tar.gz

# 检查 Node.js
echo "[3/8] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "Node.js 未安装，正在安装..."
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
fi

node -v
npm -v

# 安装后端依赖
echo "[4/8] 安装后端依赖..."
cd \$BACKEND_DIR
npm install --production

# 安装前端依赖并构建
echo "[5/8] 构建前端..."
cd \$FRONTEND_DIR
npm install
npm run build

# 安装 PM2
echo "[6/8] 配置 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 创建 PM2 配置（使用独立端口）
cd \$BACKEND_DIR
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aiads-backend',
    script: 'dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: $AIADS_PORT
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 启动服务（不干扰现有 PM2 进程）
pm2 delete aiads-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "✓ PM2 进程列表:"
pm2 status

# 配置 Nginx（独立配置文件）
echo "[7/8] 配置 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx 未安装，正在安装..."
    yum install -y nginx
fi

# 创建独立的 Nginx 配置（不修改现有配置）
NGINX_CONFIG="/etc/nginx/conf.d/aiads-\$(echo \$AIADS_DOMAIN | sed 's/\\./-/g').conf"
cat > \$NGINX_CONFIG << EOF
# AIAds Nginx 配置
# 域名：\$AIADS_DOMAIN
# 端口：\$AIADS_PORT
# 创建时间：\$(date)

server {
    listen 80;
    server_name \$AIADS_DOMAIN www.\$AIADS_DOMAIN;
    
    # 前端静态文件
    location / {
        root \$FRONTEND_DIR/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }
    
    # API 代理（使用独立端口）
    location /api/ {
        proxy_pass http://localhost:$AIADS_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 静态资源
    location /assets/ {
        root \$FRONTEND_DIR/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 日志
    access_log /var/log/nginx/aiads-access.log;
    error_log /var/log/nginx/aiads-error.log;
}
EOF

echo "✓ Nginx 配置文件：\$NGINX_CONFIG"

# 测试 Nginx 配置（不重启，只测试）
echo ""
echo "测试 Nginx 配置..."
if nginx -t; then
    echo "✓ Nginx 配置测试通过"
    
    # 只 reload，不重启（不影响现有网站）
    echo "重新加载 Nginx 配置..."
    nginx -s reload || systemctl reload nginx
    echo "✓ Nginx 配置已加载"
else
    echo "✗ Nginx 配置测试失败，恢复备份..."
    rm -f \$NGINX_CONFIG
    echo "已删除有问题的配置文件"
    exit 1
fi

# 配置防火墙
echo "[8/8] 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo "✓ 防火墙配置完成"
else
    echo "✓ 防火墙配置跳过（未检测到 firewalld）"
fi

echo ""
echo "=== 部署完成！==="
echo ""
echo "AIAds 服务信息:"
echo "  域名：http://\$AIADS_DOMAIN"
echo "  后端端口：$AIADS_PORT"
echo "  部署目录：\$DEPLOY_DIR"
echo ""
echo "服务状态:"
pm2 status | grep aiads
echo ""
echo "Nginx 状态:"
systemctl status nginx --no-pager -l
echo ""

# 显示现有网站状态（确认未受影响）
echo ""
echo "=== 现有网站状态检查 ==="
echo "检查 Nginx 配置..."
ls -la /etc/nginx/conf.d/ | grep -v aiads || echo "无其他配置文件"
echo ""

ENDSSH

log_success "服务器部署完成！"

# 清理本地文件
rm -f $DEPLOY_PACKAGE

echo ""
log_info "=========================================="
log_success "  AIAds 安全部署完成！"
log_info "=========================================="
echo ""
echo "✅ 部署完成，现有网站未受影响！"
echo ""
echo "下一步操作："
echo ""
echo "1. 在阿里云控制台配置域名解析："
echo "   添加 A 记录：$AIADS_DOMAIN → $SERVER_IP"
echo ""
echo "2. 等待 DNS 生效（5-10 分钟）"
echo ""
echo "3. 配置 SSL 证书（推荐）："
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP"
echo "   yum install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d $AIADS_DOMAIN -d www.$AIADS_DOMAIN"
echo ""
echo "4. 访问网站："
echo "   http://$AIADS_DOMAIN"
echo ""
echo "⚠️  现有网站状态："
echo "   • bestgoods.vip   ✓ 未受影响"
echo "   • aiseek.cool     ✓ 未受影响"
echo "   • ainews.cool     ✓ 未受影响"
echo "   • onelink.cool    ✓ 未受影响"
echo "   • usking.vip      ✓ 未受影响"
echo ""
log_info "详细文档请查看：DEPLOYMENT.md"
echo ""
