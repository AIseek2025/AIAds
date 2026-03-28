#!/usr/bin/env bash
# 检查 Playwright 管理端 API 回归所需环境变量是否已设置（不打印 Token 明文）
# 用法：在仓库根目录 source .env 后执行 ./scripts/check-e2e-api-env.sh
set -euo pipefail

mask() {
  local v="${1:-}"
  if [[ -z "$v" ]]; then
    echo "(未设置)"
    return
  fi
  local n=${#v}
  if [[ "$n" -le 8 ]]; then
    echo "***"
  else
    echo "${v:0:4}…${v: -4} ($n chars)"
  fi
}

echo "AIADS_E2E_API_BASE: ${AIADS_E2E_API_BASE:-(未设置)}"
echo "AIADS_E2E_ADMIN_TOKEN: $(mask "${AIADS_E2E_ADMIN_TOKEN:-}")"
echo "AIADS_E2E_ADMIN_EMAIL: ${AIADS_E2E_ADMIN_EMAIL:-(未设置)}"
echo "AIADS_E2E_ADMIN_PASSWORD: $(mask "${AIADS_E2E_ADMIN_PASSWORD:-}")"
echo "AIADS_E2E_ORDER_ID: ${AIADS_E2E_ORDER_ID:-(未设置)}"
echo "AIADS_E2E_ADVERTISER_EMAIL: ${AIADS_E2E_ADVERTISER_EMAIL:-(未设置)}"
echo "AIADS_E2E_ADVERTISER_TOKEN: $(mask "${AIADS_E2E_ADVERTISER_TOKEN:-}")"
echo "AIADS_E2E_KOL_EMAIL: ${AIADS_E2E_KOL_EMAIL:-(未设置)}"
echo "AIADS_E2E_KOL_TOKEN: $(mask "${AIADS_E2E_KOL_TOKEN:-}")"
echo "（integration-order-lifecycle-api / role-api-smoke 另需广告主与 KOL 密码；Token 可由 Playwright global-setup 自动换取）"

if [[ -z "${AIADS_E2E_API_BASE:-}" ]]; then
  echo "状态: 缺少 AIADS_E2E_API_BASE，多数 admin-api-* 将 skip"
  exit 1
fi
if [[ -n "${AIADS_E2E_ADMIN_TOKEN:-}" ]]; then
  echo "状态: 可跑大部分 admin-api-*（已配置 TOKEN；需后端权限与数据一致）"
  integration_ready=1
  [[ -n "${AIADS_E2E_ADVERTISER_EMAIL:-}" && -n "${AIADS_E2E_ADVERTISER_PASSWORD:-}" && -n "${AIADS_E2E_KOL_EMAIL:-}" && -n "${AIADS_E2E_KOL_PASSWORD:-}" ]] || integration_ready=0
  if [[ "$integration_ready" -eq 1 ]]; then
    echo "状态: 另已具备广告主+KOL 账号，可尝试 integration-order-lifecycle-api.spec.ts"
  else
    echo "状态: integration-order-lifecycle 需补全广告主/KOL 四套邮箱密码（见 tests/.env.example）"
  fi
  exit 0
fi
if [[ -n "${AIADS_E2E_ADMIN_EMAIL:-}" && -n "${AIADS_E2E_ADMIN_PASSWORD:-}" ]]; then
  echo "状态: 可跑大部分 admin-api-*（Playwright global-setup 将用邮箱密码换 TOKEN）"
  integration_ready=1
  [[ -n "${AIADS_E2E_ADVERTISER_EMAIL:-}" && -n "${AIADS_E2E_ADVERTISER_PASSWORD:-}" && -n "${AIADS_E2E_KOL_EMAIL:-}" && -n "${AIADS_E2E_KOL_PASSWORD:-}" ]] || integration_ready=0
  if [[ "$integration_ready" -eq 1 ]]; then
    echo "状态: 另已具备广告主+KOL 账号，可尝试 integration-order-lifecycle-api.spec.ts"
  else
    echo "状态: integration-order-lifecycle 需补全广告主/KOL 四套邮箱密码（见 tests/.env.example）"
  fi
  exit 0
fi
echo "状态: 请设置 AIADS_E2E_ADMIN_TOKEN，或同时设置 AIADS_E2E_ADMIN_EMAIL + AIADS_E2E_ADMIN_PASSWORD"
exit 1
