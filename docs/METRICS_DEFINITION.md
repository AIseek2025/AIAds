# AIAds Platform - Metrics Definition Document

**Document Version:** 1.0.0
**Last Updated:** 2026-03-24
**Author:** Data Analytics Team
**Status:** Active

---

## 1. Overview

This document defines all metrics tracked by the AIAds platform during the canary release. Each metric includes its definition, calculation formula, data source, and target thresholds.

### 1.1 Metric Categories

| Category | Description | Metrics Count |
|----------|-------------|---------------|
| Traffic Metrics | User visits and engagement | 12 |
| Conversion Metrics | Funnel conversion rates | 8 |
| Performance Metrics | System performance | 10 |
| Business Metrics | Revenue and transactions | 8 |
| User Metrics | User growth and retention | 10 |
| Quality Metrics | Error rates and issues | 6 |

---

## 2. Traffic Metrics

### 2.1 Page Views (PV)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-001 |
| **Definition** | Total number of page views |
| **Formula** | `COUNT(event_name = 'page_view')` |
| **Unit** | Count |
| **Granularity** | Real-time, Hourly, Daily |
| **Dimensions** | environment, page_path, user_type, device_type |
| **Data Source** | analytics.events_raw |

**SQL Query:**
```sql
SELECT 
  toDate(timestamp) as date,
  environment,
  COUNT(*) as page_views
FROM analytics.events_raw
WHERE event_name = 'page_view'
GROUP BY date, environment
ORDER BY date DESC;
```

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 10,000/day | 50,000/day | 100,000/day |
| Stable | 90,000/day | 450,000/day | 900,000/day |

---

### 2.2 Unique Visitors (UV)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-002 |
| **Definition** | Number of unique users visiting the platform |
| **Formula** | `COUNT(DISTINCT user_id)` |
| **Unit** | Count |
| **Granularity** | Daily, Weekly, Monthly |
| **Dimensions** | environment, user_type, country, device_type |
| **Data Source** | analytics.events_raw |

**SQL Query:**
```sql
SELECT 
  toDate(timestamp) as date,
  environment,
  COUNT(DISTINCT user_id) as unique_visitors
FROM analytics.events_raw
WHERE user_id IS NOT NULL
GROUP BY date, environment
ORDER BY date DESC;
```

---

### 2.3 Sessions

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-003 |
| **Definition** | Number of user sessions (30-minute inactivity timeout) |
| **Formula** | `COUNT(DISTINCT session_id)` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type, traffic_source |
| **Data Source** | analytics.user_sessions |

**Session Definition:**
- A session starts when a user first visits the platform
- A session ends after 30 minutes of inactivity or when the user closes the browser
- A new session is created when the user returns after session end

---

### 2.4 Average Session Duration

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-004 |
| **Definition** | Average time users spend per session |
| **Formula** | `AVG(session_end_time - session_start_time)` |
| **Unit** | Seconds |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.user_sessions |

**SQL Query:**
```sql
SELECT 
  toDate(start_time) as date,
  environment,
  AVG(duration_seconds) as avg_session_duration
FROM analytics.user_sessions
GROUP BY date, environment
ORDER BY date DESC;
```

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 120s | 300s | 600s |
| Stable | 120s | 300s | 600s |

---

### 2.5 Pages Per Session

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-005 |
| **Definition** | Average number of pages viewed per session |
| **Formula** | `SUM(page_views) / COUNT(DISTINCT session_id)` |
| **Unit** | Pages |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.user_sessions |

---

