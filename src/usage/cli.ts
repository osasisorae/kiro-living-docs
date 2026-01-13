/**
 * CLI commands for usage tracking and cost monitoring
 */

import { UsageTracker } from './tracker';
import { DEFAULT_USAGE_CONFIG } from './types';

export class UsageCLI {
  private tracker: UsageTracker;

  constructor(dataDirectory?: string) {
    this.tracker = new UsageTracker({
      ...DEFAULT_USAGE_CONFIG,
      dataDirectory: dataDirectory || DEFAULT_USAGE_CONFIG.dataDirectory
    });
  }

  /**
   * Display usage summary for the last N days
   */
  async showSummary(days: number = 7): Promise<void> {
    try {
      const summary = await this.tracker.getUsageSummary(days);
      
      console.log(`\n=== Usage Summary (Last ${days} days) ===`);
      console.log(`Period: ${new Date(summary.periodStart).toLocaleDateString()} - ${new Date(summary.periodEnd).toLocaleDateString()}`);
      console.log(`Sessions: ${summary.sessionCount}`);
      console.log(`Total analysis runs: ${summary.totalAnalysisRuns}`);
      console.log(`Total files processed: ${summary.totalFilesProcessed}`);
      console.log(`Total tokens consumed: ${summary.totalTokensConsumed.toLocaleString()}`);
      console.log(`Total estimated cost: $${summary.totalEstimatedCost.toFixed(4)}`);
      console.log(`Total execution time: ${(summary.totalExecutionTimeMs / 1000).toFixed(2)}s`);
      
      if (summary.totalAnalysisRuns > 0) {
        console.log('\n--- Averages per Analysis Run ---');
        console.log(`Tokens per run: ${Math.round(summary.averageTokensPerRun).toLocaleString()}`);
        console.log(`Cost per run: $${summary.averageCostPerRun.toFixed(4)}`);
        console.log(`Time per run: ${(summary.averageExecutionTimeMs / 1000).toFixed(2)}s`);
      }
      
      // Cost efficiency insights
      if (summary.totalEstimatedCost > 0) {
        const costPerFile = summary.totalFilesProcessed > 0 
          ? summary.totalEstimatedCost / summary.totalFilesProcessed 
          : 0;
        const costPerSecond = summary.totalExecutionTimeMs > 0 
          ? summary.totalEstimatedCost / (summary.totalExecutionTimeMs / 1000) 
          : 0;
          
        console.log('\n--- Cost Efficiency ---');
        console.log(`Cost per file processed: $${costPerFile.toFixed(6)}`);
        console.log(`Cost per second: $${costPerSecond.toFixed(6)}`);
      }
      
      console.log('=====================================\n');
    } catch (error) {
      console.error('Failed to generate usage summary:', error);
    }
  }

  /**
   * Display current session metrics (if any)
   */
  showCurrentSession(): void {
    const current = this.tracker.getCurrentSessionMetrics();
    
    if (!current) {
      console.log('No active session');
      return;
    }

    console.log('\n=== Current Session ===');
    console.log(`Session ID: ${current.sessionId}`);
    console.log(`Started: ${current.timestamp ? new Date(current.timestamp).toLocaleString() : 'Unknown'}`);
    console.log(`Analysis runs: ${current.analysisRuns || 0}`);
    console.log(`Files processed: ${current.filesProcessed || 0}`);
    console.log(`Tokens consumed: ${(current.tokensConsumed || 0).toLocaleString()}`);
    console.log(`Estimated cost: $${(current.estimatedCost || 0).toFixed(4)}`);
    console.log(`Execution time: ${current.executionTimeMs || 0}ms`);
    
    if (current.operationBreakdown && current.operationBreakdown.length > 0) {
      console.log('\nOperation breakdown:');
      for (const op of current.operationBreakdown) {
        console.log(`  ${op.type}: ${op.count} ops, ${op.durationMs}ms, $${op.cost.toFixed(4)}`);
      }
    }
    
    console.log('=======================\n');
  }

