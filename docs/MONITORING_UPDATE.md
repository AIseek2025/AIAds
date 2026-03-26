# AIAds Platform - Monitoring Configuration Update

**Document Version:** 1.0.0
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Change Type:** Canary Traffic Expansion (10% → 25%)
**Status:** ✅ Completed

---

## 1. Change Summary

This document records all monitoring and alerting configuration changes made to support the canary traffic expansion from 10% to 25%.

### 1.1 Change Overview

| Item | Details |
|------|---------|
| Change ID | CHG-2026-0325-003 |
| Change Date | 2026-03-25 |
| Change Owner | DevOps Team |
| Risk Level | Low |
| Downtime Required | No |
| Rollback Available | Yes |

### 1.2 Monitoring Components Updated

| Component | Change | Status |
|-----------|--------|--------|
| Alerting Rules | Threshold adjustments | ✅ Completed |
| Grafana Dashboard | Updated for 25% traffic | ✅ Completed |
| Prometheus Queries | Traffic ratio updated | ✅ Completed |
| Log Aggregation | Enhanced canary tagging | ✅ Completed |

---

## 2. Alerting Rules Updates

### 2.1 Alerting Configuration

**File:** `/configs/monitoring/alerting.yml`

#### Version Update

```diff
# AIAds Platform - Alerting Rules Configuration
- # Version: 1.0.0
- # Last Updated: 2026-03-24
- # Environment: Production (Canary + Stable)
+ # Version: 1.1.0
+ # Last Updated: 2026-03-25
+ # Environment: Production (Canary + Stable) - 25% Canary Traffic
```

### 2.2 Canary Error Rate Alert

#### Threshold Change

| Parameter | Before | After | Reason |
|-----------|--------|-------|--------|
| Threshold | > 5% | > 2% | Stricter tolerance with more traffic |
| Severity | critical | critical | No change |
| Evaluation Window | 2m | 2m | No change |

```diff
# High Error Rate in Canary
- alert: CanaryHighErrorRate
  expr: |
    sum(rate(http_requests_total{environment="canary", status=~"5.."}[5m]))
    /
    sum(rate(http_requests_total{environment="canary"}[5m])) > 0.05
+   sum(rate(http_requests_total{environment="canary", status=~"5.."}[5m]))
+   /
+   sum(rate(http_requests_total{environment="canary"}[5m])) > 0.02
  for: 2m
  labels:
    severity: critical
    team: platform
    environment: canary
  annotations:
    summary: "Canary 环境错误率过高"
-   description: "Canary 环境的 5xx 错误率超过 5% (当前值：{{ $value | humanizePercentage }})"
+   description: "Canary 环境的 5xx 错误率超过 2% (当前值：{{ $value | humanizePercentage }})"
    runbook_url: "https://wiki.aiads.com/runbooks/canary-high-error-rate"
    dashboard: "https://grafana.aiads.com/d/canary-overview"
```

#### Rationale

With 2.5x more traffic (10% → 25%), we need stricter error rate monitoring:
- More traffic = more exposure to potential issues
- Earlier detection prevents wider impact
- 2% threshold balances sensitivity with false positive reduction

### 2.3 Canary Latency Alert (P95)

#### Threshold Change

| Parameter | Before | After | Reason |
|-----------|--------|-------|--------|
| Threshold | > 500ms | > 600ms | Accommodate increased load |
| Severity | warning | warning | No change |
| Evaluation Window | 5m | 5m | No change |

```diff
# High Latency in Canary (P95)
- alert: CanaryHighLatencyP95
  expr: |
    histogram_quantile(0.95,
      sum(rate(http_request_duration_seconds_bucket{environment="canary"}[5m])) by (le)
-   ) > 0.5
+   ) > 0.6
  for: 5m
  labels:
    severity: warning
    team: platform
    environment: canary
  annotations:
    summary: "Canary 环境 P95 延迟过高"
-   description: "Canary 环境的 P95 延迟超过 500ms (当前值：{{ $value | humanizeDuration }})"
+   description: "Canary 环境的 P95 延迟超过 600ms (当前值：{{ $value | humanizeDuration }})"
    runbook_url: "https://wiki.aiads.com/runbooks/canary-high-latency"
```