### 2.6 Bounce Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-006 |
| **Definition** | Percentage of single-page sessions |
| **Formula** | `(Sessions with 1 page view / Total Sessions) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, page_path, traffic_source |
| **Data Source** | analytics.user_sessions |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 50% | 40% | 30% |
| Stable | 50% | 40% | 30% |

---

### 2.7 Traffic Source Distribution

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-007 |
| **Definition** | Distribution of traffic by source |
| **Formula** | `COUNT(session_id) GROUP BY traffic_source` |
| **Unit** | Count, Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, traffic_source, medium |
| **Data Source** | analytics.events_raw (context.page.referrer) |

**Traffic Sources:**
- Organic Search
- Paid Search
- Social Media
- Direct
- Referral
- Email

---

### 2.8 New vs Returning Users

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-008 |
| **Definition** | Ratio of new to returning users |
| **Formula** | `COUNT(first_time_users) / COUNT(returning_users)` |
| **Unit** | Ratio |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.events_raw |

---

### 2.9 Active Users (DAU/MAU)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-009 |
| **Definition** | Daily and Monthly Active Users |
| **Formula** | `COUNT(DISTINCT user_id) WHERE timestamp >= now() - INTERVAL 1 DAY` |
| **Unit** | Count |
| **Granularity** | Daily, Monthly |
| **Dimensions** | environment, user_type, country |
| **Data Source** | analytics.events_raw |

**DAU Query:**
```sql
SELECT 
  toDate(timestamp) as date,
  environment,
  user_type,
  COUNT(DISTINCT user_id) as dau
FROM analytics.events_raw
WHERE user_id IS NOT NULL
GROUP BY date, environment, user_type
ORDER BY date DESC;
```

**MAU Query:**
```sql
SELECT 
  toYYYYMM(timestamp) as month,
  environment,
  user_type,
  COUNT(DISTINCT user_id) as mau
FROM analytics.events_raw
WHERE user_id IS NOT NULL
  AND timestamp >= now() - INTERVAL 30 DAY
GROUP BY month, environment, user_type
ORDER BY month DESC;
```

---

### 2.10 Stickiness Ratio (DAU/MAU)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-010 |
| **Definition** | Ratio of daily to monthly active users |
| **Formula** | `(DAU / MAU) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type |
| **Data Source** | Calculated from DAU and MAU |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 15% | 25% | 40% |
| Stable | 15% | 25% | 40% |

---

### 2.11 Peak Concurrent Users

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-011 |
| **Definition** | Maximum number of concurrent users |
| **Formula** | `MAX(active_users_per_minute)` |
| **Unit** | Count |
| **Granularity** | Hourly, Daily |
| **Dimensions** | environment |
| **Data Source** | analytics.events_raw (real-time aggregation) |

---

### 2.12 Requests Per Second (QPS)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | TRF-012 |
| **Definition** | Number of HTTP requests per second |
| **Formula** | `COUNT(http_requests) / time_window_seconds` |
| **Unit** | Requests/second |
| **Granularity** | Real-time, Minute |
| **Dimensions** | environment, endpoint, method |
| **Data Source** | Prometheus http_requests_total |

---

## 3. Conversion Metrics

### 3.1 Registration Conversion Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-001 |
| **Definition** | Percentage of visitors who register |
| **Formula** | `(Registrations / Unique Visitors) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type, registration_method |
| **Data Source** | analytics.events_raw |

**SQL Query:**
```sql
SELECT 
  toDate(timestamp) as date,
  environment,
  SUM(CASE WHEN event_name = 'advertiser_registered' THEN 1 ELSE 0 END) as advertiser_regs,
  SUM(CASE WHEN event_name = 'kol_registered' THEN 1 ELSE 0 END) as kol_regs,
  COUNT(DISTINCT user_id) as visitors,
  (advertiser_regs + kol_regs) * 100.0 / visitors as registration_rate
FROM analytics.events_raw
GROUP BY date, environment
ORDER BY date DESC;
```

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 2% | 5% | 10% |
| Stable | 2% | 5% | 10% |

---

### 3.2 Profile Completion Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-002 |
| **Definition** | Percentage of users who complete their profile |
| **Formula** | `(Users with complete profile / Total registered users) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.events_raw + users table |

---

### 3.3 Campaign Creation Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-003 |
| **Definition** | Percentage of advertisers who create a campaign |
| **Formula** | `(Advertisers who created campaign / Total advertisers) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, campaign_type |
| **Data Source** | analytics.events_raw |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 20% | 40% | 60% |
| Stable | 20% | 40% | 60% |

---

### 3.4 KOL Account Connection Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-004 |
| **Definition** | Percentage of KOLs who connect social accounts |
| **Formula** | `(KOLs with connected accounts / Total KOLs) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, platform |
| **Data Source** | analytics.events_raw |

