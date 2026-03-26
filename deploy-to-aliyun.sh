#!/bin/bash

# AIAds 阿里云一键部署脚本
# 使用方法：./deploy-to-aliyun.sh

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

# 检查是否在项目根目录
if [ ! -f "package.json" ] && [ ! -d "src" ]; then
    log_error "请在项目根目录运行此脚本"
    exit 1
fi

log_info "=========================================="
log_info "  AIAds 阿里云部署脚本"
log_info "=========================================="
echo ""

# 配置变量
DEPLOY_DIR="/var/www/aiads"
BACKEND_DIR="$DEPLOY_DIR/src/backend"
FRONTEND_DIR="$DEPLOY_DIR/src/frontend"

echo ""
log_info "步骤 1/8: 检查服务器连接..."
echo ""

# 检查 SSH 连接
if ! command -v ssh &> /dev/null; then
    log_error "未安装 SSH，请先安装 SSH 客户端"
    exit 1
fi

# 获取服务器 IP
read -p "请输入阿里云服务器公网 IP: " SERVER_IP
read -p "请输入 SSH 端口 (默认 22): " SSH_PORT
SSH_PORT=${SSH_PORT:-22}
read -p "请输入 SSH 用户 (默认 root): " SSH_USER
SSH_USER=${SSH_USER:-root}

# 测试连接
if ! ssh -p $SSH_PORT -o ConnectTimeout=5 -o StrictHostKeyChecking=no $SSH_USER@$SERVER_IP "echo '连接成功'" &> /dev/null; then
    log_error "无法连接到服务器，请检查 IP 和 SSH 配置"
    exit 1
fi

log_success "服务器连接成功！"

echo ""
log_info "步骤 2/8: 准备部署文件..."
echo ""

# 创建部署包
DEPLOY_PACKAGE="aiads-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

log_info "创建部署包..."

# 排除不需要的文件
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

log_success "部署包创建成功：$DEPLOY_PACKAGE ($(du -h $DEPLOY_PACKAGE | cut -f1))"

echo ""
log_info "步骤 3/8: 上传部署包到服务器..."
echo ""

# 上传文件
scp -P $SSH_PORT $DEPLOY_PACKAGE $SSH_USER@$SERVER_IP:/tmp/

log_success "文件上传成功！"

echo ""
log_info "步骤 4/8: 在服务器上执行部署..."
echo ""

# 远程执行部署
ssh -p $SSH_PORT $SSH_USER@$SERVER_IP << 'ENDSSH'
#!/bin/bash
set -e

DEPLOY_DIR="/var/www/aiads"
BACKEND_DIR="$DEPLOY_DIR/src/backend"
FRONTEND_DIR="$DEPLOY_DIR/src/frontend"

echo ""
echo "=== 开始部署 AIAds ==="
echo ""

# 创建部署目录
echo "[1/8] 创建部署目录..."
mkdir -p $DEPLOY_DIR
mkdir -p $BACKEND_DIR
mkdir -p $FRONTEND_DIR

# 解压文件
echo "[2/8] 解压部署包..."
tar -xzf /tmp/aiads-deploy-*.tar.gz -C $DEPLOY_DIR
rm -f /tmp/aiads-deploy-*.tar.gz

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
cd $BACKEND_DIR
npm install --production

# 安装前端依赖并构建
echo "[5/8] 构建前端..."
cd $FRONTEND_DIR
npm install
npm run build

# 安装 PM2
echo "[6/8] 配置 PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 创建 PM2 配置
cd $BACKEND_DIR
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
pm2 delete aiads-backend || true
pm2 start ecosystem.config.js
pm2 save

# 配置 Nginx
echo "[7/8] 配置 Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "Nginx 未安装，正在安装..."
    yum install -y nginx
fi

# 创建 Nginx 配置
cat > /etc/nginx/conf.d/aiads.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
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

# 测试并重启 Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# 配置防火墙
echo "[8/8] 配置防火墙..."
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http || true
    firewall-cmd --permanent --add-service=https || true
    firewall-cmd --reload || true
fi

echo ""
echo "=== 部署完成！==="
echo ""
echo "服务状态:"
pm2 status
echo ""
echo "Nginx 状态:"
systemctl status nginx --no-pager
echo ""

ENDSSH

log_success "服务器部署完成！"

echo ""
log_info "清理本地文件..."
rm -f $DEPLOY_PACKAGE

echo ""
log_info "=========================================="
log_success "  AIAds 部署完成！"
log_info "=========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 在阿里云控制台配置域名解析"
echo "2. 配置 SSL 证书（推荐）："
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP"
echo "   yum install -y certbot python3-certbot-nginx"
echo "   certbot --nginx -d 您的域名.com"
echo ""
echo "3. 配置环境变量："
echo "   ssh -p $SSH_PORT $SSH_USER@$SERVER_IP"
echo "   vi /var/www/aiads/src/backend/.env"
echo ""
echo "4. 访问网站："
echo "   http://$SERVER_IP"
echo ""
log_info "详细部署文档请查看：DEPLOYMENT.md"
echo ""
