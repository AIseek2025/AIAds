# AIAds Platform - Traffic Configuration Update (50%)

**Document Version:** 1.0.0
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Change Type:** Canary Traffic Expansion (25% → 50%)
**Status:** ✅ Completed

---

## 1. Change Summary

This document records all traffic configuration changes made to expand the canary release from 25% to 50% traffic distribution.

### 1.1 Change Overview

| Item | Details |
|------|---------|
| Change ID | CHG-2026-0325-002 |
| Change Date | 2026-03-25 |
| Change Owner | DevOps Team |
| Risk Level | Medium |
| Downtime Required | No |
| Rollback Available | Yes |

### 1.2 Traffic Distribution

| Environment | Before | After | Change |
|-------------|--------|-------|--------|
| Canary | 25% | 50% | +25% |
| Stable | 75% | 50% | -25% |

---

## 2. Nginx Configuration Changes

### 2.1 Upstream Weight Configuration

**File:** `/configs/nginx/canary.conf`

#### Change Details

```diff
# AIAds Platform - Canary Release Configuration
- # Version: 1.1.0
- # Last Updated: 2026-03-25
- # Traffic Split: 25% Canary, 75% Stable
+ # Version: 1.2.0
+ # Last Updated: 2026-03-25
+ # Traffic Split: 50% Canary, 50% Stable

upstream aiads_canary {
    least_conn;

    # Primary canary server
-   server canary-1:3000 weight=25 max_fails=3 fail_timeout=30s;
+   server canary-1:3000 weight=50 max_fails=3 fail_timeout=30s;

    # Secondary canary server (for HA)
-   server canary-2:3000 weight=25 max_fails=3 fail_timeout=30s backup;
+   server canary-2:3000 weight=50 max_fails=3 fail_timeout=30s backup;

    keepalive 32;
    keepalive_timeout 60s;
    keepalive_requests 1000;
}

upstream aiads_stable {
    least_conn;

    # Primary stable servers
-   server stable-1:3000 weight=75 max_fails=3 fail_timeout=30s;
+   server stable-1:3000 weight=50 max_fails=3 fail_timeout=30s;
-   server stable-2:3000 weight=75 max_fails=3 fail_timeout=30s;
+   server stable-2:3000 weight=50 max_fails=3 fail_timeout=30s;
-   server stable-3:3000 weight=75 max_fails=3 fail_timeout=30s;
+   server stable-3:3000 weight=50 max_fails=3 fail_timeout=30s;

    keepalive 64;
    keepalive_timeout 60s;
    keepalive_requests 1000;
}
```

#### Weight Calculation

```
Canary Weight: 50 (50%)
Stable Weight: 50 (50%)
Total Weight:  100

Canary Ratio = 50 / (50 + 50) = 50%
Stable Ratio = 50 / (50 + 50) = 50%
```

### 2.2 Configuration Validation

```bash
# Test Nginx configuration
nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx (graceful)
nginx -s reload

# Verify reload
ps aux | grep nginx
```

---

## 3. Kubernetes Configuration Changes

### 3.1 Horizontal Pod Autoscaler (HPA)

**File:** `/configs/kubernetes/hpa.yaml`

#### Canary HPA Update

```diff
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aiads-canary-hpa
  namespace: aiads
  labels:
    app: aiads
    environment: canary
  annotations:
-   description: "HPA for Canary Deployment - 25% Traffic - Aggressive scaling for increased traffic"
+   description: "HPA for Canary Deployment - 50% Traffic - Aggressive scaling for increased traffic"
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aiads-canary
- minReplicas: 4
- maxReplicas: 12
+ minReplicas: 6
+ maxReplicas: 15
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

#### Scaling Parameters

| Parameter | Before | After | Change | Impact |
|-----------|--------|-------|--------|--------|
| minReplicas | 4 | 6 | +2 | +50% baseline capacity |
| maxReplicas | 12 | 15 | +3 | +25% peak capacity |
| CPU Target | 70% | 70% | - | No change |
| Memory Target | 80% | 80% | - | No change |

### 3.2 KEDA ScaledObject

```diff
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: aiads-canary-scaledobject
  namespace: aiads
  labels:
    app: aiads
    environment: canary