---

### 3.5 KOL Search to Order Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-005 |
| **Definition** | Percentage of KOL searches that result in an order |
| **Formula** | `(Orders / KOL Searches) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, advertiser_segment |
| **Data Source** | analytics.events_raw |

---

### 3.6 Order Creation Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-006 |
| **Definition** | Percentage of campaigns that result in orders |
| **Formula** | `(Orders / Campaigns) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, campaign_type |
| **Data Source** | analytics.events_raw |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 30% | 50% | 70% |
| Stable | 30% | 50% | 70% |

---

### 3.7 Payment Completion Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-007 |
| **Definition** | Percentage of orders that are paid |
| **Formula** | `(Payments / Orders) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, payment_method |
| **Data Source** | analytics.events_raw |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 70% | 85% | 95% |
| Stable | 70% | 85% | 95% |

---

### 3.8 Overall Conversion Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | CNV-008 |
| **Definition** | End-to-end conversion from visit to payment |
| **Formula** | `(Payments / Unique Visitors) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, user_journey |
| **Data Source** | analytics.events_raw |

---

## 4. Performance Metrics

### 4.1 API Response Time (P50)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-001 |
| **Definition** | 50th percentile API response time |
| **Formula** | `quantile(0.50)(response_time_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Real-time, Hourly |
| **Dimensions** | environment, endpoint, method |
| **Data Source** | Prometheus http_request_duration_seconds |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 100ms | 50ms | 30ms |
| Stable | 100ms | 50ms | 30ms |

---

### 4.2 API Response Time (P95)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-002 |
| **Definition** | 95th percentile API response time |
| **Formula** | `quantile(0.95)(response_time_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Real-time, Hourly |
| **Dimensions** | environment, endpoint, method |
| **Data Source** | Prometheus http_request_duration_seconds |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 300ms | 200ms | 150ms |
| Stable | 300ms | 200ms | 150ms |

---

### 4.3 API Response Time (P99)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-003 |
| **Definition** | 99th percentile API response time |
| **Formula** | `quantile(0.99)(response_time_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Real-time, Hourly |
| **Dimensions** | environment, endpoint, method |
| **Data Source** | Prometheus http_request_duration_seconds |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 500ms | 350ms | 250ms |
| Stable | 500ms | 350ms | 250ms |

---

### 4.4 Page Load Time

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-004 |
| **Definition** | Time to fully load a page |
| **Formula** | `AVG(page_load_time_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Daily |
| **Dimensions** | environment, page_path, device_type |
| **Data Source** | analytics.events_raw (page_view properties) |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 3000ms | 2000ms | 1500ms |
| Stable | 3000ms | 2000ms | 1500ms |

---

### 4.5 Time to First Byte (TTFB)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-005 |
| **Definition** | Time until first byte of response |
| **Formula** | `AVG(ttfb_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Hourly |
| **Dimensions** | environment, endpoint |
| **Data Source** | Prometheus http_ttfb_seconds |

---

### 4.6 Time to Interactive (TTI)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-006 |
| **Definition** | Time until page is fully interactive |
| **Formula** | `AVG(tti_ms)` |
| **Unit** | Milliseconds |
| **Granularity** | Daily |
| **Dimensions** | environment, page_path |
| **Data Source** | Frontend performance API |

---

### 4.7 Error Rate (4xx)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-007 |
| **Definition** | Percentage of 4xx client errors |
| **Formula** | `(4xx responses / Total responses) * 100` |
| **Unit** | Percentage |
| **Granularity** | Real-time, Hourly |
| **Dimensions** | environment, endpoint, error_code |
| **Data Source** | Prometheus http_requests_total{status=~"4.."} |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 5% | 2% | 1% |
| Stable | 5% | 2% | 1% |

---

### 4.8 Error Rate (5xx)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-008 |
| **Definition** | Percentage of 5xx server errors |
| **Formula** | `(5xx responses / Total responses) * 100` |
| **Unit** | Percentage |
| **Granularity** | Real-time, Hourly |
| **Dimensions** | environment, endpoint, error_code |
| **Data Source** | Prometheus http_requests_total{status=~"5.."} |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 1% | 0.5% | 0.1% |
| Stable | 1% | 0.5% | 0.1% |

---

### 4.9 CPU Usage

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-009 |
| **Definition** | Average CPU utilization |
| **Formula** | `AVG(cpu_usage_percent)` |
| **Unit** | Percentage |
| **Granularity** | Real-time, Minute |
| **Dimensions** | environment, pod, node |
| **Data Source** | Prometheus node_cpu_seconds_total |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 80% | 60% | 40% |
| Stable | 80% | 60% | 40% |

---

### 4.10 Memory Usage

| Attribute | Value |
|-----------|-------|
| **Metric ID** | PRF-010 |
| **Definition** | Average memory utilization |
| **Formula** | `AVG(memory_usage_percent)` |
| **Unit** | Percentage |
| **Granularity** | Real-time, Minute |
| **Dimensions** | environment, pod, node |
| **Data Source** | Prometheus container_memory_usage_bytes |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 80% | 60% | 40% |
| Stable | 80% | 60% | 40% |

---

## 5. Business Metrics

### 5.1 Gross Merchandise Value (GMV)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-001 |
| **Definition** | Total value of all orders |
| **Formula** | `SUM(order_value)` |
| **Unit** | USD |
| **Granularity** | Daily, Weekly, Monthly |
| **Dimensions** | environment, campaign_type, platform |
| **Data Source** | analytics.events_raw (order_created, payment_completed) |

**SQL Query:**
```sql
SELECT 
  toDate(timestamp) as date,
  environment,
  SUM(JSONExtractFloat(properties, 'order_value')) as gmv
FROM analytics.events_raw
WHERE event_name = 'order_created'
GROUP BY date, environment
ORDER BY date DESC;
```

---

### 5.2 Revenue

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-002 |
| **Definition** | Platform revenue (commission) |
| **Formula** | `SUM(order_value * commission_rate)` |
| **Unit** | USD |
| **Granularity** | Daily, Weekly, Monthly |
| **Dimensions** | environment, revenue_type |
| **Data Source** | orders table + payments table |

---

### 5.3 Average Order Value (AOV)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-003 |
| **Definition** | Average value per order |
| **Formula** | `SUM(order_value) / COUNT(orders)` |
| **Unit** | USD |
| **Granularity** | Daily |
| **Dimensions** | environment, campaign_type |
| **Data Source** | analytics.events_raw |

---

### 5.4 Number of Campaigns

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-004 |
| **Definition** | Total number of active campaigns |
| **Formula** | `COUNT(campaigns WHERE status = 'active')` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, campaign_type, status |
| **Data Source** | campaigns table |

---

### 5.5 Number of Orders

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-005 |
| **Definition** | Total number of orders |
| **Formula** | `COUNT(orders)` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, status, platform |
| **Data Source** | analytics.events_raw (order_created) |

---

### 5.6 Number of Active KOLs

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-006 |
| **Definition** | KOLs with at least one active task |
| **Formula** | `COUNT(DISTINCT kol_id WHERE task_status = 'active')` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, platform, category |
| **Data Source** | kols table + tasks table |

---

### 5.7 KOL Earnings

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-007 |
| **Definition** | Total earnings paid to KOLs |
| **Formula** | `SUM(withdrawal_amount)` |
| **Unit** | USD |
| **Granularity** | Daily, Weekly, Monthly |
| **Dimensions** | environment, platform, withdrawal_method |
| **Data Source** | withdrawals table |

---

### 5.8 Take Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | BUS-008 |
| **Definition** | Platform commission as percentage of GMV |
| **Formula** | `(Revenue / GMV) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment |
| **Data Source** | Calculated from Revenue and GMV |

---

## 6. User Metrics

### 6.1 New Advertisers

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-001 |
| **Definition** | Number of new advertiser registrations |
| **Formula** | `COUNT(event_name = 'advertiser_registered')` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, registration_method, country |
| **Data Source** | analytics.events_raw |

---

### 6.2 New KOLs

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-002 |
| **Definition** | Number of new KOL registrations |
| **Formula** | `COUNT(event_name = 'kol_registered')` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, platform, country |
| **Data Source** | analytics.events_raw |

---

### 6.3 User Growth Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-003 |
| **Definition** | Week-over-week user growth |
| **Formula** | `((Current Week Users - Previous Week Users) / Previous Week Users) * 100` |
| **Unit** | Percentage |
| **Granularity** | Weekly |
| **Dimensions** | environment, user_type |
| **Data Source** | Calculated from user counts |

---

### 6.4 User Demographics - Country

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-004 |
| **Definition** | Distribution of users by country |
| **Formula** | `COUNT(user_id) GROUP BY country` |
| **Unit** | Count, Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, user_type, country |
| **Data Source** | users table |

---

### 6.5 User Demographics - Industry

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-005 |
| **Definition** | Distribution of advertisers by industry |
| **Formula** | `COUNT(advertiser_id) GROUP BY industry` |
| **Unit** | Count, Percentage |
| **Granularity** | Monthly |
| **Dimensions** | environment, industry |
| **Data Source** | advertisers table |

---

### 6.6 KOL Follower Distribution

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-006 |
| **Definition** | Distribution of KOLs by follower count |
| **Formula** | `COUNT(kol_id) GROUP BY follower_range` |
| **Unit** | Count, Percentage |
| **Granularity** | Monthly |
| **Dimensions** | environment, platform, follower_range |
| **Data Source** | kols table |

**Follower Ranges:**
- Nano: < 10K
- Micro: 10K - 100K
- Mid-tier: 100K - 500K
- Macro: 500K - 1M
- Mega: > 1M

---

### 6.7 Next-Day Retention

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-007 |
| **Definition** | Percentage of users who return the next day |
| **Formula** | `(Users active on Day+1 / Users active on Day 1) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily (cohort-based) |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.user_retention |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 30% | 45% | 60% |
| Stable | 30% | 45% | 60% |

---

### 6.8 7-Day Retention

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-008 |
| **Definition** | Percentage of users who return within 7 days |
| **Formula** | `(Users active within 7 days / Users on Day 1) * 100` |
| **Unit** | Percentage |
| **Granularity** | Weekly (cohort-based) |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.user_retention |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 15% | 25% | 40% |
| Stable | 15% | 25% | 40% |

---

### 6.9 30-Day Retention

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-009 |
| **Definition** | Percentage of users who return within 30 days |
| **Formula** | `(Users active within 30 days / Users on Day 1) * 100` |
| **Unit** | Percentage |
| **Granularity** | Monthly (cohort-based) |
| **Dimensions** | environment, user_type |
| **Data Source** | analytics.user_retention |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 10% | 20% | 35% |
| Stable | 10% | 20% | 35% |

---

### 6.10 Churn Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | USR-010 |
| **Definition** | Percentage of users who haven't returned in 30 days |
| **Formula** | `(Users inactive for 30 days / Total users) * 100` |
| **Unit** | Percentage |
| **Granularity** | Monthly |
| **Dimensions** | environment, user_type, churn_reason |
| **Data Source** | users table + activity logs |

---

## 7. Quality Metrics

### 7.1 Application Error Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-001 |
| **Definition** | Percentage of sessions with application errors |
| **Formula** | `(Sessions with errors / Total sessions) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, error_type, severity |
| **Data Source** | analytics.events_raw (error_occurred) |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 2% | 1% | 0.5% |
| Stable | 2% | 1% | 0.5% |

---

### 7.2 Crash Rate

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-002 |
| **Definition** | Percentage of sessions that end in crash |
| **Formula** | `(Crash sessions / Total sessions) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily |
| **Dimensions** | environment, device_type, os_version |
| **Data Source** | analytics.events_raw (error_occurred with severity=critical) |

**Target Thresholds:**
| Environment | Maximum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 0.5% | 0.2% | 0.1% |
| Stable | 0.5% | 0.2% | 0.1% |

---

### 7.3 API Availability

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-003 |
| **Definition** | Percentage of time API is available |
| **Formula** | `(Uptime minutes / Total minutes) * 100` |
| **Unit** | Percentage |
| **Granularity** | Daily, Monthly |
| **Dimensions** | environment, service |
| **Data Source** | Prometheus up metric |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 99% | 99.5% | 99.9% |
| Stable | 99% | 99.5% | 99.9% |

---

### 7.4 Customer Support Tickets

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-004 |
| **Definition** | Number of support tickets created |
| **Formula** | `COUNT(tickets)` |
| **Unit** | Count |
| **Granularity** | Daily |
| **Dimensions** | environment, ticket_type, priority, status |
| **Data Source** | support_tickets table |

---

### 7.5 Customer Satisfaction Score (CSAT)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-005 |
| **Definition** | Average customer satisfaction rating |
| **Formula** | `AVG(rating)` where rating is 1-5 |
| **Unit** | Score (1-5) |
| **Granularity** | Weekly |
| **Dimensions** | environment, user_type, interaction_type |
| **Data Source** | feedback table |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 3.5 | 4.0 | 4.5 |
| Stable | 3.5 | 4.0 | 4.5 |

---

### 7.6 Net Promoter Score (NPS)

| Attribute | Value |
|-----------|-------|
| **Metric ID** | QLT-006 |
| **Definition** | Net Promoter Score |
| **Formula** | `% Promoters - % Detractors` |
| **Unit** | Score (-100 to 100) |
| **Granularity** | Monthly |
| **Dimensions** | environment, user_type |
| **Data Source** | nps_surveys table |

**Target Thresholds:**
| Environment | Minimum | Expected | Excellent |
|-------------|---------|----------|-----------|
| Canary | 20 | 40 | 60 |
| Stable | 20 | 40 | 60 |

---

## 8. Alert Thresholds Summary

### 8.1 Critical Alerts (P0)

| Metric | Threshold | Action |
|--------|-----------|--------|
| 5xx Error Rate | > 5% | Immediate investigation |
| API Availability | < 99% | Page on-call engineer |
| Crash Rate | > 1% | Immediate investigation |
| Payment Failure Rate | > 10% | Immediate investigation |

### 8.2 Warning Alerts (P1)

| Metric | Threshold | Action |
|--------|-----------|--------|
| 5xx Error Rate | > 1% | Investigate within 1 hour |
| P95 Latency | > 500ms | Investigate within 1 hour |
| Conversion Rate Drop | > 20% | Investigate within 2 hours |
| CPU Usage | > 90% | Scale resources |

### 8.3 Info Alerts (P2)

| Metric | Threshold | Action |
|--------|-----------|--------|
| 4xx Error Rate | > 5% | Review within 4 hours |
| Page Load Time | > 3s | Optimize within 24 hours |
| Bounce Rate | > 50% | Analyze within 24 hours |

---

## 9. Appendix

### 9.1 Metric Naming Convention

```
<CATEGORY>-<NUMBER>

Categories:
- TRF: Traffic Metrics
- CNV: Conversion Metrics
- PRF: Performance Metrics
- BUS: Business Metrics
- USR: User Metrics
- QLT: Quality Metrics
```

### 9.2 Data Retention Policy

| Metric Type | Raw Data | Aggregated |
|-------------|----------|------------|
| Real-time | 7 days | N/A |
| Hourly | 30 days | 1 year |
| Daily | 90 days | 3 years |
| Monthly | 1 year | 5 years |

### 9.3 Related Documents

- [Analytics Setup Guide](./ANALYTICS_SETUP.md)
- [Canary Release Plan](./CANARY_RELEASE_PLAN.md)
- [Monitoring Setup](./MONITORING_SETUP.md)

### 9.4 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-24 | Data Analytics Team | Initial release |
