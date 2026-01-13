/**
 * Usage tracking system for cost monitoring and optimization
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { 
  UsageMetrics, 
  UsageSummary, 
  UsageConfig, 
  UsageAlert, 
  OperationMetrics,
  DEFAULT_USAGE_CONFIG 
} from './types';

export class UsageTracker {
  private config: UsageConfig;
  private currentSession: Partial<UsageMetrics> | null = null;
  private operationStartTimes: Map<string, number> = new Map();

  constructor(config?: Partial<UsageConfig>) {
    this.config = { ...DEFAULT_USAGE_CONFIG, ...config };
  }

  /**
   * Start tracking a new session
   */
  async startSession(sessionId: string): Promise<void> {
    if (!this.config.enabled) return;

    this.currentSession = {
      id: this.generateMetricsId(),
      timestamp: new Date().toISOString(),
      sessionId,
      analysisRuns: 0,
      filesProcessed: 0,
      tokensConsumed: 0,
      estimatedCost: 0,
      executionTimeMs: 0,
      operationBreakdown: []
    };

    await this.ensureDataDirectory();
  }

  /**
   * Track the start of an operation
   */
  startOperation(operationType: OperationMetrics['type'], operationId?: string): string {
    if (!this.config.enabled || !this.currentSession) return '';

    const id = operationId || `${operationType}-${Date.now()}`;
    this.operationStartTimes.set(id, Date.now());
    return id;
  }

  /**
   * Track the completion of an operation
   */
  endOperation(
    operationId: string, 
    operationType: OperationMetrics['type'],
    tokens?: number
  ): void {
    if (!this.config.enabled || !this.currentSession) return;

    const startTime = this.operationStartTimes.get(operationId);
    if (!startTime) return;

    const durationMs = Date.now() - startTime;
    const cost = this.calculateOperationCost(operationType, tokens || 0);

    // Update current session
    this.currentSession.executionTimeMs = (this.currentSession.executionTimeMs || 0) + durationMs;
    this.currentSession.tokensConsumed = (this.currentSession.tokensConsumed || 0) + (tokens || 0);
    this.currentSession.estimatedCost = (this.currentSession.estimatedCost || 0) + cost;

    // Add to operation breakdown
    if (!this.currentSession.operationBreakdown) {
      this.currentSession.operationBreakdown = [];
    }

    const existingOp = this.currentSession.operationBreakdown.find(op => op.type === operationType);
    if (existingOp) {
      existingOp.count++;
      existingOp.durationMs += durationMs;
      existingOp.tokens = (existingOp.tokens || 0) + (tokens || 0);
      existingOp.cost += cost;
    } else {
      this.currentSession.operationBreakdown.push({
        type: operationType,
        count: 1,
        durationMs,
        tokens,
        cost
      });
    }

    this.operationStartTimes.delete(operationId);
  }

  /**
   * Track analysis run completion
   */
  trackAnalysisRun(filesProcessed: number): void {
    if (!this.config.enabled || !this.currentSession) return;

    this.currentSession.analysisRuns = (this.currentSession.analysisRuns || 0) + 1;
    this.currentSession.filesProcessed = (this.currentSession.filesProcessed || 0) + filesProcessed;
  }

  /**
   * Check if current session exceeds cost thresholds
   */
  checkCostThresholds(): UsageAlert | null {
    if (!this.config.enabled || !this.currentSession) return null;

    const currentCost = this.currentSession.estimatedCost || 0;

    if (currentCost >= this.config.costLimitPerSession) {
      return {
        type: 'limit-reached',
        message: `Cost limit reached: $${currentCost.toFixed(4)} >= $${this.config.costLimitPerSession}`,
        currentCost,
        threshold: this.config.costLimitPerSession,
        timestamp: new Date().toISOString()
      };
    }

    if (currentCost >= this.config.costWarningThreshold) {
      return {
        type: 'warning',
        message: `Cost warning: $${currentCost.toFixed(4)} >= $${this.config.costWarningThreshold}`,
        currentCost,
        threshold: this.config.costWarningThreshold,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * End current session and persist metrics
   */
  async endSession(): Promise<UsageMetrics | null> {
    if (!this.config.enabled || !this.currentSession) return null;

    const metrics = this.currentSession as UsageMetrics;
    
    try {
      await this.persistMetrics(metrics);
      await this.cleanupOldMetrics();
      
      const result = { ...metrics };
      this.currentSession = null;
      
      return result;
    } catch (error) {
      console.warn('Failed to persist usage metrics:', error);
      return null;
    }
  }

  /**
   * Get usage summary for a time period
   */
  async getUsageSummary(days: number = 7): Promise<UsageSummary> {
    if (!this.config.enabled) {
      return this.getEmptySummary();
    }

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const metrics = await this.loadMetricsInRange(startDate, endDate);
      
      if (metrics.length === 0) {
        return this.getEmptySummary();
      }

      const summary: UsageSummary = {
        totalAnalysisRuns: metrics.reduce((sum, m) => sum + m.analysisRuns, 0),
        totalFilesProcessed: metrics.reduce((sum, m) => sum + m.filesProcessed, 0),
        totalTokensConsumed: metrics.reduce((sum, m) => sum + m.tokensConsumed, 0),
        totalEstimatedCost: metrics.reduce((sum, m) => sum + m.estimatedCost, 0),
        totalExecutionTimeMs: metrics.reduce((sum, m) => sum + m.executionTimeMs, 0),
        averageTokensPerRun: 0,
        averageCostPerRun: 0,
        averageExecutionTimeMs: 0,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        sessionCount: metrics.length
      };

      // Calculate averages
      if (summary.totalAnalysisRuns > 0) {
        summary.averageTokensPerRun = summary.totalTokensConsumed / summary.totalAnalysisRuns;
        summary.averageCostPerRun = summary.totalEstimatedCost / summary.totalAnalysisRuns;
        summary.averageExecutionTimeMs = summary.totalExecutionTimeMs / summary.totalAnalysisRuns;
      }

      return summary;
    } catch (error) {
      console.warn('Failed to generate usage summary:', error);
      return this.getEmptySummary();
    }
  }

  /**
   * Get current session metrics
   */
  getCurrentSessionMetrics(): Partial<UsageMetrics> | null {
    return this.currentSession ? { ...this.currentSession } : null;
  }

  /**
   * Calculate cost for a specific operation
   */
  private calculateOperationCost(operationType: OperationMetrics['type'], tokens: number): number {
    if (tokens === 0) return 0;

    // Estimate input/output token ratio based on operation type
    let inputRatio = 0.7; // Default: 70% input, 30% output
    
    switch (operationType) {
      case 'analysis':
        inputRatio = 0.8; // Analysis is mostly input
        break;
      case 'subagent':
        inputRatio = 0.6; // Subagent generates more output
        break;
      case 'template':
        inputRatio = 0.9; // Templates are mostly input processing
        break;
    }

    const inputTokens = Math.floor(tokens * inputRatio);
    const outputTokens = tokens - inputTokens;

    const inputCost = (inputTokens / 1000) * this.config.inputTokenCostPer1K;
    const outputCost = (outputTokens / 1000) * this.config.outputTokenCostPer1K;

    return inputCost + outputCost;
  }

  /**
   * Generate unique metrics ID
   */
  private generateMetricsId(): string {
    return `metrics-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Ensure data directory exists
   */
  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.dataDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create usage data directory: ${error}`);
    }
  }

  /**
   * Persist metrics to file
   */
  private async persistMetrics(metrics: UsageMetrics): Promise<void> {
    const date = new Date(metrics.timestamp);
    const fileName = `usage-${date.toISOString().split('T')[0]}.json`;
    const filePath = join(this.config.dataDirectory, fileName);

    try {
      // Load existing data for the day
      let dailyMetrics: UsageMetrics[] = [];
      try {
        const existingData = await fs.readFile(filePath, 'utf-8');
        dailyMetrics = JSON.parse(existingData);
      } catch {
        // File doesn't exist yet, start with empty array
      }

      // Add new metrics
      dailyMetrics.push(metrics);

      // Write back to file
      await fs.writeFile(filePath, JSON.stringify(dailyMetrics, null, 2));
    } catch (error) {
      throw new Error(`Failed to persist usage metrics: ${error}`);
    }
  }

  /**
   * Load metrics within date range
   */
  private async loadMetricsInRange(startDate: Date, endDate: Date): Promise<UsageMetrics[]> {
    const allMetrics: UsageMetrics[] = [];
    
    try {
      const files = await fs.readdir(this.config.dataDirectory);
      const usageFiles = files.filter(f => f.startsWith('usage-') && f.endsWith('.json'));

      for (const file of usageFiles) {
        try {
          const filePath = join(this.config.dataDirectory, file);
          const data = await fs.readFile(filePath, 'utf-8');
          const dailyMetrics: UsageMetrics[] = JSON.parse(data);
          
          // Filter by date range
          const filteredMetrics = dailyMetrics.filter(m => {
            const metricDate = new Date(m.timestamp);
            return metricDate >= startDate && metricDate <= endDate;
          });
          
          allMetrics.push(...filteredMetrics);
        } catch (error) {
          console.warn(`Failed to load usage file ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to read usage directory:', error);
    }

    return allMetrics;
  }

  /**
   * Clean up old metrics files
   */
  private async cleanupOldMetrics(): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const files = await fs.readdir(this.config.dataDirectory);
      const usageFiles = files.filter(f => f.startsWith('usage-') && f.endsWith('.json'));

      for (const file of usageFiles) {
        // Extract date from filename: usage-YYYY-MM-DD.json
        const dateMatch = file.match(/usage-(\d{4}-\d{2}-\d{2})\.json/);
        if (dateMatch) {
          const fileDate = new Date(dateMatch[1]);
          if (fileDate < cutoffDate) {
            const filePath = join(this.config.dataDirectory, file);
            await fs.unlink(filePath);
            console.log(`Cleaned up old usage file: ${file}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old usage metrics:', error);
    }
  }

  /**
   * Get empty summary for when tracking is disabled or no data exists
   */
  private getEmptySummary(): UsageSummary {
    const now = new Date().toISOString();
    return {
      totalAnalysisRuns: 0,
      totalFilesProcessed: 0,
      totalTokensConsumed: 0,
      totalEstimatedCost: 0,
      totalExecutionTimeMs: 0,
      averageTokensPerRun: 0,
      averageCostPerRun: 0,
      averageExecutionTimeMs: 0,
      periodStart: now,
      periodEnd: now,
      sessionCount: 0
    };
  }
}