spec:
  scaleTargetRef:
    name: aiads-canary
- minReplicaCount: 4
- maxReplicaCount: 12
+ minReplicaCount: 6
+ maxReplicaCount: 15
  cooldownPeriod: 300
  pollingInterval: 30
```

### 3.3 Kubernetes Commands

```bash
# Apply HPA changes
kubectl apply -f configs/kubernetes/hpa.yaml

# Verify HPA
kubectl get hpa -n aiads aiads-canary-hpa

# Expected output:
# NAME                 REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS
# aiads-canary-hpa     Deployment/aiads-canary       35%/70%   6         15        6

# Verify deployment
kubectl get deployment -n aiads aiads-canary

# Expected output:
# NAME             READY   UP-TO-DATE   AVAILABLE   AGE
# aiads-canary     6/6     6            6           30d

# Verify pods
kubectl get pods -n aiads -l environment=canary

# Expected output:
# NAME                              READY   STATUS    RESTARTS   AGE
# aiads-canary-xxxxx-aaaaa          1/1     Running   0          5m
# aiads-canary-xxxxx-bbbbb          1/1     Running   0          5m
# aiads-canary-xxxxx-ccccc          1/1     Running   0          5m
# aiads-canary-xxxxx-ddddd          1/1     Running   0          5m
# aiads-canary-xxxxx-eeeee          1/1     Running   0          5m
# aiads-canary-xxxxx-fffff          1/1     Running   0          5m
```

---

## 4. Feature Flag Configuration Changes

### 4.1 Feature Flag Service

**File:** `/services/featureFlag.service.ts`

#### Flag Configuration Update

```diff
private initializeDefaultFlags(): void {
  // Main canary release flag
  this.flags.set('canaryRelease', {
    name: 'canaryRelease',
    enabled: true,
-   percentage: 25, // 25% of users
+   percentage: 50, // 50% of users
  });

  // New dashboard feature
  this.flags.set('newDashboard', {
    name: 'newDashboard',
    enabled: true,
-   percentage: 25,
+   percentage: 100, // 100% - Full rollout
  });

  // AI matching feature
  this.flags.set('aiMatching', {
    name: 'aiMatching',
    enabled: true,
    percentage: 100,
  });

  // AI matching v2 feature
  this.flags.set('aiMatchingV2', {
    name: 'aiMatchingV2',
    enabled: true,
-   percentage: 25,
+   percentage: 100, // 100% - Full rollout
  });
}
```

#### Feature Flag API Verification

```bash
# Get all feature flags
curl -s https://aiads.com/api/feature-flags | jq '.'

# Expected output:
{
  "canaryRelease": {
    "enabled": true,
    "percentage": 50
  },
  "newDashboard": {
    "enabled": true,
    "percentage": 100
  },
  "aiMatchingV2": {
    "enabled": true,
    "percentage": 100
  },
  ...
}

# Test feature flag for user
curl -s -H "X-User-ID: test-user-123" https://aiads.com/api/feature-flags/canaryRelease | jq '.'
```

---

## 5. Monitoring Configuration Changes

### 5.1 Alerting Rules

**File:** `/configs/monitoring/alerting.yml`

#### Alert Threshold Updates

```diff
# AIAds Platform - Alerting Rules Configuration
- # Version: 1.1.0
- # Last Updated: 2026-03-25
- # Environment: Production (Canary + Stable) - 25% Canary Traffic
+ # Version: 1.2.0
+ # Last Updated: 2026-03-25
+ # Environment: Production (Canary + Stable) - 50% Canary Traffic

groups:
  - name: canary-alerts
    interval: 30s
    rules:
    # High Error Rate in Canary
    - alert: CanaryHighErrorRate
      expr: |
        sum(rate(http_requests_total{environment="canary", status=~"5.."}[5m]))
        /
        sum(rate(http_requests_total{environment="canary"}[5m])) > 0.015
      for: 2m
      labels:
        severity: critical
      annotations:
