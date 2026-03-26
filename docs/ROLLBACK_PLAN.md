# AIAds Platform - Rollback Plan

**Document Version:** 1.0.0  
**Last Updated:** 2026-03-24  
**Author:** DevOps Team  
**Status:** Active

---

## 1. Overview

This document defines the rollback procedures for the AIAds platform canary release. The goal is to enable rapid recovery from any issues detected during the canary release, minimizing user impact.

### 1.1 Rollback Objectives

- **Decision Time:** < 5 minutes
- **Execution Time:** < 2 minutes
- **Verification Time:** < 3 minutes
- **Total Recovery Time:** < 10 minutes

### 1.2 Rollback Authority

| Role | Authority |
|------|-----------|
| On-Call Engineer | Can execute emergency rollback |
| Release Manager | Can approve planned rollback |
| DevOps Lead | Can approve major rollback decisions |

---

## 2. Rollback Triggers

### 2.1 Automatic Triggers

The following conditions will trigger an automatic rollback alert:

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error Rate (5xx) | > 5% for 2 minutes | Alert + Manual Review |
| Error Rate (5xx) | > 10% for 1 minute | Automatic Rollback |
| P95 Latency | > 1000ms for 5 minutes | Alert + Manual Review |
| P99 Latency | > 2000ms for 5 minutes | Alert + Manual Review |
| Pod CrashLoop | > 5 restarts in 5 minutes | Alert + Manual Review |
| Database Errors | > 100 errors/minute | Automatic Rollback |
| Memory Exhaustion | OOMKill detected | Automatic Rollback |

### 2.2 Manual Triggers

Manual rollback may be initiated for:

- P0/P1 incident declaration
- Critical security vulnerability discovered
- Data corruption detected
- User complaints surge
- Business metric degradation
- Third-party service dependency failure

---

## 3. Rollback Procedures

### 3.1 Emergency Rollback (Automatic)

```bash
#!/bin/bash
# emergency-rollback.sh - Automatic emergency rollback script

set -e

NAMESPACE="aiads"
CANARY_DEPLOYMENT="aiads-canary"
STABLE_DEPLOYMENT="aiads-stable"

echo "=== EMERGENCY ROLLBACK INITIATED ==="
echo "Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Reason: $1"

# Step 1: Cut canary traffic immediately
echo "[1/5] Cutting canary traffic..."
kubectl patch ingress aiads-canary-ingress -n $NAMESPACE \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# Step 2: Scale down canary deployment
echo "[2/5] Scaling down canary deployment..."
kubectl scale deployment $CANARY_DEPLOYMENT -n $NAMESPACE --replicas=0

# Step 3: Verify stable deployment is healthy
echo "[3/5] Verifying stable deployment..."
kubectl rollout status deployment/$STABLE_DEPLOYMENT -n $NAMESPACE --timeout=60s

# Step 4: Send notification
echo "[4/5] Sending notifications..."
curl -X POST -H 'Content-type: application/json' \
  --data "{\"text\":\"🚨 EMERGENCY ROLLBACK EXECUTED\\nReason: $1\\nTime: $(date)\"}" \
  $SLACK_WEBHOOK_URL

# Step 5: Log the incident
echo "[5/5] Logging incident..."
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ"),EMERGENCY_ROLLBACK,$1" >> /var/log/rollback.log

echo "=== ROLLBACK COMPLETE ==="
```

### 3.2 Standard Rollback (Manual)

#### Step 1: Confirm the Issue

```bash
# Check current deployment status
kubectl get deployments -n aiads
kubectl get pods -n aiads -l environment=canary

# Check recent events
kubectl get events -n aiads --sort-by='.lastTimestamp'

# Check application logs
kubectl logs -n aiads -l environment=canary --tail=100

# Check metrics
curl https://grafana.aiads.com/api/dashboards/canary-overview
```

#### Step 2: Decision Meeting (Quick Huddle)

Gather the following participants:
- On-Call Engineer
- Release Manager
- Product Owner (if available)

Decision criteria:
- Is the issue affecting users?
- Can it be fixed with a hotfix?
- Is rollback the safest option?

#### Step 3: Execute Rollback

```bash
# Method 1: Kubernetes Rollout Undo
kubectl rollout undo deployment/aiads-canary -n aiads

# Method 2: Rollback to specific revision
# First, find the revision
kubectl rollout history deployment/aiads-canary -n aiads

# Then rollback to specific revision
kubectl rollout undo deployment/aiads-canary -n aiads --to-revision=1

# Method 3: Update to previous stable version
kubectl set image deployment/aiads-canary aiads=aiads/platform:v1.0.0-stable -n aiads
```

#### Step 4: Cut Traffic to Canary

```bash
# Update Nginx configuration
kubectl patch ingress aiads-canary-ingress -n aiads \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# Or reload Nginx for standalone setup
kubectl rollout restart deployment/nginx-ingress -n ingress-nginx
```

#### Step 5: Verify Rollback

```bash
# Wait for rollback to complete
kubectl rollout status deployment/aiads-canary -n aiads --timeout=120s

# Verify pods are running previous version
kubectl get pods -n aiads -l environment=canary -o jsonpath='{.items[*].spec.containers[*].image}'

# Check health endpoints
curl https://canary.aiads.com/health

# Verify error rates have normalized
# Check Grafana dashboard
```

---

