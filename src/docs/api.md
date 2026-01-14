# API Documentation

Generated: 2026-01-13T10:56:42.376Z

## API Endpoints

### performEnhancedAnalysis

Perform enhanced analysis using both local analyzer and subagent. Returns analysis results along with actual token usage from AI provider.

**Method:** `function`

**Parameters:**
- `changes` (string[]) - List of changes to analyze.

**Returns:** `Promise<ChangeAnalysis>`

### getLastTokensUsed

Get the actual token count from the last subagent operation. This returns real token usage from the OpenAI API response.

**Method:** `function`

**Returns:** `number`

### enhanceWithSubagent

Enhance local analysis results with subagent processing. Captures actual token usage from OpenAI API responses.

**Method:** `function`

**Parameters:**
- `localAnalysis` (ChangeAnalysis) - The result of the local analysis.
- `changes` (string[]) - List of changes to enhance.

**Returns:** `Promise<ChangeAnalysis>`

### generateDocumentation

Generate documentation using subagent.

**Method:** `function`

**Parameters:**
- `analysisResults` (ChangeAnalysis) - Results of the analysis to document.
- `templateType` (string) - Type of template to use for documentation.
- `targetFile` (string) - Target file for the documentation output.
- `existingContent` (string) - Existing content to consider in documentation generation.

**Returns:** `Promise<string>`

### generateReadme

Generate README using AI subagent.

**Method:** `function`

**Parameters:**
- `analysisResults` (ChangeAnalysis) - Results of the analysis to document in README.
- `existingContent` (string) - Existing README content to consider.
- `projectContext` (any) - Context of the project for README generation.

**Returns:** `Promise<string>`

### processTemplate

Process template using subagent.

**Method:** `function`

**Parameters:**
- `template` (string) - Template to process.
- `variables` (Record<string, any>) - Variables to substitute in the template.
- `templateType` (string) - Type of template to process.

**Returns:** `Promise<string>`

### generateFallbackDocumentation

Fallback documentation generation when subagent is unavailable. Provides useful output even without AI.

**Method:** `function`

**Parameters:**
- `analysisResults` (ChangeAnalysis) - Results of the analysis to document.
- `templateType` (string) - Type of template to use for fallback documentation.

**Returns:** `string`

### generateFallbackReadmeSection

Generate a README section update in offline mode.

**Method:** `function`

**Parameters:**
- `analysisResults` (ChangeAnalysis) - Results of the analysis to document in README.

**Returns:** `string`

### processTemplateFallback

Fallback template processing when subagent is unavailable.

**Method:** `function`

**Parameters:**
- `template` (string) - Template to process.
- `variables` (Record<string, any>) - Variables to substitute in the template.

**Returns:** `string`

### getSubagentConfig

Get subagent configuration.

**Method:** `function`

**Returns:** `any`

### updateAnalysisConfig

Update analysis configuration.

**Method:** `function`

**Parameters:**
- `config` (Partial<AnalysisConfig>) - Partial configuration to update the analysis.

**Returns:** `void`

### healthCheck

Health check for subagent integration.

**Method:** `function`

**Returns:** `Promise<boolean>`

### SubagentIntegration

Subagent Integration - Connects the analysis engine with the Kiro Subagent

**Method:** `class`

**Returns:** `class`

## New Features

### SubagentIntegration

Updated SubagentIntegration class to enhance analysis capabilities with subagent processing.


## Architectural Changes

### SubagentIntegration

**Type:** undefined
**Impact:** medium

Modified the SubagentIntegration component to include enhanced analysis features.

### integration

**Type:** component-modified
**Impact:** medium

Component modified: integration

## Changed Files

- `src/subagent/integration.ts` (modified)

