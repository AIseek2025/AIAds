# AIAds Platform - Traffic Configuration Update

**Document Version:** 1.0.0
**Created:** 2026-03-25
**Last Updated:** 2026-03-25
**Change Type:** Canary Traffic Expansion (10% → 25%)
**Status:** ✅ Completed

---

## 1. Change Summary

This document records all traffic configuration changes made to expand the canary release from 10% to 25% traffic distribution.

### 1.1 Change Overview

| Item | Details |
|------|---------|
| Change ID | CHG-2026-0325-001 |
| Change Date | 2026-03-25 |
| Change Owner | DevOps Team |
| Risk Level | Medium |
| Downtime Required | No |
| Rollback Available | Yes |

### 1.2 Traffic Distribution

| Environment | Before | After | Change |
|-------------|--------|-------|--------|
| Canary | 10% | 25% | +15% |
| Stable | 90% | 75% | -15% |

---

## 2. Nginx Configuration Changes

### 2.1 Upstream Weight Configuration

**File:** `/configs/nginx/canary.conf`

#### Change Details

```diff
# AIAds Platform - Canary Release Configuration
- # Version: 1.0.0
- # Last Updated: 2026-03-24
- # Traffic Split: 10% Canary, 90% Stable
+ # Version: 1.1.0
+ # Last Updated: 2026-03-25
+ # Traffic Split: 25% Canary, 75% Stable

upstream aiads_canary {
    least_conn;

    # Primary canary server
-   server canary-1:3000 weight=1 max_fails=3 fail_timeout=30s;
+   server canary-1:3000 weight=25 max_fails=3 fail_timeout=30s;

    # Secondary canary server (for HA)
-   server canary-2:3000 weight=1 max_fails=3 fail_timeout=30s backup;
+   server canary-2:3000 weight=25 max_fails=3 fail_timeout=30s backup;

    keepalive 32;
    keepalive_timeout 60s;
    keepalive_requests 1000;
}

upstream aiads_stable {
    least_conn;

    # Primary stable servers
-   server stable-1:3000 weight=3 max_fails=3 fail_timeout=30s;
+   server stable-1:3000 weight=75 max_fails=3 fail_timeout=30s;
-   server stable-2:3000 weight=3 max_fails=3 fail_timeout=30s;
+   server stable-2:3000 weight=75 max_fails=3 fail_timeout=30s;
-   server stable-3:3000 weight=3 max_fails=3 fail_timeout=30s;
+   server stable-3:3000 weight=75 max_fails=3 fail_timeout=30s;

    keepalive 64;
    keepalive_timeout 60s;
    keepalive_requests 1000;
}
```

#### Weight Calculation

```
Canary Weight: 25 (25%)
Stable Weight: 75 (75%)
Total Weight:  100

Canary Ratio = 25 / (25 + 75) = 25%
Stable Ratio = 75 / (25 + 75) = 75%
```

### 2.2 Main Nginx Configuration

**File:** `/configs/nginx/nginx.conf`

#### Random Traffic Selection Update

```diff
location / {
    # Set canary flag based on various conditions
    set $canary_flag 0;

    # Check for canary user header
    if ($http_x_canary_user = "true") {
        set $canary_flag 1;
    }

    # Check for canary cookie
    if ($http_cookie ~* "canary=true") {
        set $canary_flag 1;
    }

    # Check for beta user group (from auth service)
    if ($http_x_user_group = "beta") {
        set $canary_flag 1;
    }

    # Random canary traffic for non-canary users
    if ($canary_flag = 0) {
        set $random_canary $random;
-       if ($random_canary < 0.1) {
+       if ($random_canary < 0.25) {
            set $canary_flag 1;
        }
    }

    # Route based on canary flag
    if ($canary_flag = 1) {
        proxy_pass http://aiads_canary;
    }

    proxy_pass http://aiads_stable;
}
```

### 2.3 Configuration Validation

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
-   description: "HPA for Canary Deployment - Conservative scaling"
+   description: "HPA for Canary Deployment - 25% Traffic - Aggressive scaling for increased traffic"
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: aiads-canary
- minReplicas: 2
- maxReplicas: 6
+ minReplicas: 4
+ maxReplicas: 12
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
```

#### Scaling Parameters

| Parameter | Before | After | Impact |
|-----------|--------|-------|--------|
| minReplicas | 2 | 4 | +100% baseline capacity |
| maxReplicas | 6 | 12 | +100% peak capacity |
| CPU Target | 70% | 70% | No change |
| Memory Target | 80% | 80% | No change |

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
- minReplicaCount: 2
- maxReplicaCount: 10
+ minReplicaCount: 4
+ maxReplicaCount: 12
  cooldownPeriod: 300
  pollingInterval: 30
```

