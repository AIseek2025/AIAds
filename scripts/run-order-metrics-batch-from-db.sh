#!/usr/bin/env bash
# 从 DB 生成批量指标 JSON 并调用 cron-order-metrics-batch.sh（GStack：可审计演练）
# 等价无临时文件路径：在仓库根执行 `npm run metrics:batch-sync`（Node fetch 直连 batch API）
# 需：DATABASE_URL（Prisma）、AIADS_ADMIN_TOKEN、AIADS_ADMIN_API
# 用法：
#   export AIADS_ADMIN_TOKEN=...
#   export AIADS_ADMIN_API=http://localhost:8080/api/v1/admin
#   ./scripts/run-order-metrics-batch-from-db.sh --limit 20
# 参数透传给 generate-order-metrics-batch-payload.ts（--limit / --cpm-only / --views-delta）
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO/src/backend"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
npm run -s metrics:batch-payload -- "$@" >"$TMP"
"$REPO/scripts/cron-order-metrics-batch.sh" "$TMP"
