/**
 * Usage tracking types for cost monitoring
 */

export interface UsageMetrics {
  /** Unique identifier for this metrics record */
  id: string;
  /** ISO timestamp when metrics were recorded */
  timestamp: string;
  /** Session ID linking to development log */
  sessionId: string;
  /** Number of analysis runs in this session */
  analysisRuns: number;
  /** Total files processed */
  filesProcessed: number;
  /** Tokens consumed by AI/subagent calls */
  tokensConsumed: number;
  /** Estimated cost in USD based on token pricing */
  estimatedCost: number;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Breakdown by operation type */
  operationBreakdown: OperationMetrics[];
}

export interface OperationMetrics {
  /** Type of operation */
  type: 'analysis' | 'template' | 'subagent' | 'file-write' | 'git-operation';
  /** Number of times this operation ran */
  count: number;
  /** Tokens used (if applicable) */
  tokens?: number;
  /** Time spent on this operation */
  durationMs: number;
  /** Estimated cost for this operation */
  cost: number;
}

export interface UsageSummary {
  /** Total metrics across all sessions */
  totalAnalysisRuns: number;
  totalFilesProcessed: number;
  totalTokensConsumed: number;
  totalEstimatedCost: number;
  totalExecutionTimeMs: number;
  /** Average metrics per session */
  averageTokensPerRun: number;
  averageCostPerRun: number;
  averageExecutionTimeMs: number;
  /** Time period covered */
  periodStart: string;
  periodEnd: string;
  /** Number of sessions in this summary */
  sessionCount: number;
}

export interface UsageConfig {
  /** Path to store usage data */
  dataDirectory: string;
  /** Token cost per 1K tokens (input) */
  inputTokenCostPer1K: number;
  /** Token cost per 1K tokens (output) */
  outputTokenCostPer1K: number;
  /** Warning threshold for estimated cost per session */
  costWarningThreshold: number;
  /** Maximum allowed cost per session (will abort if exceeded) */
  costLimitPerSession: number;
  /** Enable/disable usage tracking */
  enabled: boolean;
  /** Retention period for usage data in days */
  retentionDays: number;
}

export interface UsageAlert {
  type: 'warning' | 'limit-reached' | 'info';
  message: string;
  currentCost: number;
  threshold: number;
  timestamp: string;
}

export const DEFAULT_USAGE_CONFIG: UsageConfig = {
  dataDirectory: '.kiro/usage',
  inputTokenCostPer1K: 0.01,   // $0.01 per 1K input tokens (GPT-4 pricing estimate)
  outputTokenCostPer1K: 0.03,  // $0.03 per 1K output tokens
  costWarningThreshold: 0.10,  // Warn at $0.10 per session
  costLimitPerSession: 1.00,   // Hard limit at $1.00 per session
  enabled: true,
  retentionDays: 30
};