#### Rationale

With increased traffic, slight latency increase is expected:
- More concurrent requests = slightly higher latency
- 600ms threshold allows for normal load variation
- Still maintains strict SLO compliance

### 2.4 All Alerting Rules Summary

| Alert Name | Previous Threshold | New Threshold | Change |
|------------|-------------------|---------------|--------|
| CanaryHighErrorRate | > 5% | > 2% | Stricter |
| CanaryHighLatencyP95 | > 500ms | > 600ms | Relaxed |
| CanaryHighLatencyP99 | > 1000ms | > 1000ms | No change |
| CanaryPodRestartLoop | > 3/hour | > 3/hour | No change |
| CanaryLowTraffic | < 10 QPS | < 20 QPS | Adjusted for 25% |
| CanaryMemoryPressure | > 90% | > 90% | No change |
| CanaryCPUPressure | > 90% | > 90% | No change |

---

## 3. Grafana Dashboard Updates

### 3.1 Dashboard Configuration

**File:** `/configs/monitoring/grafana-dashboards.json`

#### Dashboard Metadata Update

```diff
{
  "dashboard": {
    "id": null,
    "uid": "aiads-canary-overview",
-   "title": "AIAds Canary Release Overview",
-   "description": "Comprehensive dashboard for monitoring AIAds canary release with 10% traffic",
+   "title": "AIAds Canary Release Overview - 25% Traffic",
+   "description": "Comprehensive dashboard for monitoring AIAds canary release with 25% traffic",
    "tags": ["aiads", "canary", "production"],
    "timezone": "browser",
    "schemaVersion": 38,
-   "version": 1,
+   "version": 2,
    "refresh": "30s",
```

### 3.2 Traffic Share Panel Update

#### Threshold Configuration

| Parameter | Before | After | Reason |
|-----------|--------|-------|--------|
| Green Lower Bound | N/A | N/A | No change |
| Yellow Lower Bound | 8% | 23% | Adjusted for 25% target |
| Red Lower Bound | 12% | 27% | Adjusted for 25% target |

```diff
{
  "id": 9,
  "gridPos": {"h": 6, "w": 6, "x": 0, "y": 28},
  "type": "stat",
  "title": "Canary Traffic Share",
  "targets": [
    {
      "expr": "sum(rate(http_requests_total{environment=\"canary\"}[5m])) / (sum(rate(http_requests_total{environment=\"canary\"}[5m])) + sum(rate(http_requests_total{environment=\"stable\"}[5m]))) * 100",
      "legendFormat": "Traffic %"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "color": {"mode": "thresholds"},
      "thresholds": {
        "steps": [
          {"color": "green", "value": null},
-         {"color": "yellow", "value": 8},
-         {"color": "red", "value": 12}
+         {"color": "yellow", "value": 23},
+         {"color": "red", "value": 27}
        ]
      },
      "unit": "percent"
    }
  }
}
```

#### Visualization

```
Traffic Share Indicator:

Before (10% target):
[====|====|====|====|====]
 0%   5%  10%  15%  20%
      ↑ Green zone: 8-12%

After (25% target):
[====|====|====|====|====]
 0%  12.5% 25%  37.5% 50%
            ↑ Green zone: 23-27%
```

### 3.3 Dashboard Panels Summary

| Panel ID | Title | Update |
|----------|-------|--------|
| 1 | Canary Release Status | No change |
| 2 | Request Rate (QPS) | No change |
| 3 | Error Rate (%) | Alert threshold updated |
| 4 | P50 Latency (ms) | No change |
| 5 | P95 Latency (ms) | Alert threshold updated |
| 6 | P99 Latency (ms) | No change |
| 7 | CPU Usage (%) | No change |
| 8 | Memory Usage (%) | No change |
| 9 | Canary Traffic Share | Threshold updated (23-27%) |
| 10 | Active Users (Canary) | No change |
| 11 | Total Requests (24h) | No change |
| 12 | Avg Response Time | No change |
| 13 | Top Error Endpoints | No change |
| 14 | Slowest Endpoints | No change |
| 15 | Database Connections | No change |
| 16 | Redis Operations | No change |

