# AIAds Platform - Analytics Setup Guide

**Document Version:** 1.0.0
**Last Updated:** 2026-03-24
**Author:** Data Analytics Team
**Status:** Active

---

## 1. Overview

This document provides comprehensive instructions for setting up data analytics and tracking for the AIAds platform's canary release. The analytics system enables us to track user behavior, measure conversion funnels, and identify potential issues during the canary deployment.

### 1.1 Analytics Goals

- Track user behavior across advertiser and KOL modules
- Monitor conversion funnels and identify drop-off points
- Measure user retention and engagement
- Detect anomalies and trigger alerts
- Generate daily reports for stakeholders

### 1.2 Analytics Stack

| Component | Purpose | Technology |
|-----------|---------|------------|
| Event Tracking | User behavior collection | Custom SDK + Segment |
| Data Pipeline | Event processing | Kafka + Flink |
| Data Warehouse | Data storage | ClickHouse |
| Analytics Engine | Query and analysis | Apache Druid |
| Visualization | Dashboards and reports | Grafana + Metabase |
| Alerting | Anomaly detection | Prometheus Alertmanager |

---

## 2. Event Tracking Configuration

### 2.1 Event Taxonomy

All events follow a consistent naming convention and structure:

```typescript
interface AnalyticsEvent {
  event_name: string;           // Snake_case event name
  event_id: string;             // Unique event ID (UUID)
  timestamp: number;            // Unix timestamp (ms)
  user_id: string;              // User ID (if authenticated)
  session_id: string;           // Session ID
  device_id: string;            // Device ID
  environment: 'canary' | 'stable';
  properties: Record<string, any>;
  context: EventContext;
}

interface EventContext {
  page: PageInfo;
  user: UserInfo;
  device: DeviceInfo;
  network: NetworkInfo;
  app: AppInfo;
}
```

### 2.2 Advertiser Events

#### 2.2.1 advertiser_registered

Triggered when a new advertiser completes registration.

```typescript
{
  event_name: "advertiser_registered",
  properties: {
    registration_method: "email" | "google" | "facebook",
    company_name: string,
    industry: string,
    company_size: "1-10" | "11-50" | "51-200" | "201-500" | "500+",
    country: string,
    referral_source: string
  }
}
```

**Implementation:**
```typescript
// Frontend (React)
analytics.track('advertiser_registered', {
  registration_method: 'email',
  company_name: companyData.name,
  industry: companyData.industry,
  company_size: companyData.size,
  country: companyData.country,
  referral_source: utmSource
});

// Backend (Node.js)
await analyticsService.trackEvent({
  event_name: 'advertiser_registered',
  user_id: newUser.id,
  properties: { ... }
});
```

#### 2.2.2 campaign_created

Triggered when an advertiser creates a new campaign.

```typescript
{
  event_name: "campaign_created",
  properties: {
    campaign_id: string,
    campaign_type: "brand_awareness" | "conversion" | "engagement",
    budget: number,
    currency: string,
    duration_days: number,
    target_platforms: string[],
    target_audience: {
      age_range: string,
      gender: string,
      interests: string[]
    },
    kol_requirements: {
      min_followers: number,
      max_followers: number,
      engagement_rate: number
    }
  }
}
```

#### 2.2.3 kol_searched

Triggered when an advertiser searches for KOLs.

```typescript
{
  event_name: "kol_searched",
  properties: {
    search_query: string,
    filters: {
      platform: string[],
      follower_range: [number, number],
      engagement_rate: [number, number],
      category: string[],
      location: string[]
    },
    results_count: number,
    page_number: number
  }
}
```

#### 2.2.4 order_created

Triggered when an advertiser creates an order.

```typescript
{
  event_name: "order_created",
  properties: {
    order_id: string,
    campaign_id: string,
    kol_id: string,
    order_value: number,
    currency: string,
    service_type: string,
    delivery_timeline_days: number,
    payment_method: "credit_card" | "bank_transfer" | "wallet"
  }
}
```

#### 2.2.5 payment_completed

Triggered when a payment is successfully processed.

```typescript
{
  event_name: "payment_completed",
  properties: {
    payment_id: string,
    order_id: string,
    amount: number,
    currency: string,
    payment_method: string,
    payment_processor: "stripe" | "paypal" | "bank",
    processing_time_ms: number
  }
}
```

### 2.3 KOL Events

#### 2.3.1 kol_registered

Triggered when a new KOL completes registration.