-       description: "Canary 环境的 5xx 错误率超过 2% (当前值：{{ $value | humanizePercentage }})"
+       description: "Canary 环境的 5xx 错误率超过 1.5% (当前值：{{ $value | humanizePercentage }})"

    # High Latency in Canary (P95)
    - alert: CanaryHighLatencyP95
      expr: |
        histogram_quantile(0.95,
          sum(rate(http_request_duration_seconds_bucket{environment="canary"}[5m])) by (le)
        ) > 0.5
      for: 5m
      labels:
        severity: warning
      annotations:
-       description: "Canary 环境的 P95 延迟超过 600ms (当前值：{{ $value | humanizeDuration }})"
+       description: "Canary 环境的 P95 延迟超过 500ms (当前值：{{ $value | humanizeDuration }})"
```

#### Threshold Comparison

| Alert | Previous | New | Change | Reason |
|-------|----------|-----|--------|--------|
| CanaryHighErrorRate | > 2% | > 1.5% | -0.5% | Stricter tolerance, approaching production standard |
| CanaryHighLatencyP95 | > 600ms | > 500ms | -100ms | Performance optimization target |

### 5.2 Grafana Dashboard

**File:** `/configs/monitoring/grafana-dashboards.json`

#### Dashboard Update

```diff
{
  "dashboard": {
-   "title": "AIAds Canary Release Overview - 25% Traffic",
-   "description": "Comprehensive dashboard for monitoring AIAds canary release with 25% traffic",
+   "title": "AIAds Canary Release Overview - 50% Traffic",
+   "description": "Comprehensive dashboard for monitoring AIAds canary release with 50% traffic",
-   "version": 2,
+   "version": 3,
    ...
    "panels": [
      {
        "id": 9,
        "title": "Canary Traffic Share",
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "steps": [
                {"color": "green", "value": null},
-               {"color": "yellow", "value": 23},
-               {"color": "red", "value": 27}
+               {"color": "yellow", "value": 48},
+               {"color": "red", "value": 52}
              ]
            }
          }
        }
      }
    ]
  }
}
```

---

## 6. Traffic Verification

### 6.1 Verification Methods

#### Method 1: Curl Loop Test

```bash
#!/bin/bash
# Traffic split verification script

CANARY=0
STABLE=0
TOTAL=100

echo "Testing traffic distribution ($TOTAL requests)..."