## 4. Rollback Verification Checklist

### 4.1 Technical Verification

- [ ] All canary pods running previous version
- [ ] Error rate returned to baseline (< 1%)
- [ ] P95 latency returned to normal (< 300ms)
- [ ] Health checks passing
- [ ] No new alerts firing
- [ ] Database connections stable
- [ ] Cache hit rates normal

### 4.2 Business Verification

- [ ] User complaints stopped increasing
- [ ] Conversion rate stable
- [ ] No revenue impact detected
- [ ] Support ticket volume normal

---

## 5. Post-Rollback Actions

### 5.1 Immediate Actions (Within 1 hour)

1. **Incident Documentation**
   - Create incident ticket
   - Document timeline of events
   - Collect relevant logs and metrics

2. **Team Notification**
   - Notify all stakeholders
   - Update status page if needed
   - Schedule post-mortem meeting

3. **System Stabilization**
   - Monitor for any residual issues
   - Ensure stable environment is handling full load
   - Verify auto-scaling is working correctly

### 5.2 Short-term Actions (Within 24 hours)

1. **Root Cause Analysis**
   - Identify the root cause
   - Document findings
   - Create action items

2. **Fix Development**
   - Create fix branch
   - Implement and test fix
   - Schedule new canary release

3. **Communication**
   - Send incident summary to stakeholders
   - Update internal wiki
   - Prepare user communication if needed

### 5.3 Long-term Actions (Within 1 week)

1. **Post-Mortem Meeting**
   - Conduct blameless post-mortem
   - Document lessons learned
   - Create preventive measures

2. **Process Improvements**
   - Update runbooks
   - Improve monitoring
   - Enhance testing procedures

3. **Preventive Measures**
   - Add new alert rules
   - Implement additional tests
   - Update deployment procedures

---

## 6. Rollback Decision Matrix

| Scenario | Severity | Decision | Timeline |
|----------|----------|----------|----------|
| Error rate > 10% | P0 | Automatic Rollback | Immediate |
| Error rate 5-10% | P1 | Manual Review → Rollback | < 5 min |
| P99 latency > 2s | P1 | Manual Review → Rollback | < 10 min |
| Data corruption | P0 | Automatic Rollback | Immediate |
| Security vulnerability | P0 | Automatic Rollback | Immediate |
| Minor UI issues | P3 | Fix Forward | Next release |
| Performance degradation < 20% | P2 | Monitor → Fix Forward | 24 hours |

---

## 7. Communication Templates

### 7.1 Internal Alert (Slack)

```
🚨 **CANARY ROLLBACK INITIATED**

**Environment:** Canary (10% traffic)
**Time:** {{timestamp}}
**Reason:** {{reason}}
**Severity:** {{severity}}

**Actions Taken:**
1. Canary traffic cut to 0%
2. Canary deployment scaled down
3. Stable environment verified

**Next Steps:**
- Incident investigation in progress
- Post-mortem scheduled for {{time}}

**On-Call:** {{oncall_name}}
```

### 7.2 Status Page Update

```
**Incident Update: {{timestamp}}**

We detected an issue affecting a small subset of users and have automatically 
rolled back the changes. All services are now operating normally.

**Impact:** Limited to 10% of users for approximately {{duration}}
**Resolution:** Automatic rollback to previous stable version
**Status:** Resolved

We are conducting a thorough investigation to prevent recurrence.
```

### 7.3 Stakeholder Email

```
Subject: Incident Report - Canary Rollback on {{date}}

Dear Stakeholders,

This email is to inform you of a brief incident during our canary release today.

**Summary:**
- Time: {{timestamp}}
- Duration: {{duration}}
- Impact: {{impact_description}}
- Resolution: Rollback to stable version

**Current Status:**
All systems are operating normally. No data loss occurred.

**Next Steps:**
A detailed post-mortem will be conducted and shared within 48 hours.

Regards,
DevOps Team
```

---

## 8. Contacts and Escalation

### 8.1 Primary Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | TBD | +1-XXX-XXX-XXXX | oncall@aiads.com |
| Release Manager | TBD | +1-XXX-XXX-XXXX | release@aiads.com |
| DevOps Lead | TBD | +1-XXX-XXX-XXXX | devops-lead@aiads.com |

### 8.2 Escalation Path

```
Level 1: On-Call Engineer (0-5 min)
    ↓
Level 2: Release Manager (5-15 min)
    ↓
Level 3: DevOps Lead (15-30 min)
    ↓
Level 4: CTO (30+ min)
```

---

## 9. Appendix

### 9.1 Quick Reference Commands

```bash
# Check deployment status
kubectl get deployments -n aiads

# View rollout history
kubectl rollout history deployment/aiads-canary -n aiads

# Rollback command
kubectl rollout undo deployment/aiads-canary -n aiads

# Scale down canary
kubectl scale deployment/aiads-canary -n aiads --replicas=0

# Cut canary traffic
kubectl patch ingress aiads-canary-ingress -n aiads \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# Check pod logs
kubectl logs -n aiads -l environment=canary --tail=100

# Describe pod for events
kubectl describe pod -n aiads -l environment=canary
```

### 9.2 Related Documents

- [Canary Release Plan](./CANARY_RELEASE_PLAN.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Incident Response Runbook](./INCIDENT_RESPONSE.md)

### 9.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-24 | DevOps Team | Initial release |
