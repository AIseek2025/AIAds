#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
用法:
  bash scripts/deploy-prod-aliyun.sh [git-ref]

示例:
  bash scripts/deploy-prod-aliyun.sh main
  bash scripts/deploy-prod-aliyun.sh 71983b8

可选环境变量:
  AIADS_REPO_URL        Git 仓库地址，默认 https://github.com/AIseek2025/AIAds.git
  AIADS_RELEASES_DIR    发布目录根路径，默认 /opt/aiads-releases
  AIADS_CURRENT_LINK    当前代码软链，默认 /opt/aiads-current
  AIADS_STATIC_ROOT     前端发布根目录，默认 /var/www/aiads/releases
  AIADS_STATIC_LINK     前端 current 软链，默认 /var/www/aiads/current
  AIADS_ENV_SOURCE      后端环境文件来源，默认 /opt/aiads/src/backend/.env.production
  AIADS_PM2_NAME        PM2 进程名，默认 aiads-api
  AIADS_KEEP_RELEASES   保留最近发布数量，默认 5
  VITE_API_URL          前端 API 地址，默认 https://aiads.fun/api/v1
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! command -v git >/dev/null 2>&1; then
  echo "错误: 未找到 git"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "错误: 未找到 node"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "错误: 未找到 npm"
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "错误: 未找到 pm2"
  exit 1
fi

log() {
  printf '[aiads-deploy] %s\n' "$1"
}

require_sudo() {
  if ! sudo -n true >/dev/null 2>&1; then
    log "需要 sudo 权限，请先完成 sudo 认证。"
    sudo -v
  fi
}

resolve_env_source() {
  if [[ -n "${AIADS_ENV_SOURCE:-}" && -f "${AIADS_ENV_SOURCE}" ]]; then
    printf '%s\n' "${AIADS_ENV_SOURCE}"
    return 0
  fi

  for candidate in \
    /opt/aiads/src/backend/.env.production \
    /opt/aiads-current/src/backend/.env.production
  do
    if [[ -f "${candidate}" ]]; then
      printf '%s\n' "${candidate}"
      return 0
    fi
  done

  return 1
}

