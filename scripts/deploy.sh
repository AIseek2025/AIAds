#!/usr/bin/env bash
# AIAds 一键部署（Docker Compose）
# 用法：在项目根目录执行  bash scripts/deploy.sh
# 依赖：Docker 20+、Docker Compose v2

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> AIAds 部署目录: $ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "错误: 未找到 docker，请先安装 Docker Desktop 或 docker.io"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "错误: 未找到 docker compose，请安装 Docker Compose 插件 (docker compose version)"
  exit 1
fi

if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    echo "==> 已从 .env.example 创建 .env，请编辑其中的 DB_PASSWORD / JWT_SECRET 后再用于生产环境。"
  else
    echo "错误: 缺少 .env.example"
    exit 1
  fi
fi

echo "==> 构建并启动容器 (postgres + redis + api + web)..."
docker compose --env-file .env up -d --build

echo ""
echo "==> 部署完成。"
echo "    前端: http://localhost/"
echo "    API:  http://localhost:3000"
echo ""
echo "首次上线数据库请在本机执行迁移（示例）："
echo "    cd src/backend && DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/aiads npx prisma migrate deploy"
echo "（若将 postgres 端口映射到宿主机，请把连接串中的主机改为 localhost 并映射端口）"
echo ""