```typescript
{
  event_name: "kol_registered",
  properties: {
    registration_method: "email" | "google" | "facebook",
    primary_platform: "instagram" | "tiktok" | "youtube" | "twitter",
    follower_count: number,
    category: string,
    country: string,
    referral_source: string
  }
}
```

#### 2.3.2 account_connected

Triggered when a KOL connects a social media account.

```typescript
{
  event_name: "account_connected",
  properties: {
    platform: "instagram" | "tiktok" | "youtube" | "twitter",
    account_username: string,
    follower_count: number,
    verification_status: "verified" | "unverified",
    connection_method: "oauth" | "api_key"
  }
}
```

#### 2.3.3 task_applied

Triggered when a KOL applies for a task.

```typescript
{
  event_name: "task_applied",
  properties: {
    task_id: string,
    campaign_id: string,
    advertiser_id: string,
    application_message: string,
    proposed_rate: number,
    estimated_delivery_days: number
  }
}
```

#### 2.3.4 content_submitted

Triggered when a KOL submits content for review.

```typescript
{
  event_name: "content_submitted",
  properties: {
    submission_id: string,
    task_id: string,
    content_type: "video" | "image" | "text",
    content_length_seconds: number,
    platform: string,
    submission_method: "upload" | "link"
  }
}
```

#### 2.3.5 withdrawal_requested

Triggered when a KOL requests a withdrawal.

```typescript
{
  event_name: "withdrawal_requested",
  properties: {
    withdrawal_id: string,
    amount: number,
    currency: string,
    withdrawal_method: "bank_transfer" | "paypal" | "crypto",
    account_last_four: string
  }
}
```

### 2.4通用 Events

#### 2.4.1 page_view

Triggered on every page view.

```typescript
{
  event_name: "page_view",
  properties: {
    page_path: string,
    page_title: string,
    page_category: string,
    referrer: string,
    time_on_page_ms: number,
    scroll_depth_percent: number
  }
}
```

#### 2.4.2 button_click

Triggered on button clicks.

```typescript
{
  event_name: "button_click",
  properties: {
    button_id: string,
    button_text: string,
    button_location: string,
    page_path: string,
    click_position: { x: number, y: number }
  }
}
```

#### 2.4.3 form_submit

Triggered on form submissions.

```typescript
{
  event_name: "form_submit",
  properties: {
    form_id: string,
    form_name: string,
    form_location: string,
    fields_count: number,
    validation_errors: number,
    submission_success: boolean
  }
}
```

#### 2.4.4 error_occurred

Triggered when an error occurs.

```typescript
{
  event_name: "error_occurred",
  properties: {
    error_type: "frontend" | "backend" | "network",
    error_code: string,
    error_message: string,
    stack_trace: string,
    page_path: string,
    user_action: string,
    severity: "low" | "medium" | "high" | "critical"
  }
}
```

---

## 3. Analytics SDK Implementation

### 3.1 Frontend SDK (JavaScript/TypeScript)

```typescript
// src/lib/analytics/AnalyticsSDK.ts

class AnalyticsSDK {
  private apiKey: string;
  private endpoint: string;
  private queue: AnalyticsEvent[] = [];
  private flushInterval: number = 5000;
  
  constructor(apiKey: string, endpoint: string) {
    this.apiKey = apiKey;
    this.endpoint = endpoint;
    this.init();
  }
  
  private init() {
    // Load persisted queue
    this.loadQueue();
    
    // Start flush interval
    setInterval(() => this.flush(), this.flushInterval);
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }
  
  track(eventName: string, properties: Record<string, any> = {}) {
    const event: AnalyticsEvent = {
      event_name: eventName,
      event_id: this.generateUUID(),
      timestamp: Date.now(),
      user_id: this.getUserId(),
      session_id: this.getSessionId(),
      device_id: this.getDeviceId(),
      environment: this.getEnvironment(),
      properties: properties,
      context: this.collectContext()
    };
    
    this.queue.push(event);
    this.persistQueue();
    
    // Flush immediately for critical events
    if (this.isCriticalEvent(eventName)) {
      this.flush();
    }
  }
  
  private flush() {
    if (this.queue.length === 0) return;
    
    const events = [...this.queue];
    this.queue = [];
    
    fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey
      },
      body: JSON.stringify({ events })
    }).catch(err => {
      // Re-queue on failure
      this.queue = [...events, ...this.queue];
      console.error('Analytics flush failed:', err);
    });
  }
  
  private collectContext(): EventContext {
    return {
      page: {
        path: window.location.pathname,
        title: document.title,
        referrer: document.referrer,
        url: window.location.href
      },
      user: {
        id: this.getUserId(),
        email: this.getUserEmail(),
        role: this.getUserRole()
      },
      device: {
        type: this.getDeviceType(),
        os: navigator.platform,
        browser: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height
        }
      },
      network: {
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      },
      app: {
        version: process.env.APP_VERSION || 'unknown',
        environment: this.getEnvironment()
      }
    };
  }
  
  private isCriticalEvent(eventName: string): boolean {
    const criticalEvents = [
      'payment_completed',
      'error_occurred',
      'order_created'
    ];
    return criticalEvents.includes(eventName);
  }
  
  // ... helper methods (generateUUID, getUserId, etc.)
}

export const analytics = new AnalyticsSDK(
  process.env.ANALYTICS_API_KEY!,
  process.env.ANALYTICS_ENDPOINT!
);
```