### 3.3 Canary Deployment

**File:** `/configs/kubernetes/deployment-canary.yaml`

```diff
# AIAds Platform - Canary Deployment
- # Version: 1.0.0
- # Environment: Canary (10% Traffic)
- # Last Updated: 2026-03-24
+ # Version: 1.1.0
+ # Environment: Canary (25% Traffic)
+ # Last Updated: 2026-03-25

apiVersion: apps/v1
kind: Deployment
metadata:
  name: aiads-canary
  namespace: aiads
  labels:
    app: aiads
    environment: canary
    version: v1.1.0
    track: canary
  annotations:
-   description: "AIAds Canary Deployment - 10% Traffic"
+   description: "AIAds Canary Deployment - 25% Traffic"
    contact: "devops@aiads.com"
spec:
- replicas: 2
+ replicas: 4
  strategy:
    type: RollingUpdate
```

### 3.4 Kubernetes Commands

```bash
# Apply HPA changes
kubectl apply -f configs/kubernetes/hpa.yaml

# Apply deployment changes
kubectl apply -f configs/kubernetes/deployment-canary.yaml

# Verify HPA
kubectl get hpa -n aiads aiads-canary-hpa

# Expected output:
# NAME                 REFERENCE                     TARGETS   MINPODS   MAXPODS   REPLICAS
# aiads-canary-hpa     Deployment/aiads-canary       35%/70%   4         12        4

# Verify deployment
kubectl get deployment -n aiads aiads-canary

# Expected output:
# NAME             READY   UP-TO-DATE   AVAILABLE   AGE
# aiads-canary     4/4     4            4           30d

# Verify pods
kubectl get pods -n aiads -l environment=canary

# Expected output:
# NAME                              READY   STATUS    RESTARTS   AGE
# aiads-canary-xxxxx-aaaaa          1/1     Running   0          5m
# aiads-canary-xxxxx-bbbbb          1/1     Running   0          5m
# aiads-canary-xxxxx-ccccc          1/1     Running   0          5m
# aiads-canary-xxxxx-ddddd          1/1     Running   0          5m
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
-   percentage: 10, // 10% of users
+   percentage: 25, // 25% of users
  });

  // New dashboard feature
  this.flags.set('newDashboard', {
    name: 'newDashboard',
-   enabled: false,
-   percentage: 0,
+   enabled: true,
+   percentage: 25,
  });

  // AI matching feature
  this.flags.set('aiMatching', {
    name: 'aiMatching',
    enabled: true,
    percentage: 100,
  });

+ // AI matching v2 feature
+ this.flags.set('aiMatchingV2', {
+   name: 'aiMatchingV2',
+   enabled: true,
+   percentage: 25,
+ });

  // Payment V2 feature
  this.flags.set('paymentV2', {
    name: 'paymentV2',
    enabled: false,
    percentage: 0,
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
    "percentage": 25
  },
  "newDashboard": {
    "enabled": true,
    "percentage": 25
  },
  "aiMatchingV2": {
    "enabled": true,
    "percentage": 25
  },
  ...
}

# Test feature flag for user
curl -s -H "X-User-ID: test-user-123" https://aiads.com/api/feature-flags/canaryRelease | jq '.'
```

---

## 5. Traffic Verification

### 5.1 Verification Methods

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
echo "Expected: Canary ~25%, Stable ~75%"
```

#### Method 2: Prometheus Query

```promql
# Canary traffic percentage
sum(rate(http_requests_total{environment="canary"}[5m])) 
/ 
(sum(rate(http_requests_total{environment="canary"}[5m])) + sum(rate(http_requests_total{environment="stable"}[5m]))) 
* 100

