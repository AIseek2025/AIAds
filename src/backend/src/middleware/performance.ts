import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Performance Metrics Interface
 */
interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  slowRequestCount: number;
  totalDuration: number;
  durations: number[];
  methodStats: Record<string, MethodStats>;
  pathStats: Record<string, PathStats>;
}

interface MethodStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
}

interface PathStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Performance Monitor Class
 * Tracks API performance metrics and identifies bottlenecks
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private slowRequestThreshold: number;
  private maxDurations: number;

  constructor(slowRequestThreshold: number = 1000, maxDurations: number = 1000) {
    this.slowRequestThreshold = slowRequestThreshold;
    this.maxDurations = maxDurations;
    
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      slowRequestCount: 0,
      totalDuration: 0,
      durations: [],
      methodStats: {},
      pathStats: {},
    };
  }

  /**
   * Express middleware function
   */
  middleware = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();
    const method = req.method;
    const path = this.normalizePath(req.path);
    const requestId = req.headers['x-request-id'] as string || 'unknown';

    // Track response finish
    res.on('finish', () => {
      const duration = Date.now() - start;
      const statusCode = res.statusCode;
      
      this.recordRequest(method, path, duration, statusCode);
      
      // Log slow requests
      if (duration > this.slowRequestThreshold) {
        logger.warn('Slow request detected', {
          method,
          path,
          duration: `${duration}ms`,
          statusCode,
          requestId,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    });

    next();
  };

  /**
   * Record request metrics
   */
  private recordRequest(
    method: string,
    path: string,
    duration: number,
    statusCode: number
  ): void {
    this.metrics.requestCount++;
    this.metrics.totalDuration += duration;
    
    // Track durations for percentile calculation
    this.metrics.durations.push(duration);
    if (this.metrics.durations.length > this.maxDurations) {
      this.metrics.durations.shift();
    }

    // Track slow requests
    if (duration > this.slowRequestThreshold) {
      this.metrics.slowRequestCount++;
    }

    // Track errors
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }

    // Update method stats
    if (!this.metrics.methodStats[method]) {
      this.metrics.methodStats[method] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
      };
    }
    
    const methodStats = this.metrics.methodStats[method];
    methodStats.count++;
    methodStats.totalDuration += duration;
    methodStats.avgDuration = methodStats.totalDuration / methodStats.count;
    methodStats.maxDuration = Math.max(methodStats.maxDuration, duration);
    methodStats.minDuration = Math.min(methodStats.minDuration, duration);

    // Update path stats
    if (!this.metrics.pathStats[path]) {
      this.metrics.pathStats[path] = {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }
    
    const pathStats = this.metrics.pathStats[path];
    pathStats.count++;
    pathStats.totalDuration += duration;
    pathStats.avgDuration = pathStats.totalDuration / pathStats.count;
    pathStats.maxDuration = Math.max(pathStats.maxDuration, duration);
    
    // Recalculate percentiles
    this.recalculatePercentiles();
  }

  /**
   * Recalculate percentile metrics
   */
  private recalculatePercentiles(): void {
    if (this.metrics.durations.length === 0) return;

    const sorted = [...this.metrics.durations].sort((a, b) => a - b);

    // Update all path stats with current percentiles
    Object.values(this.metrics.pathStats).forEach(stats => {
      stats.p50 = this.getPercentile(sorted, 50);
      stats.p95 = this.getPercentile(sorted, 95);
      stats.p99 = this.getPercentile(sorted, 99);
    });
  }

  /**
   * Get percentile value from sorted array
   */
  private getPercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Normalize path by replacing IDs with placeholders
   */
  private normalizePath(path: string): string {
    // Replace UUIDs and numeric IDs with placeholders
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/\d+/g, '/:id');
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics & {
    avgDuration: number;
    slowRequestRate: number;
    errorRate: number;
    overallP95: number;
    overallP99: number;
  } {
    const avgDuration = this.metrics.requestCount > 0
      ? this.metrics.totalDuration / this.metrics.requestCount
      : 0;
    
    const slowRequestRate = this.metrics.requestCount > 0
      ? (this.metrics.slowRequestCount / this.metrics.requestCount) * 100
      : 0;
    
    const errorRate = this.metrics.requestCount > 0
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100
      : 0;

    const overallP95 = this.getPercentile(
      [...this.metrics.durations].sort((a, b) => a - b),
      95
    );
    
    const overallP99 = this.getPercentile(
      [...this.metrics.durations].sort((a, b) => a - b),
      99
    );

    return {
      ...this.metrics,
      avgDuration: Math.round(avgDuration * 100) / 100,
      slowRequestRate: Math.round(slowRequestRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      overallP95,
      overallP99,
    };
  }

  /**
   * Get slow paths (paths with high average duration)
   */
  getSlowPaths(threshold: number = 500): Array<{ path: string; avgDuration: number; count: number }> {
    return Object.entries(this.metrics.pathStats)
      .filter(([_, stats]) => stats.avgDuration > threshold)
      .map(([path, stats]) => ({
        path,
        avgDuration: Math.round(stats.avgDuration * 100) / 100,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Get slowest methods
   */
  getSlowMethods(): Array<{ method: string; avgDuration: number; count: number }> {
    return Object.entries(this.metrics.methodStats)
      .map(([method, stats]) => ({
        method,
        avgDuration: Math.round(stats.avgDuration * 100) / 100,
        count: stats.count,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      slowRequestCount: 0,
      totalDuration: 0,
      durations: [],
      methodStats: {},
      pathStats: {},
    };
  }

  /**
   * Check if P95 latency meets target
   */
  checkP95Target(targetMs: number): { meets: boolean; current: number; target: number } {
    const current = this.getMetrics().overallP95;
    return {
      meets: current <= targetMs,
      current,
      target: targetMs,
    };
  }
}

/**
 * Create singleton performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor(
  parseInt(process.env.SLOW_REQUEST_THRESHOLD_MS || '1000', 10),
  parseInt(process.env.MAX_DURATION_SAMPLES || '1000', 10)
);

/**
 * Performance monitoring middleware factory
 */
export function performanceMiddleware() {
  return performanceMonitor.middleware;
}

/**
 * Database Performance Monitor
 * Tracks Prisma query performance
 */
export class DatabasePerformanceMonitor {
  private slowQueryThreshold: number;
  private queryStats: Map<string, QueryStats>;

  constructor(slowQueryThreshold: number = 100) {
    this.slowQueryThreshold = slowQueryThreshold;
    this.queryStats = new Map();
  }

  /**
   * Record query execution
   */
  recordQuery(
    model: string,
    action: string,
    duration: number,
    success: boolean = true
  ): void {
    const key = `${model}:${action}`;
    
    if (!this.queryStats.has(key)) {
      this.queryStats.set(key, {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        maxDuration: 0,
        slowCount: 0,
        errorCount: 0,
      });
    }

    const stats = this.queryStats.get(key)!;
    stats.count++;
    stats.totalDuration += duration;
    stats.avgDuration = stats.totalDuration / stats.count;
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    if (duration > this.slowQueryThreshold) {
      stats.slowCount++;
    }

    if (!success) {
      stats.errorCount++;
    }

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow database query detected', {
        model,
        action,
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
      });
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats(): Array<{
    key: string;
    model: string;
    action: string;
    count: number;
    avgDuration: number;
    maxDuration: number;
    slowCount: number;
    slowRate: number;
  }> {
    return Array.from(this.queryStats.entries()).map(([key, stats]) => ({
      key,
      model: key.split(':')[0],
      action: key.split(':')[1],
      count: stats.count,
      avgDuration: Math.round(stats.avgDuration * 100) / 100,
      maxDuration: stats.maxDuration,
      slowCount: stats.slowCount,
      slowRate: Math.round((stats.slowCount / stats.count) * 100 * 100) / 100,
    }));
  }

  /**
   * Get slow queries
   */
  getSlowQueries(): Array<{
    key: string;
    avgDuration: number;
    slowRate: number;
  }> {
    return this.getQueryStats()
      .filter(stats => stats.avgDuration > this.slowQueryThreshold)
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }

  /**
   * Reset query statistics
   */
  reset(): void {
    this.queryStats.clear();
  }
}

/**
 * Create singleton database performance monitor
 */
export const dbPerformanceMonitor = new DatabasePerformanceMonitor(
  parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '100', 10)
);

/**
 * Prisma middleware for query performance monitoring
 */
export function prismaPerformanceMiddleware() {
  return async (params: any, next: any) => {
    const before = Date.now();
    
    try {
      const result = await next(params);
      const after = Date.now();
      const duration = after - before;
      
      dbPerformanceMonitor.recordQuery(params.model, params.action, duration, true);
      
      return result;
    } catch (error) {
      const after = Date.now();
      const duration = after - before;
      
      dbPerformanceMonitor.recordQuery(params.model, params.action, duration, false);
      
      throw error;
    }
  };
}

interface QueryStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  slowCount: number;
  errorCount: number;
}