### 3.2 Backend Service (Node.js)

```typescript
// src/services/analytics/AnalyticsService.ts

import { EventEmitter } from 'events';
import { Kafka } from 'kafkajs';

interface AnalyticsEvent {
  event_name: string;
  event_id: string;
  timestamp: number;
  user_id?: string;
  session_id?: string;
  properties: Record<string, any>;
  context: Record<string, any>;
}

class AnalyticsService extends EventEmitter {
  private kafka: Kafka;
  private producer: any;
  private topic: string = 'analytics-events';
  
  constructor() {
    super();
    this.kafka = new Kafka({
      clientId: 'aiads-analytics',
      brokers: process.env.KAFKA_BROKERS!.split(',')
    });
    this.producer = this.kafka.producer();
    this.connect();
  }
  
  private async connect() {
    await this.producer.connect();
    console.log('Analytics producer connected');
  }
  
  async trackEvent(event: AnalyticsEvent) {
    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{
          key: event.user_id || event.event_id,
          value: JSON.stringify({
            ...event,
            processed_at: Date.now()
          })
        }]
      });
      
      this.emit('event-tracked', event);
    } catch (error) {
      console.error('Failed to track event:', error);
      this.emit('event-failed', { event, error });
    }
  }
  
  async trackPageView(userId: string | undefined, pagePath: string, context: any) {
    await this.trackEvent({
      event_name: 'page_view',
      event_id: this.generateUUID(),
      timestamp: Date.now(),
      user_id: userId,
      properties: {
        page_path: pagePath,
        page_title: context.title,
        referrer: context.referrer
      },
      context: context
    });
  }
  
  async trackConversion(
    userId: string,
    conversionType: string,
    value: number,
    properties: Record<string, any>
  ) {
    await this.trackEvent({
      event_name: 'conversion_completed',
      event_id: this.generateUUID(),
      timestamp: Date.now(),
      user_id: userId,
      properties: {
        conversion_type: conversionType,
        value: value,
        ...properties
      },
      context: {}
    });
  }
  
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export const analyticsService = new AnalyticsService();
```

---

## 4. Data Pipeline Configuration

### 4.1 Kafka Topic Setup

```bash
# Create analytics events topic
kafka-topics --create \
  --topic analytics-events \
  --bootstrap-server localhost:9092 \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000

# Create aggregated metrics topic
kafka-topics --create \
  --topic analytics-metrics-aggregated \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 3
```

### 4.2 Flink Stream Processing

```sql
-- Flink SQL for real-time aggregation

-- Create source table
CREATE TABLE analytics_events (
  event_name STRING,
  event_id STRING,
  user_id STRING,
  timestamp BIGINT,
  properties ROW<
    amount DOUBLE,
    page_path STRING,
    error_code STRING
  >,
  context ROW<
    environment STRING,
    user ROW<role STRING>
  >,
  WATERMARK FOR timestamp AS TO_TIMESTAMP(FROM_UNIXTIME(timestamp))
) WITH (
  'connector' = 'kafka',
  'topic' = 'analytics-events',
  'properties.bootstrap.servers' = 'kafka:9092',
  'format' = 'json'
);

-- Create sink table for aggregated metrics
CREATE TABLE metrics_aggregated (
  metric_name STRING,
  metric_value DOUBLE,
  dimensions MAP<STRING, STRING>,
  window_start TIMESTAMP(3),
  window_end TIMESTAMP(3),
  WATERMARK FOR window_end AS window_end
) WITH (
  'connector' = 'clickhouse',
  'url' = 'jdbc:clickhouse://clickhouse:8123',
  'table-name' = 'metrics_aggregated',
  'username' = 'analytics',
  'password' = 'analytics_password'
);

-- Aggregate page views by minute
INSERT INTO metrics_aggregated
SELECT
  'page_views' as metric_name,
  COUNT(*) as metric_value,
  MAP[
    'environment', context.environment,
    'page_path', properties.page_path
  ] as dimensions,
  TUMBLE_START(TO_TIMESTAMP(FROM_UNIXTIME(timestamp)), INTERVAL '1' MINUTE) as window_start,
  TUMBLE_END(TO_TIMESTAMP(FROM_UNIXTIME(timestamp)), INTERVAL '1' MINUTE) as window_end
FROM analytics_events
WHERE event_name = 'page_view'
GROUP BY
  context.environment,
  properties.page_path,
  TUMBLE(TO_TIMESTAMP(FROM_UNIXTIME(timestamp)), INTERVAL '1' MINUTE);
```