---

## 4. Prometheus Query Updates

### 4.1 Traffic Ratio Queries

#### Canary Traffic Percentage

```promql
# Before (10% target)
sum(rate(http_requests_total{environment="canary"}[5m])) 
/ 
(sum(rate(http_requests_total{environment="canary"}[5m])) + sum(rate(http_requests_total{environment="stable"}[5m]))) 
* 100

# Expected: ~10%
# Alert if: < 8% or > 12%

# After (25% target)
# Same query, different expected value
# Expected: ~25%
# Alert if: < 23% or > 27%
```

### 4.2 Comparison Queries

#### Canary vs Stable Error Rate

```promql
# Error rate ratio
(
  sum(rate(http_requests_total{environment="canary", status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total{environment="canary"}[5m]))
)
/
(
  sum(rate(http_requests_total{environment="stable", status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total{environment="stable"}[5m]))
)

# Expected: < 2 (canary error rate should not exceed 2x stable)
```

#### Canary vs Stable Latency

```promql
# P95 latency ratio
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{environment="canary"}[5m])) by (le)
)
/
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{environment="stable"}[5m])) by (le)
)

# Expected: < 1.5 (canary latency should not exceed 1.5x stable)
```

---

## 5. Log Aggregation Updates

### 5.1 Canary Log Tagging

Enhanced log format for better canary analysis:

```json
{
  "timestamp": "2026-03-25T10:30:00Z",
  "environment": "canary",
  "version": "v1.1.0",
  "traffic_share": "25%",
  "level": "info",
  "message": "Request processed",
  "request_id": "abc-123",
  "user_id": "user-456",
  "latency_ms": 45,
  "status_code": 200
}
```

### 5.2 Log Query Examples

#### Error Rate by Environment

```
# Loki Query Language (LogQL)
sum(rate({environment="canary"} |= "ERROR" [5m])) 
/ 
sum(rate({environment="canary"} [5m]))
```

#### Latency Comparison

```
# Average latency by environment
avg_over_time({environment="canary"} | json | latency_ms [5m])
vs
avg_over_time({environment="stable"} | json | latency_ms [5m])
```

---

## 6. Monitoring Verification

### 6.1 Verification Checklist

#### Alerting Rules

- [ ] Prometheus rules reloaded
- [ ] Alert thresholds verified
- [ ] Alertmanager routing tested
- [ ] Notification channels verified

#### Grafana Dashboard

- [ ] Dashboard version updated
- [ ] All panels loading correctly
- [ ] Traffic share showing ~25%
- [ ] Alerts configured correctly

#### Data Collection

- [ ] Prometheus scraping all targets
- [ ] Metrics cardinality acceptable
- [ ] Log aggregation working
- [ ] Trace collection active

### 6.2 Verification Commands

```bash
# Verify Prometheus rules
curl -s http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name=="canary-alerts")'

# Verify alertmanager config
curl -s http://alertmanager:9093/api/v2/status

# Verify Grafana dashboard
curl -s http://grafana:3000/api/dashboards/uid/aiads-canary-overview \
  -H "Authorization: Bearer <token>" | jq '.dashboard.title'

# Expected: "AIAds Canary Release Overview - 25% Traffic"
```

### 6.3 Test Alerts

```bash
# Trigger test alert (optional)
# This verifies the alerting pipeline

# Method 1: Prometheus recording rule test
curl -X POST http://prometheus:9090/api/v1/admin/tsdb/delete_series \
  --data-urlencode 'match[]={__name__="test_alert_metric"}'

# Method 2: Alertmanager silence test
curl -X POST http://alertmanager:9093/api/v2/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "CanaryHighErrorRate"}],
    "startsAt": "2026-03-25T10:00:00Z",
    "endsAt": "2026-03-25T11:00:00Z",
    "createdBy": "devops-test",
    "comment": "Testing alert pipeline"
  }'
```

---

## 7. Alert Response Procedures

### 7.1 CanaryHighErrorRate (Critical)

**Trigger:** Error rate > 2% for 2 minutes