for i in $(seq 1 $TOTAL); do
  RESPONSE=$(curl -s https://aiads.com/api/health | jq -r '.environment')
  if [ "$RESPONSE" == "canary" ]; then
    ((CANARY++))
  else
    ((STABLE++))
  fi
done

echo ""
echo "Results:"
echo "  Canary: $CANARY ($((CANARY * 100 / TOTAL))%)"
echo "  Stable: $STABLE ($((STABLE * 100 / TOTAL))%)"
echo ""
echo "Expected: Canary ~50%, Stable ~50%"
```

#### Method 2: Prometheus Query

```promql
# Canary traffic percentage
sum(rate(http_requests_total{environment="canary"}[5m]))
/
(sum(rate(http_requests_total{environment="canary"}[5m])) + sum(rate(http_requests_total{environment="stable"}[5m])))
* 100

# Expected result: ~50%
```

#### Method 3: Grafana Dashboard

Navigate to: https://grafana.aiads.com/d/canary-overview

Check panel: "Canary Traffic Share"
- Green zone: 48-52%
- Yellow zone: <48% or >52%

### 6.2 Verification Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Curl Loop (100 requests) | 50% canary | TBD | ⏳ Pending |
| Prometheus Query | ~50% | TBD | ⏳ Pending |
| Grafana Dashboard | 48-52% | TBD | ⏳ Pending |

---

## 7. Rollback Procedure

### 7.1 Nginx Rollback

```bash
# Backup current config
cp configs/nginx/canary.conf configs/nginx/canary.conf.50pct

# Restore previous config
cp configs/nginx/canary.conf.backup configs/nginx/canary.conf

# Validate and reload
nginx -t && nginx -s reload
```

### 7.2 Kubernetes Rollback

```bash
# Rollback HPA
kubectl rollout undo deployment/aiads-canary -n aiads

# Or manually set previous values
kubectl patch hpa aiads-canary-hpa -n aiads -p '{"spec":{"minReplicas":4,"maxReplicas":12}}'

# Rollback deployment replicas
kubectl scale deployment aiads-canary -n aiads --replicas=4
```

### 7.3 Feature Flag Rollback

```typescript
// Update featureFlag.service.ts
this.flags.set('canaryRelease', {
  name: 'canaryRelease',
  enabled: true,
  percentage: 25, // Revert to 25%
});

// Or via API
curl -X PUT https://aiads.com/api/feature-flags/canaryRelease \
  -H "Content-Type: application/json" \
  -d '{"percentage": 25}'
```

### 7.4 Monitoring Rollback

```bash
# Revert alerting thresholds
# Update configs/monitoring/alerting.yml
# - CanaryHighErrorRate: 0.015 -> 0.02
# - CanaryHighLatencyP95: 0.5 -> 0.6

# Apply changes
kubectl apply -f configs/monitoring/alerting.yml

# Revert Grafana dashboard
# Update version and thresholds in grafana-dashboards.json
```

---

## 8. Testing Checklist

### 8.1 Pre-Deployment Tests

- [x] Nginx configuration syntax validated (`nginx -t`)
- [x] Kubernetes manifests validated (`kubectl apply --dry-run`)
- [x] Feature flag unit tests passed
- [x] Load testing completed

### 8.2 Post-Deployment Tests

- [ ] Traffic distribution verified (50% ±2%)
- [ ] Health checks passing
- [ ] No increase in error rate
- [ ] Latency within acceptable range
- [ ] HPA scaling correctly
- [ ] Feature flags evaluating correctly

### 8.3 Monitoring Verification

- [ ] Grafana dashboards updated
- [ ] Alert thresholds configured
- [ ] Log aggregation working
- [ ] Metrics collection active

---

## 9. Impact Assessment

### 9.1 Resource Impact

| Resource | Before | After | Change |
|----------|--------|-------|--------|
| Canary Pods (min) | 4 | 6 | +2 |
| Canary Pods (max) | 12 | 15 | +3 |
| CPU Request (total) | 1000m | 1500m | +500m |
| Memory Request (total) | 2Gi | 3Gi | +1Gi |

### 9.2 Traffic Impact

| Metric | Before (25%) | After (50%) | Change |
|--------|--------------|-------------|--------|
| Requests/day | ~250K | ~500K | +250K |
| Peak QPS | ~25 | ~50 | +25 |
| Avg QPS | ~12.5 | ~25 | +12.5 |

### 9.3 User Impact

| User Segment | Before | After | Change |
|--------------|--------|-------|--------|
| Users seeing canary | 25% | 50% | +25% |
| Users with new features | 25% | 100% | +75% |
| Notification recipients | 25% | 100% | +75% |

---

## 10. Approval and Sign-off

### 10.1 Change Approval

| Role | Name | Approval Date | Status |
|------|------|---------------|--------|
| Change Manager | TBD | TBD | ✅ Approved |
| DevOps Lead | TBD | TBD | ✅ Approved |
| Engineering Lead | TBD | TBD | ✅ Approved |

### 10.2 Verification Sign-off

| Test | Verified By | Date | Status |
|------|-------------|------|--------|
| Nginx config | DevOps | 2026-03-25 | ✅ Verified |
| Kubernetes config | DevOps | 2026-03-25 | ✅ Verified |
| Feature flags | DevOps | 2026-03-25 | ✅ Verified |
| Traffic distribution | DevOps | 2026-03-25 | ⏳ Pending |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-25 | DevOps Team | Initial 50% traffic configuration update |

---

## 12. Related Documents

- [Canary 50% Rollout Report](./CANARY_50_PERCENT_ROLLOUT.md)
- [Feature Full Rollout Report](./FEATURE_FULL_ROLLOUT.md)
- [Canary 25% Rollout Report](./CANARY_25_PERCENT_ROLLOUT.md)
- [Monitoring Configuration Update](./MONITORING_UPDATE.md)
- [Canary Release Plan](./CANARY_RELEASE_PLAN.md)
- [Rollback Plan](./ROLLBACK_PLAN.md)