---

## 5. Data Warehouse Schema

### 5.1 ClickHouse Tables

```sql
-- Raw events table
CREATE TABLE analytics.events_raw (
  event_id String,
  event_name String,
  user_id Nullable(String),
  session_id Nullable(String),
  device_id Nullable(String),
  timestamp DateTime64(3),
  properties String,
  context String,
  environment String,
  inserted_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp, event_name, user_id)
TTL timestamp + INTERVAL 90 DAY;

-- Aggregated daily metrics
CREATE TABLE analytics.metrics_daily (
  date Date,
  metric_name String,
  metric_value Float64,
  dimensions Map(String, String),
  environment String
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, metric_name, environment, dimensions);

-- User sessions
CREATE TABLE analytics.user_sessions (
  session_id String,
  user_id Nullable(String),
  start_time DateTime64(3),
  end_time DateTime64(3),
  page_views UInt32,
  events_count UInt32,
  duration_seconds UInt32,
  environment String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start_time)
ORDER BY (session_id, start_time);

-- Conversion funnel
CREATE TABLE analytics.funnel_steps (
  date Date,
  funnel_name String,
  step_number UInt8,
  step_name String,
  users_count UInt64,
  conversion_rate Float64,
  environment String
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, funnel_name, step_number, environment);

-- User retention
CREATE TABLE analytics.user_retention (
  cohort_date Date,
  days_since_cohort UInt8,
  retained_users UInt64,
  retention_rate Float64,
  user_type String,
  environment String
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(cohort_date)
ORDER BY (cohort_date, days_since_cohort, user_type, environment);
```

---

## 6. Grafana Dashboard Configuration

### 6.1 Dashboard JSON

```json
{
  "dashboard": {
    "title": "AIAds Analytics Overview",
    "tags": ["aiads", "analytics", "canary"],
    "timezone": "browser",
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Traffic Overview",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{environment=\"canary\"}[5m]))",
            "legendFormat": "Canary QPS"
          },
          {
            "expr": "sum(rate(http_requests_total{environment=\"stable\"}[5m]))",
            "legendFormat": "Stable QPS"
          }
        ]
      },
      {
        "id": 2,
        "title": "User Registrations",
        "type": "stat",
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 8},
        "targets": [
          {
            "query": "SELECT sum(metric_value) FROM metrics_daily WHERE metric_name='user_registrations' AND date >= today() - 1",
            "format": "table"
          }
        ]
      },
      {
        "id": 3,
        "title": "Conversion Funnel",
        "type": "funnel",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "query": "SELECT step_name, users_count FROM funnel_steps WHERE date = today() AND environment = 'canary' ORDER BY step_number"
          }
        ]
      },
      {
        "id": 4,
        "title": "Error Rate by Environment",
        "type": "timeseries",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 16},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\",environment=\"canary\"}[5m])) / sum(rate(http_requests_total{environment=\"canary\"}[5m])) * 100",
            "legendFormat": "Canary Error Rate %"
          },
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\",environment=\"stable\"}[5m])) / sum(rate(http_requests_total{environment=\"stable\"}[5m])) * 100",
            "legendFormat": "Stable Error Rate %"
          }
        ]
      }
    ]
  }
}
```

---

## 7. Alerting Configuration

### 7.1 Alert Rules

