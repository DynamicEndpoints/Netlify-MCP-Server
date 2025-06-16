// Advanced Analytics and Monitoring System
import { EventEmitter } from "events";
import * as fs from "fs/promises";
import * as path from "path";

export interface AnalyticsEvent {
  timestamp: number;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface UsageStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageResponseTime: number;
  popularOperations: Record<string, number>;
  errorTypes: Record<string, number>;
  hourlyUsage: Record<string, number>;
  dailyUsage: Record<string, number>;
}

export class AdvancedAnalytics extends EventEmitter {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetrics[] = [];
  private maxEvents = 10000;
  private maxMetrics = 5000;
  private analyticsDir: string;
  private currentSession: string;
  private startTime: number;

  constructor(analyticsDir = "./analytics") {
    super();
    this.analyticsDir = analyticsDir;
    this.currentSession = this.generateSessionId();
    this.startTime = Date.now();
    this.initializeAnalytics();
  }

  private async initializeAnalytics(): Promise<void> {
    try {
      await fs.mkdir(this.analyticsDir, { recursive: true });
      await this.loadPersistedData();
      this.setupPeriodicReports();
      console.error(`[${new Date().toISOString()}] Analytics system initialized`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to initialize analytics:`, error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Track general events
  trackEvent(
    type: string,
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    const event: AnalyticsEvent = {
      timestamp: Date.now(),
      type,
      category,
      action,
      label,
      value,
      metadata,
      sessionId: this.currentSession,
    };

    this.events.push(event);
    this.emit("event", event);

    // Trim events if necessary
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Auto-persist important events
    if (category === "error" || category === "security") {
      this.persistEvent(event);
    }
  }

  // Track performance metrics
  trackPerformance(
    operationName: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
    metadata?: Record<string, any>
  ): void {
    const metric: PerformanceMetrics = {
      operationName,
      duration,
      timestamp: Date.now(),
      success,
      errorMessage,
      metadata,
    };

    this.metrics.push(metric);
    this.emit("performance", metric);

    // Trim metrics if necessary
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Alert on performance issues
    if (duration > 30000) { // 30 seconds
      this.trackEvent("performance", "alert", "slow_operation", operationName, duration);
    }
  }

  // Track tool usage
  trackToolUsage(toolName: string, success: boolean, duration: number, parameters?: any): void {
    this.trackEvent("tool", "usage", toolName, success ? "success" : "failure", duration);
    this.trackPerformance(`tool_${toolName}`, duration, success);
    
    if (parameters) {
      this.trackEvent("tool", "parameters", toolName, undefined, undefined, parameters);
    }
  }

  // Track resource access
  trackResourceAccess(resourceUri: string, success: boolean, duration: number): void {
    this.trackEvent("resource", "access", resourceUri, success ? "success" : "failure", duration);
    this.trackPerformance(`resource_${resourceUri}`, duration, success);
  }

  // Track prompt usage
  trackPromptUsage(promptName: string, arguments?: any): void {
    this.trackEvent("prompt", "usage", promptName, undefined, undefined, arguments);
  }

  // Track subscription events
  trackSubscription(action: "subscribe" | "unsubscribe", resourceUri: string): void {
    this.trackEvent("subscription", action, resourceUri);
  }

  // Track errors with enhanced context
  trackError(
    errorType: string,
    errorMessage: string,
    context?: string,
    metadata?: Record<string, any>
  ): void {
    this.trackEvent("error", errorType, "occurrence", context, undefined, {
      message: errorMessage,
      ...metadata,
    });
  }

  // Generate comprehensive usage statistics
  generateUsageStats(timeRange?: { start: number; end: number }): UsageStats {
    const relevantEvents = timeRange
      ? this.events.filter(e => e.timestamp >= timeRange.start && e.timestamp <= timeRange.end)
      : this.events;

    const relevantMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const totalOperations = relevantMetrics.length;
    const successfulOperations = relevantMetrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;
    const averageResponseTime = relevantMetrics.length > 0
      ? relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / relevantMetrics.length
      : 0;

    // Popular operations
    const popularOperations: Record<string, number> = {};
    relevantMetrics.forEach(m => {
      popularOperations[m.operationName] = (popularOperations[m.operationName] || 0) + 1;
    });

    // Error types
    const errorTypes: Record<string, number> = {};
    relevantEvents
      .filter(e => e.category === "error")
      .forEach(e => {
        errorTypes[e.action] = (errorTypes[e.action] || 0) + 1;
      });

    // Hourly usage
    const hourlyUsage: Record<string, number> = {};
    relevantEvents.forEach(e => {
      const hour = new Date(e.timestamp).getHours().toString();
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + 1;
    });

    // Daily usage
    const dailyUsage: Record<string, number> = {};
    relevantEvents.forEach(e => {
      const day = new Date(e.timestamp).toISOString().split('T')[0];
      dailyUsage[day] = (dailyUsage[day] || 0) + 1;
    });

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      averageResponseTime,
      popularOperations,
      errorTypes,
      hourlyUsage,
      dailyUsage,
    };
  }

  // Generate performance report
  generatePerformanceReport(): any {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);

    const dayMetrics = this.metrics.filter(m => m.timestamp >= oneDayAgo);
    const weekMetrics = this.metrics.filter(m => m.timestamp >= oneWeekAgo);

    const calculateStats = (metrics: PerformanceMetrics[]) => {
      if (metrics.length === 0) return null;
      
      const durations = metrics.map(m => m.duration);
      const successRate = metrics.filter(m => m.success).length / metrics.length;
      
      return {
        count: metrics.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        medianDuration: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)],
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        successRate,
        p95Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)],
        p99Duration: durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)],
      };
    };

    return {
      uptime: now - this.startTime,
      sessionId: this.currentSession,
      last24Hours: calculateStats(dayMetrics),
      lastWeek: calculateStats(weekMetrics),
      slowestOperations: this.metrics
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .map(m => ({
          operation: m.operationName,
          duration: m.duration,
          timestamp: new Date(m.timestamp).toISOString(),
          success: m.success,
        })),
      errorSummary: this.generateErrorSummary(),
    };
  }

  // Generate error summary
  private generateErrorSummary(): any {
    const errorEvents = this.events.filter(e => e.category === "error");
    const errorsByType: Record<string, any[]> = {};

    errorEvents.forEach(e => {
      if (!errorsByType[e.action]) {
        errorsByType[e.action] = [];
      }
      errorsByType[e.action].push({
        timestamp: new Date(e.timestamp).toISOString(),
        label: e.label,
        metadata: e.metadata,
      });
    });

    return {
      totalErrors: errorEvents.length,
      errorsByType,
      recentErrors: errorEvents
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20)
        .map(e => ({
          type: e.action,
          timestamp: new Date(e.timestamp).toISOString(),
          message: e.metadata?.message,
          context: e.label,
        })),
    };
  }

  // Export analytics data
  async exportData(format: "json" | "csv" = "json"): Promise<string> {
    const data = {
      session: this.currentSession,
      startTime: new Date(this.startTime).toISOString(),
      exportTime: new Date().toISOString(),
      events: this.events,
      metrics: this.metrics,
      stats: this.generateUsageStats(),
      performance: this.generatePerformanceReport(),
    };

    const filename = `analytics_export_${Date.now()}.${format}`;
    const filepath = path.join(this.analyticsDir, filename);

    if (format === "json") {
      await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    } else {
      // Convert to CSV format
      const csv = this.convertToCSV(data);
      await fs.writeFile(filepath, csv);
    }

    return filepath;
  }

  private convertToCSV(data: any): string {
    // Convert events to CSV
    const eventHeaders = ["timestamp", "type", "category", "action", "label", "value", "sessionId"];
    const eventRows = data.events.map((e: AnalyticsEvent) => 
      eventHeaders.map(h => JSON.stringify(e[h as keyof AnalyticsEvent] || "")).join(",")
    );

    const metricsHeaders = ["timestamp", "operationName", "duration", "success", "errorMessage"];
    const metricsRows = data.metrics.map((m: PerformanceMetrics) => 
      metricsHeaders.map(h => JSON.stringify(m[h as keyof PerformanceMetrics] || "")).join(",")
    );

    return [
      "EVENTS",
      eventHeaders.join(","),
      ...eventRows,
      "",
      "METRICS", 
      metricsHeaders.join(","),
      ...metricsRows,
    ].join("\n");
  }

  // Persist important events to disk
  private async persistEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const filename = `events_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.analyticsDir, filename);
      
      let existingEvents: AnalyticsEvent[] = [];
      try {
        const content = await fs.readFile(filepath, "utf-8");
        existingEvents = JSON.parse(content);
      } catch {
        // File doesn't exist yet
      }

      existingEvents.push(event);
      await fs.writeFile(filepath, JSON.stringify(existingEvents, null, 2));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to persist event:`, error);
    }
  }

  // Load persisted data on startup
  private async loadPersistedData(): Promise<void> {
    try {
      const files = await fs.readdir(this.analyticsDir);
      const eventFiles = files.filter(f => f.startsWith("events_") && f.endsWith(".json"));
      
      for (const file of eventFiles.slice(-7)) { // Load last 7 days
        try {
          const content = await fs.readFile(path.join(this.analyticsDir, file), "utf-8");
          const events: AnalyticsEvent[] = JSON.parse(content);
          this.events.push(...events);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to load ${file}:`, error);
        }
      }

      // Trim to max events
      if (this.events.length > this.maxEvents) {
        this.events = this.events.slice(-this.maxEvents);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to load persisted analytics:`, error);
    }
  }

  // Setup periodic reports
  private setupPeriodicReports(): void {
    // Daily report
    setInterval(async () => {
      try {
        const report = this.generatePerformanceReport();
        await this.persistReport("daily", report);
        console.error(`[${new Date().toISOString()}] Daily analytics report generated`);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Failed to generate daily report:`, error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Hourly summary
    setInterval(() => {
      const stats = this.generateUsageStats({
        start: Date.now() - (60 * 60 * 1000), // Last hour
        end: Date.now(),
      });
      
      this.emit("hourly-summary", stats);
    }, 60 * 60 * 1000); // 1 hour
  }

  // Persist reports
  private async persistReport(type: string, report: any): Promise<void> {
    try {
      const filename = `report_${type}_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.analyticsDir, filename);
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to persist ${type} report:`, error);
    }
  }

  // Get real-time dashboard data
  getDashboardData(): any {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      realTime: {
        activeSession: this.currentSession,
        uptime: now - this.startTime,
        recentEvents: this.events.slice(-10),
        recentMetrics: this.metrics.slice(-10),
      },
      lastHour: this.generateUsageStats({ start: oneHourAgo, end: now }),
      last24Hours: this.generateUsageStats({ start: oneDayAgo, end: now }),
      performance: this.generatePerformanceReport(),
      alerts: this.generateAlerts(),
    };
  }

  // Generate alerts based on thresholds
  private generateAlerts(): any[] {
    const alerts = [];
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Check error rate
    const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo);
    const errorEvents = recentEvents.filter(e => e.category === "error");
    const errorRate = recentEvents.length > 0 ? errorEvents.length / recentEvents.length : 0;

    if (errorRate > 0.1) { // 10% error rate
      alerts.push({
        type: "error_rate",
        severity: "warning",
        message: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        timestamp: now,
      });
    }

    // Check performance
    const recentMetrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
    const avgDuration = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length 
      : 0;

    if (avgDuration > 10000) { // 10 seconds
      alerts.push({
        type: "performance",
        severity: "warning", 
        message: `Slow performance detected: ${(avgDuration / 1000).toFixed(1)}s average`,
        timestamp: now,
      });
    }

    return alerts;
  }
}