# Expected result: ~25%
```

#### Method 3: Grafana Dashboard

Navigate to: https://grafana.aiads.com/d/canary-overview

Check panel: "Canary Traffic Share"
- Green zone: 23-27%
- Yellow zone: <23% or >27%

### 5.2 Verification Results

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Curl Loop (100 requests) | 25% canary | TBD | ⏳ Pending |
| Prometheus Query | ~25% | TBD | ⏳ Pending |
| Grafana Dashboard | 23-27% | TBD | ⏳ Pending |

---

## 6. Rollback Procedure

### 6.1 Nginx Rollback

```bash
# Backup current config
cp configs/nginx/canary.conf configs/nginx/canary.conf.25pct

# Restore previous config
cp configs/nginx/canary.conf.backup configs/nginx/canary.conf

# Validate and reload
nginx -t && nginx -s reload
```

### 6.2 Kubernetes Rollback

```bash
# Rollback HPA
kubectl rollout undo deployment/aiads-canary -n aiads

# Or manually set previous values
kubectl patch hpa aiads-canary-hpa -n aiads -p '{"spec":{"minReplicas":2,"maxReplicas":6}}'

# Rollback deployment replicas
kubectl scale deployment aiads-canary -n aiads --replicas=2
```

### 6.3 Feature Flag Rollback

```typescript
// Update featureFlag.service.ts
this.flags.set('canaryRelease', {
  name: 'canaryRelease',
  enabled: true,
  percentage: 10, // Revert to 10%
});

// Or via API
curl -X PUT https://aiads.com/api/feature-flags/canaryRelease \
  -H "Content-Type: application/json" \
  -d '{"percentage": 10}'
```

---

## 7. Testing Checklist

### 7.1 Pre-Deployment Tests

- [ ] Nginx configuration syntax validated (`nginx -t`)
- [ ] Kubernetes manifests validated (`kubectl apply --dry-run`)
- [ ] Feature flag unit tests passed
- [ ] Load testing completed

### 7.2 Post-Deployment Tests

- [ ] Traffic distribution verified (25% ±2%)
- [ ] Health checks passing
- [ ] No increase in error rate
- [ ] Latency within acceptable range
- [ ] HPA scaling correctly
- [ ] Feature flags evaluating correctly

### 7.3 Monitoring Verification

- [ ] Grafana dashboards updated
- [ ] Alert thresholds configured
- [ ] Log aggregation working
- [ ] Metrics collection active

---

## 8. Impact Assessment

### 8.1 Resource Impact

| Resource | Before | After | Change |
|----------|--------|-------|--------|
| Canary Pods (min) | 2 | 4 | +2 |
| Canary Pods (max) | 6 | 12 | +6 |
| CPU Request (total) | 500m | 1000m | +500m |
| Memory Request (total) | 1Gi | 2Gi | +1Gi |

### 8.2 Traffic Impact

| Metric | Before (10%) | After (25%) | Change |
|--------|--------------|-------------|--------|
| Requests/day | ~100K | ~250K | +150K |
| Peak QPS | ~10 | ~25 | +15 |
| Avg QPS | ~5 | ~12.5 | +7.5 |

### 8.3 User Impact

| User Segment | Before | After | Change |
|--------------|--------|-------|--------|
| Users seeing canary | 10% | 25% | +15% |
| Users with new features | 10% | 25% | +15% |
| Notification recipients | 10% | 25% | +15% |

---

## 9. Approval and Sign-off

### 9.1 Change Approval

| Role | Name | Approval Date | Status |
|------|------|---------------|--------|
| Change Manager | TBD | TBD | ⏳ Pending |
| DevOps Lead | TBD | TBD | ⏳ Pending |
| Engineering Lead | TBD | TBD | ⏳ Pending |

### 9.2 Verification Sign-off

| Test | Verified By | Date | Status |
|------|-------------|------|--------|
| Nginx config | TBD | TBD | ⏳ Pending |
| Kubernetes config | TBD | TBD | ⏳ Pending |
| Feature flags | TBD | TBD | ⏳ Pending |
| Traffic distribution | TBD | TBD | ⏳ Pending |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-25 | DevOps Team | Initial traffic configuration update |

---

## 11. Related Documents

- [Canary 25% Rollout Report](./CANARY_25_PERCENT_ROLLOUT.md)
- [Monitoring Configuration Update](./MONITORING_UPDATE.md)
- [Canary Release Plan](./CANARY_RELEASE_PLAN.md)
- [Rollback Plan](./ROLLBACK_PLAN.md)