```yaml
# /configs/monitoring/analytics-alerts.yml

groups:
  - name: analytics-alerts
    interval: 1m
    rules:
      # Conversion rate drop
      - alert: ConversionRateDrop
        expr: |
          (
            sum(rate(conversion_events_total{environment="canary"}[1h])) 
            / sum(rate(page_view{environment="canary"}[1h]))
          ) < 0.8 * (
            sum(rate(conversion_events_total{environment="stable"}[1h])) 
            / sum(rate(page_view{environment="stable"}[1h]))
          )
        for: 15m
        labels:
          severity: warning
          team: analytics
        annotations:
          summary: "Canary conversion rate dropped significantly"
          description: "Canary conversion rate is {{ $value | humanizePercentage }} of stable rate"

      # Error rate spike
      - alert: AnalyticsErrorRateSpike
        expr: |
          sum(rate(error_occurred_total{environment="canary"}[5m])) 
          / sum(rate(page_view{environment="canary"}[5m])) 
          > 0.01
        for: 5m
        labels:
          severity: critical
          team: analytics
        annotations:
          summary: "High error rate in canary environment"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # User registration anomaly
      - alert: UserRegistrationAnomaly
        expr: |
          sum(rate(user_registered_total{environment="canary"}[1h])) 
          < 0.5 * sum(rate(user_registered_total{environment="stable"}[1h]))
        for: 30m
        labels:
          severity: warning
          team: analytics
        annotations:
          summary: "Low user registration in canary"
          description: "Canary registrations are significantly lower than expected"

      # Page load time degradation
      - alert: PageLoadTimeDegradation
        expr: |
          histogram_quantile(0.95, 
            rate(page_load_time_seconds_bucket{environment="canary"}[5m])
          ) > 3
        for: 10m
        labels:
          severity: warning
          team: frontend
        annotations:
          summary: "Page load time degradation in canary"
          description: "P95 page load time is {{ $value }}s"
```

### 7.2 Alert Routing

```yaml
# Alertmanager configuration
route:
  group_by: ['alertname', 'severity', 'team']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'default-receiver'
  routes:
  - match:
      severity: critical
    receiver: 'critical-receiver'
  - match:
      team: analytics
    receiver: 'analytics-receiver'

receivers:
- name: 'analytics-receiver'
  email_configs:
  - to: 'analytics-team@aiads.com'
    send_resolved: true
  slack_configs:
  - api_url: 'https://hooks.slack.com/services/XXX/YYY/ZZZ'
    channel: '#analytics-alerts'
    send_resolved: true

- name: 'critical-receiver'
  email_configs:
  - to: 'devops-critical@aiads.com'
    send_resolved: true
  pagerduty_configs:
  - service_key: 'your-pagerduty-key'
```

---

## 8. Daily Report Generation

### 8.1 Report Script

