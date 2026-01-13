# API Documentation

Generated: 2026-01-13T08:03:57.090Z

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
- `tokens` (number) - Optional number of tokens consumed by the operation

**Returns:** `void`

### trackAnalysisRun

Track analysis run completion

**Method:** `function`

**Parameters:**
- `filesProcessed` (number) - The number of files processed during the analysis run

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

## New Features

### UsageTracker

Usage tracking system for cost monitoring and optimization

**Category:** enhanced
**Affected Files:** src/usage/tracker.ts

## Architectural Changes

### tracker

**Type:** component-modified
**Impact:** medium

Component modified: tracker

## Changed Files

- `src/usage/tracker.ts` (modified)

