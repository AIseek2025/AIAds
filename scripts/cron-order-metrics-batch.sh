#!/usr/bin/env bash
# 批量回填订单指标：PUT /api/v1/admin/orders/metrics/batch
# 请求体示例：scripts/examples/order-metrics-batch.example.json
# gstack：可审计 Cron —— 非零退出便于告警；支持演练/校验。
#
# 用法：
#   export AIADS_ADMIN_TOKEN=...
#   export AIADS_ADMIN_API=http://localhost:8080/api/v1/admin
#   ./scripts/cron-order-metrics-batch.sh /path/to/payload.json
#
# 演练（不发起 HTTP，仅校验 JSON 与打印将请求的 URL）：
#   ./scripts/cron-order-metrics-batch.sh --dry-run /path/to/payload.json
#
# 可选环境变量：
#   AIADS_CURL_MAX_TIME  curl --max-time 秒数，默认 120
set -euo pipefail

BASE="${AIADS_ADMIN_API:-http://localhost:8080/api/v1/admin}"
TOKEN="${AIADS_ADMIN_TOKEN:-}"
DRY_RUN=0

if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
  shift
fi

PAYLOAD="${1:-}"
MAX_TIME="${AIADS_CURL_MAX_TIME:-120}"

if [[ -z "$TOKEN" && "$DRY_RUN" -eq 0 ]]; then
  echo "请设置 AIADS_ADMIN_TOKEN" >&2
  exit 1
fi

if [[ -z "$PAYLOAD" || ! -f "$PAYLOAD" ]]; then
  cat << 'EOF' >&2
用法: cron-order-metrics-batch.sh [--dry-run] payload.json

  --dry-run   仅校验 JSON 可解析，并打印目标 URL（不请求、不要求 TOKEN）

仓库内示例: scripts/examples/order-metrics-batch.example.json

payload.json 示例:
{
  "items": [
    { "order_id": "uuid-1", "views": 1000, "likes": 10 },
    { "order_id": "uuid-2", "comments": 3 }
  ]
}
EOF
  exit 1
fi

validate_json() {
  if command -v python3 >/dev/null 2>&1; then
    python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$PAYLOAD"
  elif command -v jq >/dev/null 2>&1; then
    jq empty "$PAYLOAD"
  else
    echo "请安装 python3 或 jq 以校验 JSON" >&2
    exit 1
  fi
}

validate_json

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] JSON OK: $PAYLOAD"
  echo "[dry-run] PUT ${BASE}/orders/metrics/batch"
  exit 0
fi

# -f：HTTP 4xx/5xx 时非零退出，便于 Cron 告警
RESP="$(curl -fsS --max-time "$MAX_TIME" -X PUT "${BASE}/orders/metrics/batch" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @"${PAYLOAD}")"
printf '%s\n' "${RESP}"