```typescript
// scripts/generate-daily-report.ts

import { ClickHouseClient } from '@clickhouse/client';
import { writeFileSync } from 'fs';

interface DailyMetrics {
  date: string;
  traffic: {
    pv: number;
    uv: number;
    newUsers: {
      advertisers: number;
      kols: number;
    };
    dau: number;
  };
  conversion: {
    registrationRate: number;
    campaignCreationRate: number;
    orderRate: number;
    paymentRate: number;
  };
  performance: {
    apiP50: number;
    apiP95: number;
    apiP99: number;
    errorRate: number;
  };
  business: {
    campaigns: number;
    orders: number;
    gmv: number;
    revenue: number;
  };
}

async function generateDailyReport(date: string): Promise<DailyMetrics> {
  const client = new ClickHouseClient({
    host: process.env.CLICKHOUSE_HOST,
    username: 'analytics',
    password: process.env.CLICKHOUSE_PASSWORD
  });

  // Query traffic metrics
  const trafficQuery = await client.query({
    query: `
      SELECT 
        sumIf(metric_value, metric_name = 'page_views') as pv,
        countDistinct(user_id) as uv,
        sumIf(metric_value, metric_name = 'advertiser_registered') as advertiser_reg,
        sumIf(metric_value, metric_name = 'kol_registered') as kol_reg
      FROM metrics_daily
      WHERE date = {date:Date} AND environment = 'canary'
    `,
    query_params: { date }
  });

  // Query conversion metrics
  const conversionQuery = await client.query({
    query: `
      SELECT 
        step_name,
        users_count,
        conversion_rate
      FROM funnel_steps
      WHERE date = {date:Date} AND environment = 'canary'
      ORDER BY step_number
    `,
    query_params: { date }
  });

  // Query performance metrics
  const performanceQuery = await client.query({
    query: `
      SELECT 
        quantile(0.50)(response_time_ms) as p50,
        quantile(0.95)(response_time_ms) as p95,
        quantile(0.99)(response_time_ms) as p99,
        sumIf(metric_value, metric_name = 'error_count') / sum(metric_value) as error_rate
      FROM metrics_hourly
      WHERE date = {date:Date} AND environment = 'canary'
    `,
    query_params: { date }
  });

  // Query business metrics
  const businessQuery = await client.query({
    query: `
      SELECT 
        sumIf(metric_value, metric_name = 'campaigns_created') as campaigns,
        sumIf(metric_value, metric_name = 'orders_created') as orders,
        sumIf(metric_value, metric_name = 'gmv') as gmv,
        sumIf(metric_value, metric_name = 'revenue') as revenue
      FROM metrics_daily
      WHERE date = {date:Date} AND environment = 'canary'
    `,
    query_params: { date }
  });

  const [traffic, conversion, performance, business] = await Promise.all([
    trafficQuery.json(),
    conversionQuery.json(),
    performanceQuery.json(),
    businessQuery.json()
  ]);

  return {
    date,
    traffic: {
      pv: traffic.data[0].pv,
      uv: traffic.data[0].uv,
      newUsers: {
        advertisers: traffic.data[0].advertiser_reg,
        kols: traffic.data[0].kol_reg
      },
      dau: traffic.data[0].uv
    },
    conversion: {
      registrationRate: conversion.data[0]?.conversion_rate || 0,
      campaignCreationRate: conversion.data[1]?.conversion_rate || 0,
      orderRate: conversion.data[2]?.conversion_rate || 0,
      paymentRate: conversion.data[3]?.conversion_rate || 0
    },
    performance: {
      apiP50: performance.data[0].p50,
      apiP95: performance.data[0].p95,
      apiP99: performance.data[0].p99,
      errorRate: performance.data[0].error_rate
    },
    business: {
      campaigns: business.data[0].campaigns,
      orders: business.data[0].orders,
      gmv: business.data[0].gmv,
      revenue: business.data[0].revenue
    }
  };
}

// Generate and save report
const report = await generateDailyReport('2026-03-24');
writeFileSync(
  '/data/analytics/daily_metrics.json',
  JSON.stringify(report, null, 2)
);
```

---

## 9. Testing and Validation

### 9.1 Event Tracking Tests

```typescript
// tests/analytics/EventTracking.test.ts

describe('Analytics Event Tracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should track advertiser registration', async () => {
    const eventData = {
      registration_method: 'email',
      company_name: 'Test Corp',
      industry: 'Technology',
      country: 'US'
    };

    analytics.track('advertiser_registered', eventData);

    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'advertiser_registered',
        properties: expect.objectContaining(eventData)
      })
    );
  });

  test('should include context in all events', async () => {
    analytics.track('page_view', { page_path: '/home' });

    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          page: expect.any(Object),
          device: expect.any(Object)
        })
      })
    );
  });

  test('should flush critical events immediately', async () => {
    analytics.track('payment_completed', { amount: 100 });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

### 9.2 Data Pipeline Tests

```typescript
// tests/analytics/DataPipeline.test.ts

describe('Analytics Data Pipeline', () => {
  test('should aggregate events correctly', async () => {
    const events = [
      { event_name: 'page_view', timestamp: Date.now() },
      { event_name: 'page_view', timestamp: Date.now() },
      { event_name: 'button_click', timestamp: Date.now() }
    ];

    await pipeline.process(events);

    const metrics = await clickhouse.query(
      "SELECT * FROM metrics_aggregated WHERE metric_name = 'page_views'"
    );

    expect(metrics[0].metric_value).toBe(2);
  });
});
```

---

## 10. Appendix

### 10.1 Environment Variables

```bash
# Analytics Configuration
ANALYTICS_API_KEY=your-api-key
ANALYTICS_ENDPOINT=https://analytics.aiads.com/v1/events
KAFKA_BROKERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
CLICKHOUSE_HOST=clickhouse.aiads.com
CLICKHOUSE_PASSWORD=your-password

# Feature Flags
ANALYTICS_ENABLED=true
ANALYTICS_SAMPLE_RATE=1.0
ANALYTICS_DEBUG_MODE=false
```

### 10.2 Related Documents

- [Canary Release Plan](./CANARY_RELEASE_PLAN.md)
- [Monitoring Setup](./MONITORING_SETUP.md)
- [Metrics Definition](./METRICS_DEFINITION.md)

### 10.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-24 | Data Analytics Team | Initial release |
