# AIAds Platform - Production Environment Configuration

**Document Version:** 1.0.0
**Last Updated:** 2026-05-06
**Environment:** Production (100% Traffic)
**Release Version:** v1.3.0

---

## 1. Overview

This document describes the complete production environment configuration for the AIAds platform following the 100% full launch.

### 1.1 Production Status

| Attribute | Value |
|-----------|-------|
| Environment | Production |
| Traffic Share | 100% |
| Version | v1.3.0 |
| Launch Date | 2026-05-06 |
| Status | ✅ Live |

---

## 2. Infrastructure Configuration

### 2.1 Kubernetes Deployment

**File:** `/configs/kubernetes/deployment-production.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aiads-production
  namespace: aiads
  labels:
    app: aiads
    environment: production
    version: v1.3.0
spec:
  replicas: 12
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 0
```

#### Deployment Details

| Parameter | Value | Description |
|-----------|-------|-------------|
| Name | aiads-production | Production deployment name |
| Namespace | aiads | Kubernetes namespace |
| Replicas | 12 | Number of pod replicas |
| Max Surge | 2 | Max pods during update |
| Max Unavailable | 0 | Zero downtime deployment |

#### Container Configuration

| Parameter | Request | Limit |
|-----------|---------|-------|
| CPU | 500m | 2000m |
| Memory | 1Gi | 2Gi |

#### Environment Variables

```yaml
env:
- name: NODE_ENV
  value: "production"
- name: ENVIRONMENT
  value: "production"
- name: VERSION
  value: "v1.3.0"
- name: CANARY_RELEASE
  value: "false"
- name: LOG_LEVEL
  value: "info"
- name: ENABLE_NEW_DASHBOARD
  value: "true"
- name: ENABLE_AI_MATCHING
  value: "true"
- name: ENABLE_AI_MATCHING_V2
  value: "true"
```

### 2.2 Horizontal Pod Autoscaler (HPA)

**File:** `/configs/kubernetes/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: aiads-production-hpa
spec:
  scaleTargetRef:
    name: aiads-production
  minReplicas: 12
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        averageUtilization: 75
  - type: Pods
    pods:
      metric:
        name: p95_latency_ms
      target:
        averageValue: "150"
```

#### HPA Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Min Replicas | 12 | Minimum pods |
| Max Replicas | 30 | Maximum pods |
| CPU Target | 60% | Scale when CPU > 60% |
| Memory Target | 75% | Scale when Memory > 75% |
| P95 Latency | 150ms | Scale when P95 > 150ms |

### 2.3 Service Configuration

**File:** `/configs/kubernetes/service-canary.yaml` (repurposed for production)

