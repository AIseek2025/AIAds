/**
 * AIAds Platform - Analytics Service
 * Version: 1.0.0
 * Last Updated: 2026-03-24
 * 
 * Provides comprehensive user behavior tracking and analytics
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export interface AnalyticsConfig {
  enabled: boolean;
  samplingRate: number; // 0.0 to 1.0
  batchSize: number;
  flushInterval: number; // milliseconds
  endpoint: string;
  apiKey: string;
}

export interface PageViewEvent {
  type: 'page_view';
  page: string;
  path: string;
  referrer?: string;
  title?: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
}

export interface TrackEvent {
  type: 'event';
  event: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
}

export interface ApiCallEvent {
  type: 'api_call';
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
}

export interface ErrorEvent {
  type: 'error';
  error: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  sessionId: string;
  timestamp: Date;
  context: Record<string, any>;
}

export interface ConversionEvent {
  type: 'conversion';
  conversionType: string;
  value?: number;
  currency?: string;
  userId?: string;
  sessionId: string;
  timestamp: Date;
  properties: Record<string, any>;
}

export type AnalyticsEvent = 
  | PageViewEvent 
  | TrackEvent 
  | ApiCallEvent 
  | ErrorEvent 
  | ConversionEvent;

export class AnalyticsService extends EventEmitter {
  private config: AnalyticsConfig;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private userId?: string;
  private flushTimer?: NodeJS.Timeout;
  private isFlushing: boolean = false;

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    
    this.config = {
      enabled: true,
      samplingRate: 1.0,
      batchSize: 50,
      flushInterval: 5000,
      endpoint: process.env.ANALYTICS_ENDPOINT || 'https://analytics.aiads.com/api/v1/events',
      apiKey: process.env.ANALYTICS_API_KEY || '',
      ...config,
    };

    this.sessionId = this.generateSessionId();
    
    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate a hash for sampling
   */
  private shouldSample(): boolean {
    if (this.config.samplingRate >= 1.0) return true;
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Start the automatic flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop the flush timer
   */
  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Set the current user ID
   */
  public setUserId(userId: string): void {
    this.userId = userId;
    this.emit('userIdentified', { userId });
  }

  /**
   * Track a page view
   */
  public trackPageView(
    page: string, 
    options: { 
      path?: string; 
      referrer?: string; 
      title?: string;
      properties?: Record<string, any>;
    } = {}
  ): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const event: PageViewEvent = {
      type: 'page_view',
      page,
      path: options.path || page,
      referrer: options.referrer,
      title: options.title,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties: options.properties || {},
    };

    this.queueEvent(event);
    this.emit('pageView', event);
  }

  /**
   * Track a custom event
   */
  public trackEvent(
    event: string, 
    properties: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const trackEvent: TrackEvent = {
      type: 'event',
      event,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties,
    };

    this.queueEvent(trackEvent);
    this.emit('event', trackEvent);
  }

  /**
   * Track an API call
   */
  public trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    properties: Record<string, any> = {}
  ): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const event: ApiCallEvent = {
      type: 'api_call',
      endpoint,
      method,
      duration,
      statusCode,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties: {
        ...properties,
        duration_bucket: this.getDurationBucket(duration),
      },
    };

    this.queueEvent(event);
    this.emit('apiCall', event);
  }

  /**
   * Track an error
   */
  public trackError(
    error: Error,
    context: Record<string, any> = {}
  ): void {
    if (!this.config.enabled) return; // Don't sample errors

    const event: ErrorEvent = {
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      context,
    };

    this.queueEvent(event);
    this.emit('error', event);
  }

  /**
   * Track a conversion event
   */
  public trackConversion(
    conversionType: string,
    options: {
      value?: number;
      currency?: string;
      properties?: Record<string, any>;
    } = {}
  ): void {
    if (!this.config.enabled || !this.shouldSample()) return;

    const event: ConversionEvent = {
      type: 'conversion',
      conversionType,
      value: options.value,
      currency: options.currency,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      properties: options.properties || {},
    };

    this.queueEvent(event);
    this.emit('conversion', event);
  }

  /**
   * Get duration bucket for grouping
   */
  private getDurationBucket(duration: number): string {
    if (duration < 50) return '0-50ms';
    if (duration < 100) return '50-100ms';
    if (duration < 250) return '100-250ms';
    if (duration < 500) return '250-500ms';
    if (duration < 1000) return '500ms-1s';
    if (duration < 2500) return '1-2.5s';
    if (duration < 5000) return '2.5-5s';
    return '5s+';
  }

  /**
   * Queue an event for batch sending
   */
  private queueEvent(event: AnalyticsEvent): void {
    this.eventQueue.push(event);

    // Flush immediately if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued events to the analytics endpoint
   */
  public async flush(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0 || !this.config.enabled) {
      return;
    }

    this.isFlushing = true;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await this.sendEvents(eventsToSend);
      this.emit('flushed', { count: eventsToSend.length });
    } catch (error) {
      // Re-queue events on failure
      this.eventQueue.unshift(...eventsToSend);
      this.emit('flushError', { error, count: eventsToSend.length });
      console.error('Analytics flush error:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Send events to the analytics endpoint
   */
  private async sendEvents(events: AnalyticsEvent[]): Promise<void> {
    if (!this.config.apiKey) {
      // In development, just log the events
      console.log('Analytics events (dev mode):', events);
      return;
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'X-API-Key': this.config.apiKey,
      },
      body: JSON.stringify({
        events: events.map(e => this.serializeEvent(e)),
      }),
    });

    if (!response.ok) {
      throw new Error(`Analytics API error: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Serialize event for sending
   */
  private serializeEvent(event: AnalyticsEvent): Record<string, any> {
    return {
      ...event,
      timestamp: event.timestamp.toISOString(),
      environment: process.env.ENVIRONMENT || 'development',
      version: process.env.APP_VERSION || '1.0.0',
    };
  }

  /**
   * Get current queue size
   */
  public getQueueSize(): number {
    return this.eventQueue.length;
  }

  /**
   * Clear the event queue
   */
  public clearQueue(): void {
    this.eventQueue = [];
  }

  /**
   * Start a new session
   */
  public startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.emit('sessionStarted', { sessionId: this.sessionId });
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get analytics configuration
   */
  public getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Update analytics configuration
   */
  public updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.flushInterval) {
      this.startFlushTimer();
    }
    
    this.emit('configUpdated', this.config);
  }

  /**
   * Enable analytics
   */
  public enable(): void {
    this.config.enabled = true;
    this.emit('enabled');
  }

  /**
   * Disable analytics
   */
  public disable(): void {
    this.config.enabled = false;
    this.emit('disabled');
  }

  /**
   * Set sampling rate
   */
  public setSamplingRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new Error('Sampling rate must be between 0 and 1');
    }
    this.config.samplingRate = rate;
    this.emit('samplingRateUpdated', rate);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();

// Export middleware for Express
export function analyticsMiddleware(req: any, res: any, next: () => void): void {
  // Track API calls
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    analyticsService.trackApiCall(
      req.originalUrl || req.url,
      req.method,
      duration,
      res.statusCode,
      {
        userAgent: req.get('user-agent'),
        ip: req.ip,
      }
    );
  });

  // Attach analytics to request
  req.analytics = analyticsService;
  
  next();
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      analytics: AnalyticsService;
    }
  }
}

// Export types
export type { AnalyticsConfig };
