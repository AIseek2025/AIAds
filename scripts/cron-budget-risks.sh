#!/usr/bin/env bash
# 定时巡检：活动预算占用（与 GET /api/v1/admin/campaigns/budget-risks 一致）
# 环境变量示例：scripts/examples/cron-budget-risks.example.env
# 用法：export AIADS_ADMIN_TOKEN=... AIADS_ADMIN_API=https://host/api/v1/admin
#       可选：AIADS_BUDGET_ALERT_WEBHOOK_URL=https://hooks.slack.com/... 当有命中风险活动时 POST JSON
#       后端默认阈值由 AIADS_BUDGET_RISK_THRESHOLD 控制（与 dashboard/stats 的 budgetRiskThreshold 一致）
#       ./scripts/cron-budget-risks.sh [threshold 默认 0.85，须与线上 API 默认一致]
set -euo pipefail
THRESHOLD="${1:-0.85}"
BASE="${AIADS_ADMIN_API:-http://localhost:8080/api/v1/admin}"
TOKEN="${AIADS_ADMIN_TOKEN:-}"
WEBHOOK="${AIADS_BUDGET_ALERT_WEBHOOK_URL:-}"
if [[ -z "$TOKEN" ]]; then
  echo "请设置环境变量 AIADS_ADMIN_TOKEN" >&2
  exit 1
fi
# -f：HTTP 4xx/5xx 时非零退出，便于 Cron 发现 API/鉴权异常
BODY=$(curl -fsS -H "Authorization: Bearer ${TOKEN}" "${BASE}/campaigns/budget-risks?threshold=${THRESHOLD}")
printf '%s\n' "$BODY"
if [[ -n "$WEBHOOK" ]]; then
  export THRESHOLD
  WH_JSON=$(echo "$BODY" | python3 -c "
import sys, json, os
th = float(os.environ.get('THRESHOLD', '0.85'))
d = json.load(sys.stdin)
inner = d.get('data') or d
n = len(inner.get('items') or [])
out = {'source': 'aiads-budget-risks', 'threshold': th, 'count': n, 'payload': d}
print(json.dumps(out, ensure_ascii=False))
" 2>/dev/null) || WH_JSON=""
  COUNT=$(echo "$WH_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count',0))" 2>/dev/null || echo "0")
  if [[ "$COUNT" =~ ^[0-9]+$ ]] && [[ "$COUNT" -gt 0 ]] && [[ -n "$WH_JSON" ]]; then
    if ! curl -fsS -X POST -H "Content-Type: application/json" -d "$WH_JSON" "$WEBHOOK"; then
      echo "Webhook 投递失败（不影响本脚本退出码 0；请检查 AIADS_BUDGET_ALERT_WEBHOOK_URL）" >&2
    fi
  fi
fi