  /**
   * Show cost projections based on current usage patterns
   */
  async showProjections(): Promise<void> {
    try {
      const summary = await this.tracker.getUsageSummary(30); // Last 30 days
      
      if (summary.sessionCount === 0) {
        console.log('No usage data available for projections');
        return;
      }

      console.log('\n=== Cost Projections ===');
      
      // Daily averages
      const dailyAvgCost = summary.totalEstimatedCost / 30;
      const dailyAvgRuns = summary.totalAnalysisRuns / 30;
      
      console.log(`Daily average cost: $${dailyAvgCost.toFixed(4)}`);
      console.log(`Daily average runs: ${dailyAvgRuns.toFixed(1)}`);
      
      // Monthly projections
      const monthlyProjection = dailyAvgCost * 30;
      const yearlyProjection = monthlyProjection * 12;
      
      console.log('\n--- Projections ---');
      console.log(`Monthly (30 days): $${monthlyProjection.toFixed(2)}`);
      console.log(`Yearly (365 days): $${yearlyProjection.toFixed(2)}`);
      
      // Usage scenarios
      console.log('\n--- Usage Scenarios ---');
      const costPerRun = summary.averageCostPerRun;
      
      if (costPerRun > 0) {
        console.log(`Light usage (5 runs/day): $${(costPerRun * 5 * 30).toFixed(2)}/month`);
        console.log(`Medium usage (20 runs/day): $${(costPerRun * 20 * 30).toFixed(2)}/month`);
        console.log(`Heavy usage (50 runs/day): $${(costPerRun * 50 * 30).toFixed(2)}/month`);
      }
      
      console.log('========================\n');
    } catch (error) {
      console.error('Failed to generate cost projections:', error);
    }
  }

  /**
   * Show usage recommendations based on current patterns
   */
  async showRecommendations(): Promise<void> {
    try {
      const summary = await this.tracker.getUsageSummary(7);
      
      console.log('\n=== Usage Recommendations ===');
      
      if (summary.sessionCount === 0) {
        console.log('No recent usage data available');
        console.log('Recommendations will be available after running some analyses');
        console.log('==============================\n');
        return;
      }

      const recommendations: string[] = [];
      
      // Cost efficiency recommendations
      if (summary.averageCostPerRun > 0.05) {
        recommendations.push('Consider reducing subagent usage for simple analyses to lower costs');
      }
      
      if (summary.averageExecutionTimeMs > 30000) {
        recommendations.push('Analysis taking >30s per run - consider optimizing file patterns');
      }
      
      const filesPerRun = summary.totalFilesProcessed / Math.max(summary.totalAnalysisRuns, 1);
      if (filesPerRun > 50) {
        recommendations.push('Processing many files per run - consider more targeted analysis patterns');
      }
      
      if (summary.totalEstimatedCost > 1.0) {
        recommendations.push('Weekly cost >$1 - monitor usage and consider setting cost limits');
      }
      
      // Performance recommendations
      if (summary.averageTokensPerRun > 10000) {
        recommendations.push('High token usage - consider caching analysis results for similar files');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('Usage patterns look efficient - no specific recommendations');
      }
      
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
      
      console.log('==============================\n');
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  }
}

/**
 * CLI entry point for usage commands
 */
export async function runUsageCLI(command: string, args: string[] = []): Promise<void> {
  const cli = new UsageCLI();
  
  switch (command) {
    case 'summary':
      const days = args[0] ? parseInt(args[0]) : 7;
      await cli.showSummary(days);
      break;
      
    case 'current':
      cli.showCurrentSession();
      break;
      
    case 'projections':
      await cli.showProjections();
      break;
      
    case 'recommendations':
      await cli.showRecommendations();
      break;
      
    default:
      console.log('Usage: npm run usage <command> [args]');
      console.log('Commands:');
      console.log('  summary [days]     Show usage summary (default: 7 days)');
      console.log('  current           Show current session metrics');
      console.log('  projections       Show cost projections');
      console.log('  recommendations   Show usage optimization recommendations');
  }
}