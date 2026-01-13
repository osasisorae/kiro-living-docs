# API Documentation

Generated: 2026-01-13T07:44:22.582Z

## API Endpoints

### startSession

Start tracking a new session

**Method:** `function`

**Parameters:**
- `sessionId` (string) - The ID of the session to start tracking

**Returns:** `Promise<void>`

### startOperation

Track the start of an operation

**Method:** `function`

**Parameters:**
- `operationType` (OperationMetrics['type']) - The type of operation to start tracking
- `operationId` (string) - Optional ID for the operation

**Returns:** `string`

### endOperation

Track the completion of an operation

**Method:** `function`

**Parameters:**
- `operationId` (string) - The ID of the operation to end
- `operationType` (OperationMetrics['type']) - The type of operation to end
- `tokens` (number) - Optional number of tokens used in the operation

**Returns:** `void`

### trackAnalysisRun

Track analysis run completion

**Method:** `function`

**Parameters:**
- `filesProcessed` (number) - The number of files processed in the analysis run

**Returns:** `void`

### checkCostThresholds

Check if current session exceeds cost thresholds

**Method:** `function`

**Returns:** `UsageAlert | null`

### endSession

End current session and persist metrics

**Method:** `function`

**Returns:** `Promise<UsageMetrics | null>`

### getUsageSummary

Get usage summary for a time period

**Method:** `function`

**Parameters:**
- `days` (number) - The number of days to include in the summary

**Returns:** `Promise<UsageSummary>`

### getCurrentSessionMetrics

Get current session metrics

**Method:** `function`

**Returns:** `Partial<UsageMetrics> | null`

### calculateOperationCost

Calculate cost for a specific operation

**Method:** `function`

**Parameters:**
- `operationType` (OperationMetrics['type']) - The type of operation to calculate cost for
- `tokens` (number) - The number of tokens used in the operation

**Returns:** `number`

### generateMetricsId

Generate unique metrics ID

**Method:** `function`

**Returns:** `string`

### ensureDataDirectory

Ensure data directory exists

**Method:** `function`

**Returns:** `Promise<void>`

### persistMetrics

Persist metrics to file

**Method:** `function`

**Parameters:**
- `metrics` (UsageMetrics) - The metrics to persist

**Returns:** `Promise<void>`

### loadMetricsInRange

Load metrics within date range

**Method:** `function`

**Parameters:**
- `startDate` (Date) - The start date of the range
- `endDate` (Date) - The end date of the range

**Returns:** `Promise<UsageMetrics[]>`

### cleanupOldMetrics

Clean up old metrics files

**Method:** `function`

**Returns:** `Promise<void>`

### getEmptySummary

Get empty summary for when tracking is disabled or no data exists

**Method:** `function`

**Returns:** `UsageSummary`

### showSummary

Display usage summary for the last N days

**Method:** `function`

**Parameters:**
- `days` (number) - The number of days to include in the summary

**Returns:** `Promise<void>`

### showCurrentSession

Display current session metrics (if any)

**Method:** `function`

**Returns:** `void`

### showProjections

Show cost projections based on current usage patterns

**Method:** `function`

**Returns:** `Promise<void>`

### showRecommendations

Show usage recommendations based on current patterns

**Method:** `function`

**Returns:** `Promise<void>`

### runUsageCLI

CLI entry point for usage commands

**Method:** `function`

**Parameters:**
- `command` (string) - The command to execute
- `args` (string[]) - Optional arguments for the command

**Returns:** `Promise<void>`

### UsageTracker.startSession

UsageTracker method: startSession

**Method:** `method`

**Returns:** `any`

### UsageTracker.startOperation

UsageTracker method: startOperation

**Method:** `method`

**Returns:** `any`

### UsageTracker.endOperation

UsageTracker method: endOperation

**Method:** `method`

**Returns:** `any`

### UsageTracker.trackAnalysisRun

UsageTracker method: trackAnalysisRun

**Method:** `method`

**Returns:** `any`

### UsageTracker.checkCostThresholds

UsageTracker method: checkCostThresholds

**Method:** `method`

**Returns:** `any`

### UsageTracker.endSession

UsageTracker method: endSession

**Method:** `method`

**Returns:** `any`

### UsageTracker.getUsageSummary

UsageTracker method: getUsageSummary

**Method:** `method`

**Returns:** `any`

### UsageTracker.getCurrentSessionMetrics

UsageTracker method: getCurrentSessionMetrics

**Method:** `method`

**Returns:** `any`

### UsageTracker.calculateOperationCost

UsageTracker method: calculateOperationCost

**Method:** `method`

**Returns:** `any`

### UsageTracker.generateMetricsId

UsageTracker method: generateMetricsId

**Method:** `method`

**Returns:** `any`

### UsageTracker.ensureDataDirectory

UsageTracker method: ensureDataDirectory

**Method:** `method`

**Returns:** `any`

### UsageTracker.persistMetrics

UsageTracker method: persistMetrics

**Method:** `method`

**Returns:** `any`

### UsageTracker.loadMetricsInRange

UsageTracker method: loadMetricsInRange

**Method:** `method`

**Returns:** `any`

### UsageTracker.cleanupOldMetrics

UsageTracker method: cleanupOldMetrics

**Method:** `method`

**Returns:** `any`

### UsageTracker.getEmptySummary

UsageTracker method: getEmptySummary

**Method:** `method`

**Returns:** `any`

### UsageCLI.showSummary

UsageCLI method: showSummary

**Method:** `method`

**Returns:** `any`

### UsageCLI.showCurrentSession

UsageCLI method: showCurrentSession

**Method:** `method`

**Returns:** `any`

### UsageCLI.showProjections

UsageCLI method: showProjections

**Method:** `method`

**Returns:** `any`

### UsageCLI.showRecommendations

UsageCLI method: showRecommendations

**Method:** `method`

**Returns:** `any`

## New Features

### UsageTracker

Usage tracking system for cost monitoring and optimization

**Category:** enhanced
**Affected Files:** src/usage/tracker.ts, src/usage/types.ts, src/usage/cli.ts

### UsageCLI

CLI commands for usage tracking and cost monitoring

**Category:** enhanced
**Affected Files:** src/usage/tracker.ts, src/usage/types.ts, src/usage/cli.ts

## Architectural Changes

### tracker

**Type:** component-modified
**Impact:** medium

Component modified: tracker

### cli

**Type:** component-modified
**Impact:** medium

Component modified: cli

## Changed Files

- `src/usage/tracker.ts` (modified)
- `src/usage/types.ts` (modified)
- `src/usage/cli.ts` (modified)

