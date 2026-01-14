# API Documentation

Generated: 2026-01-13T11:02:22.442Z

## API Endpoints

### selectModelForTask

Select the appropriate model based on task complexity. Uses cheaper models for simpler tasks to optimize cost.

**Method:** `function`

**Parameters:**
- `taskType` (string) - The type of task to determine the model for.

**Returns:** `string`

### getMaxTokensForTask

Get appropriate max tokens for each task type.

**Method:** `function`

**Parameters:**
- `taskType` (string) - The type of task to determine the max tokens for.

**Returns:** `number`

### SubagentClient

Class for handling subagent client operations, including code analysis, change classification, documentation generation, and more.

**Method:** `class`

**Returns:** `class`

### SubagentIntegration

Class for integrating subagent processing with local analysis, enhancing capabilities with AI-driven insights.

**Method:** `class`

**Returns:** `class`

## New Features

### SubagentIntegration

Updated SubagentIntegration class to enhance analysis capabilities with subagent processing.


### SubagentClient

Class for handling subagent client operations, including code analysis, change classification, documentation generation, and more.

**Category:** enhanced
**Affected Files:** src/subagent/integration.ts

## Architectural Changes

### SubagentIntegration

**Type:** undefined
**Impact:** medium

Component modified: integration

### integration

**Type:** component-modified
**Impact:** medium

Component modified: integration

## Changed Files

- `src/subagent/integration.ts` (modified)