```yaml
apiVersion: v1
kind: Service
metadata:
  name: aiads-canary
  namespace: aiads
spec:
  type: ClusterIP
  selector:
    app: aiads
    environment: production
  ports:
  - name: http
    port: 80
    targetPort: 3000
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

---

## 3. Nginx Configuration

### 3.1 Upstream Configuration

**File:** `/configs/nginx/canary.conf`

```nginx
# Production Upstream (100% Traffic)
upstream aiads_canary {
    least_conn;
    server canary-1:3000 weight=100 max_fails=3 fail_timeout=30s;
    server canary-2:3000 weight=100 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

# Stable Upstream (Backup/Rollback)
upstream aiads_stable {
    least_conn;
    server stable-1:3000 weight=0 backup max_fails=3 fail_timeout=30s;
    server stable-2:3000 weight=0 backup max_fails=3 fail_timeout=30s;
    server stable-3:3000 weight=0 backup max_fails=3 fail_timeout=30s;
    keepalive 32;
}
```

### 3.2 Server Configuration

**File:** `/configs/nginx/nginx.conf`

```nginx
# HTTPS server with production routing (100% traffic)
server {
    listen 443 ssl http2;
    server_name aiads.com www.aiads.com;

    # Root location - 100% traffic to production
    location / {
        proxy_pass http://aiads_canary;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # API routes with rate limiting
    location /api/ {
        limit_req zone=api_limit burst=200 nodelay;
        proxy_pass http://aiads_canary;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://aiads_canary;
    }
}
```

---

## 4. Feature Flags Configuration

### 4.1 Production Feature Flags

**File:** `/services/featureFlag.service.ts`

| Feature | Enabled | Percentage | Description |
|---------|---------|------------|-------------|
| canaryRelease | ❌ false | 100% | Canary release completed |
| newDashboard | ✅ true | 100% | New dashboard UI |
| aiMatching | ✅ true | 100% | AI matching v1 |
| aiMatchingV2 | ✅ true | 100% | AI matching v2 |
| newRecommendationEngine | ✅ true | 100% | New recommendation engine |
| darkMode | ✅ true | 100% | Dark mode theme |
| paymentV2 | ❌ false | 0% | Future payment system |

### 4.2 Feature Flag Code

```typescript
// Production feature flags
this.flags.set('canaryRelease', {
  name: 'canaryRelease',
  enabled: false,  // Canary completed
  percentage: 100,
});

this.flags.set('newDashboard', {
  name: 'newDashboard',
  enabled: true,
  percentage: 100,
});

this.flags.set('aiMatchingV2', {
  name: 'aiMatchingV2',
  enabled: true,
  percentage: 100,
});
```

---

## 5. Monitoring Configuration

### 5.1 Alert Thresholds

**File:** `/configs/monitoring/alerting.yml`

#### Production Alerts

| Alert Name | Expression | Threshold | Duration | Severity |
|------------|------------|-----------|----------|----------|
| ProductionHighErrorRate | error_rate | > 1% | 2m | Critical |
| ProductionHighLatencyP95 | p95_latency | > 150ms | 5m | Warning |
| ProductionHighLatencyP99 | p99_latency | > 300ms | 5m | Critical |
| ProductionPodRestartLoop | restarts | > 3/hour | 5m | Warning |
| ProductionMemoryPressure | memory_usage | > 85% | 5m | Warning |
| ProductionCPUPressure | cpu_usage | > 85% | 5m | Warning |
| ProductionLowReplicas | available_replicas | < 90% | 5m | Critical |

### 5.2 Grafana Dashboard

**File:** `/configs/monitoring/grafana-dashboards.json`

#### Dashboard Information

| Attribute | Value |
|-----------|-------|
| Title | AIAds Production Dashboard - 100% Traffic |
| UID | aiads-production-overview |
| Refresh | 30s |
| Time Range | Last 1 hour |
| Panels | 19 |

#### Key Panels

1. Production Status - Pod count
2. Request Rate (QPS)
3. Error Rate (%)
4. P50/P95/P99 Latency
5. CPU/Memory Usage
6. Traffic Share (100%)
7. Active Users
8. Total Requests (24h)
9. Top Error Endpoints
10. Slowest Endpoints
11. Database Connections
12. Redis Operations
13. Availability (24h)
14. Deployment Version
15. Replicas (Ready/Desired)

---

## 6. Database Configuration

### 6.1 PostgreSQL Connection

```yaml
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: aiads-db-secret
      key: url
```

#### Connection Pool Settings

| Parameter | Value |
|-----------|-------|
| Max Connections | 100 |
| Min Connections | 10 |
| Connection Timeout | 30s |
| Idle Timeout | 600s |

### 6.2 Redis Configuration

```yaml
env:
- name: REDIS_URL
  valueFrom:
    secretKeyRef:
      name: aiads-redis-secret
      key: url
```

#### Redis Settings

| Parameter | Value |
|-----------|-------|
| Max Connections | 50 |
| Pool Size | 20 |
| Timeout | 5s |
| Retry Attempts | 3 |

---

## 7. Security Configuration

### 7.1 SSL/TLS

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
```

### 7.2 Security Headers

```nginx
add_header Strict-Transport-Security "max-age=63072000" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### 7.3 Kubernetes Security

```yaml
securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
```

---

## 8. Resource Quotas

### 8.1 Namespace Quotas

**File:** `/configs/kubernetes/hpa.yaml`

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: aiads-quota
  namespace: aiads
spec:
  hard:
    requests.cpu: "50"
    requests.memory: "100Gi"
    limits.cpu: "100"
    limits.memory: "200Gi"
    pods: "100"
```

### 8.2 Container Limits

| Resource | Min | Default Request | Default Limit | Max |
|----------|-----|-----------------|---------------|-----|
| CPU | 100m | 250m | 1000m | 4000m |
| Memory | 128Mi | 512Mi | 1Gi | 8Gi |

---

## 9. Backup and Rollback

### 9.1 Stable Environment (Backup)

The stable environment is retained as a backup for emergency rollback.

| Parameter | Value |
|-----------|-------|
| Deployment | aiads-stable |
| Replicas | 6 |
| Traffic Weight | 0 (backup only) |
| Status | Standby |

### 9.2 Rollback Procedure

```bash
# Emergency rollback to stable
# 1. Update Nginx to route traffic to stable
cp configs/nginx/canary.conf.backup configs/nginx/canary.conf
nginx -s reload

# 2. Scale down production
kubectl scale deployment aiads-production -n aiads --replicas=0

# 3. Scale up stable
kubectl scale deployment aiads-stable -n aiads --replicas=12
```

---

## 10. Access Information

### 10.1 Endpoints

| Service | URL | Environment |
|---------|-----|-------------|
| Main Website | https://aiads.com | Production |
| API | https://api.aiads.com | Production |
| Admin | https://admin.aiads.com | Production |
| Health Check | https://aiads.com/health | Production |

### 10.2 Monitoring Dashboards

| Dashboard | URL |
|-----------|-----|
| Production Overview | https://grafana.aiads.com/d/production-overview |
| Application Metrics | https://grafana.aiads.com/d/app-metrics |
| Kubernetes | https://grafana.aiads.com/d/kubernetes-overview |

### 10.3 Contact Information

| Role | Contact |
|------|---------|
| DevOps | devops@aiads.com |
| On-Call | oncall@aiads.com |
| Product | product@aiads.com |

---

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-05-06 | DevOps Team | Initial production configuration |

---

**Document Status:** ✅ Complete
**Review Schedule:** Monthly or after major changes
