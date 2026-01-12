# API Documentation

Generated: 2026-01-12T16:33:23.146Z

## API Endpoints

### resolveWorkspacePath

Resolve a path relative to the workspace root

**Method:** `function`

**Parameters:**
- `relativePath` (string) - The relative path to resolve

**Returns:** `string`

### initialize

Initialize the system and load configurations

**Method:** `function`

**Returns:** `Promise<void>`

### run

Main execution method that coordinates all system components

**Method:** `function`

**Parameters:**
- `options` (RunOptions) - Options for running the system

**Returns:** `Promise<void>`

### detectChanges

Detect code changes based on trigger type

**Method:** `function`

**Parameters:**
- `options` (RunOptions) - Options for detecting changes

**Returns:** `Promise<string[]>`

### performAnalysis

Perform code analysis with optional subagent enhancement

**Method:** `function`

**Parameters:**
- `changes` (string[]) - List of changes to analyze

**Returns:** `Promise<ChangeAnalysis>`

### processDocumentationRequirements

Process documentation requirements using templates

**Method:** `function`

**Parameters:**
- `requirements` (DocumentationRequirement[]) - List of documentation requirements
- `analysis` (ChangeAnalysis) - Analysis results to use for processing

**Returns:** `Promise<DocumentationRequirement[]>`

### AutoDocSyncSystem.resolveWorkspacePath

AutoDocSyncSystem method: resolveWorkspacePath

**Method:** `method`

**Returns:** `any`

### AutoDocSyncSystem.initialize

AutoDocSyncSystem method: initialize

**Method:** `method`

**Returns:** `any`

### AutoDocSyncSystem.run

AutoDocSyncSystem method: run

**Method:** `method`

**Returns:** `any`

### AutoDocSyncSystem.detectChanges

AutoDocSyncSystem method: detectChanges

**Method:** `method`

**Returns:** `any`

### AutoDocSyncSystem.performAnalysis

AutoDocSyncSystem method: performAnalysis

**Method:** `method`

**Returns:** `any`

### AutoDocSyncSystem.processDocumentationRequirements

AutoDocSyncSystem method: processDocumentationRequirements

**Method:** `method`

**Returns:** `any`

## New Features

### AutoDocSyncSystem

Main orchestration system that coordinates all components

**Category:** enhanced
**Affected Files:** src/orchestrator.ts

## Architectural Changes

### orchestrator

**Type:** component-modified
**Impact:** medium

Component modified: orchestrator

## Changed Files

- `src/orchestrator.ts` (modified)