cleanup_old_releases() {
  local keep_count="$1"
  local releases_dir="$2"
  mapfile -t releases < <(ls -1dt "${releases_dir}"/* 2>/dev/null || true)
  if (( ${#releases[@]} <= keep_count )); then
    return 0
  fi

  for old_release in "${releases[@]:keep_count}"; do
    log "清理旧发布目录: ${old_release}"
    sudo rm -rf "${old_release}"
  done
}

wait_for_http() {
  local url="$1"
  local max_attempts="${2:-30}"
  local sleep_seconds="${3:-2}"
  local header_name="${4:-}"
  local header_value="${5:-}"
  local attempt

  for (( attempt = 1; attempt <= max_attempts; attempt++ )); do
    if [[ -n "${header_name}" ]]; then
      if curl -fsSL -H "${header_name}: ${header_value}" "${url}" >/dev/null 2>&1; then
        return 0
      fi
    elif curl -fsSL "${url}" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${sleep_seconds}"
  done

  return 1
}

main() {
  local git_ref="${1:-main}"
  local repo_url="${AIADS_REPO_URL:-https://github.com/AIseek2025/AIAds.git}"
  local releases_dir="${AIADS_RELEASES_DIR:-/opt/aiads-releases}"
  local current_link="${AIADS_CURRENT_LINK:-/opt/aiads-current}"
  local static_root="${AIADS_STATIC_ROOT:-/var/www/aiads/releases}"
  local static_link="${AIADS_STATIC_LINK:-/var/www/aiads/current}"
  local pm2_name="${AIADS_PM2_NAME:-aiads-api}"
  local keep_releases="${AIADS_KEEP_RELEASES:-5}"
  local vite_api_url="${VITE_API_URL:-https://aiads.fun/api/v1}"
  local timestamp release_dir backend_dir frontend_dir static_release_dir env_source release_sha backend_port

  require_sudo

  if ! env_source="$(resolve_env_source)"; then
    echo "错误: 未找到 .env.production，请设置 AIADS_ENV_SOURCE"
    exit 1
  fi

  timestamp="$(date +%Y%m%d-%H%M%S)"
  release_dir="${releases_dir}/${timestamp}"
  backend_dir="${release_dir}/src/backend"
  frontend_dir="${release_dir}/src/frontend"
  static_release_dir="${static_root}/${timestamp}"

  log "开始正式发布，目标版本: ${git_ref}"
  log "环境文件来源: ${env_source}"

  sudo mkdir -p "${releases_dir}" "${static_root}"
  sudo chown -R "$(id -un)":"$(id -gn)" "${releases_dir}"

  git clone "${repo_url}" "${release_dir}" >/dev/null 2>&1
  (
    cd "${release_dir}"
    git fetch origin --tags --prune >/dev/null 2>&1
    git checkout "${git_ref}" >/dev/null 2>&1
    release_sha="$(git rev-parse HEAD)"
    printf '%s\n' "${release_sha}" > .release-sha
  )
  release_sha="$(<"${release_dir}/.release-sha")"
  rm -f "${release_dir}/.release-sha"

  log "已解析版本: ${release_sha}"

  cp "${env_source}" "${backend_dir}/.env.production"
  backend_port="$(
    bash -lc 'set -a; . "$1"; set +a; printf "%s" "${PORT:-3001}"' _ "${backend_dir}/.env.production"
  )"

  log "安装并构建后端"
  (
    cd "${backend_dir}"
    npm ci
    npm run prisma:generate
    npm run build
    set -a
    . ./.env.production
    set +a
    DATABASE_URL="${DATABASE_URL}" npx prisma db push --url "${DATABASE_URL}"
  )

  log "安装并构建前端"
  (
    cd "${frontend_dir}"
    NODE_ENV=development npm ci --include=dev
    VITE_API_URL="${vite_api_url}" npm run build
  )

  log "发布前端静态资源"
  sudo mkdir -p "${static_release_dir}"
  sudo cp -R "${frontend_dir}/dist"/. "${static_release_dir}/"

  if [[ -e "${static_link}" && ! -L "${static_link}" ]]; then
    sudo mv "${static_link}" "${static_link}.backup-${timestamp}"
  fi
  sudo ln -sfn "${static_release_dir}" "${static_link}.tmp"
  sudo mv -Tf "${static_link}.tmp" "${static_link}"

  log "切换后端 PM2 进程"
  (
    cd "${backend_dir}"
    set -a
    . ./.env.production
    set +a
    pm2 delete "${pm2_name}" >/dev/null 2>&1 || true
    pm2 start dist/index.js --name "${pm2_name}" --cwd "${backend_dir}" --update-env
    pm2 save >/dev/null
  )

  sudo ln -sfn "${release_dir}" "${current_link}.tmp"
  sudo mv -Tf "${current_link}.tmp" "${current_link}"

  log "执行健康检查"
  if ! wait_for_http "http://127.0.0.1:${backend_port}/api/v1/health" 30 2 "x-forwarded-proto" "https"; then
    echo "错误: 本机后端健康检查失败"
    exit 1
  fi
  if ! wait_for_http "${vite_api_url%/api/v1}/" 15 2; then
    echo "错误: 公网首页健康检查失败"
    exit 1
  fi
  if ! wait_for_http "${vite_api_url}/health" 15 2; then
    echo "错误: 公网 API 健康检查失败"
    exit 1
  fi

  cleanup_old_releases "${keep_releases}" "${releases_dir}"

  log "发布完成"
  log "版本: ${release_sha}"
  log "当前代码: ${current_link}"
  log "当前静态: ${static_link}"
}

main "${1:-main}"