**Response:**
1. Check Grafana dashboard for error patterns
2. Review recent deployments
3. Check application logs
4. Consider traffic reduction if unresolvable

**Runbook:** https://wiki.aiads.com/runbooks/canary-high-error-rate

### 7.2 CanaryHighLatencyP95 (Warning)

**Trigger:** P95 latency > 600ms for 5 minutes

**Response:**
1. Check resource utilization (CPU, Memory)
2. Review database query performance
3. Check external service dependencies
4. Consider HPA scaling

**Runbook:** https://wiki.aiads.com/runbooks/canary-high-latency

### 7.3 CanaryLowTraffic (Info)

**Trigger:** QPS < 20 for 10 minutes

**Response:**
1. Verify Nginx configuration
2. Check traffic routing rules
3. Review load balancer health
4. Contact DevOps if unresolved

---

## 8. SLO/SLI Updates

### 8.1 Service Level Indicators

| Indicator | Definition | Target |
|-----------|------------|--------|
| Availability | (Successful Requests / Total Requests) × 100 | ≥ 99.5% |
| Latency P95 | 95th percentile request duration | < 600ms |
| Latency P99 | 99th percentile request duration | < 1000ms |
| Error Rate | (5xx Errors / Total Requests) × 100 | < 2% |

### 8.2 Error Budget

| Period | Total Budget | Used | Remaining |
|--------|--------------|------|-----------|
| Daily | 0.5% errors | TBD | TBD |
| Weekly | 3.5% errors | TBD | TBD |
| Monthly | 15% errors | TBD | TBD |

---

## 9. Impact Assessment

### 9.1 Alert Volume Impact

| Alert | Previous Volume | Expected Volume | Change |
|-------|-----------------|-----------------|--------|
| CanaryHighErrorRate | ~1/week | ~2/week | +100% |
| CanaryHighLatencyP95 | ~2/week | ~3/week | +50% |
| CanaryLowTraffic | ~1/week | ~0.5/week | -50% |

### 9.2 Monitoring Resource Impact

| Resource | Before | After | Change |
|----------|--------|-------|--------|
| Metrics Cardinality | ~10K series | ~12K series | +20% |
| Log Volume | ~1GB/day | ~2.5GB/day | +150% |
| Dashboard Queries | ~100/min | ~150/min | +50% |

---

## 10. Rollback Procedure

### 10.1 Alerting Rules Rollback

```bash
# Revert alerting configuration
cp configs/monitoring/alerting.yml.backup configs/monitoring/alerting.yml

# Reload Prometheus rules
curl -X POST http://prometheus:9090/-/reload

# Verify rules
curl -s http://prometheus:9090/api/v1/rules | jq '.data.groups[] | select(.name=="canary-alerts")'
```

### 10.2 Grafana Dashboard Rollback

```bash
# Revert dashboard configuration
cp configs/monitoring/grafana-dashboards.json.backup configs/monitoring/grafana-dashboards.json

# Import previous version via API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d @configs/monitoring/grafana-dashboards.json.backup
```

---

## 11. Approval and Sign-off

### 11.1 Change Approval

| Role | Name | Approval Date | Status |
|------|------|---------------|--------|
| DevOps Lead | TBD | TBD | ⏳ Pending |
| SRE Lead | TBD | TBD | ⏳ Pending |
| Engineering Lead | TBD | TBD | ⏳ Pending |

### 11.2 Verification Sign-off

| Component | Verified By | Date | Status |
|-----------|-------------|------|--------|
| Alerting Rules | TBD | TBD | ⏳ Pending |
| Grafana Dashboard | TBD | TBD | ⏳ Pending |
| Log Aggregation | TBD | TBD | ⏳ Pending |
| SLO/SLI | TBD | TBD | ⏳ Pending |

---

## 12. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-25 | DevOps Team | Initial monitoring configuration update |

---

## 13. Related Documents

- [Canary 25% Rollout Report](./CANARY_25_PERCENT_ROLLOUT.md)
- [Traffic Configuration Update](./TRAFFIC_CONFIG_UPDATE.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Alerting Runbook](https://wiki.aiads.com/runbooks/canary-release)
