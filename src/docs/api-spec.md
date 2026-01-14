# API Documentation

Generated: 2026-01-13T10:55:08.567Z

## API Endpoints

### analyzeCode

Analyze code changes using the subagent

**Method:** `function`

**Parameters:**
- `request` (CodeAnalysisRequest) - The request object containing code analysis details

**Returns:** `Promise<CodeAnalysisResponse>`

### classifyChanges

Classify changes using the subagent

**Method:** `function`

**Parameters:**
- `request` (ChangeClassificationRequest) - The request object containing change classification details

**Returns:** `Promise<ChangeClassificationResponse>`

### generateDocumentation

Generate documentation using the subagent

**Method:** `function`

**Parameters:**
- `request` (DocumentationGenerationRequest) - The request object containing documentation generation details

**Returns:** `Promise<DocumentationGenerationResponse>`

### processTemplate

Process templates using the subagent

**Method:** `function`

**Parameters:**
- `request` (TemplateProcessingRequest) - The request object containing template processing details

**Returns:** `Promise<TemplateProcessingResponse>`

### generateReadme

Generate README content using the subagent

**Method:** `function`

**Parameters:**
- `request` (ReadmeGenerationRequest) - The request object containing README generation details

**Returns:** `Promise<ReadmeGenerationResponse>`

### sendRequest

Send request to OpenAI for AI-powered analysis using structured outputs

**Method:** `function`

**Parameters:**
- `request` (SubagentRequest) - The request object to be sent to OpenAI

**Returns:** `Promise<SubagentResponse>`

### selectModelForTask

Select the appropriate model based on task complexity

**Method:** `function`

**Parameters:**
- `taskType` (string) - The type of task to determine the model

**Returns:** `string`

### getMaxTokensForTask

Get appropriate max tokens for each task type

**Method:** `function`

**Parameters:**
- `taskType` (string) - The type of task to determine max tokens

**Returns:** `number`

### buildPromptAndSchema

Build appropriate prompt and schema based on request type

**Method:** `function`

**Parameters:**
- `request` (SubagentRequest) - The request object to build prompt and schema for

**Returns:** `Promise<{ prompt: string; schema: any }>`

### getSchemaName

Get schema name for structured output

**Method:** `function`

**Parameters:**
- `requestType` (string) - The type of request to get schema name

**Returns:** `string`

### getDefaultSchema

Get default schema for fallback cases

**Method:** `function`

**Parameters:**
- `requestType` (string) - The type of request to get default schema

**Returns:** `any`

### loadPromptFile

Load prompt from .kiro/prompts/ directory

**Method:** `function`

**Parameters:**
- `filename` (string) - The filename of the prompt to load

**Returns:** `Promise<string>`

### buildPromptFromConfig

Fallback to config-based prompts

**Method:** `function`

**Parameters:**
- `request` (SubagentRequest) - The request object to build prompt from config

**Returns:** `string`

### getConfig

Get subagent configuration

**Method:** `function`

**Returns:** `SubagentConfig`

### updateContext

Update subagent context

**Method:** `function`

**Parameters:**
- `context` (Partial<SubagentContext>) - The context to update the subagent with

**Returns:** `void`

### validateConfig

Validate subagent configuration

**Method:** `function`

**Returns:** `boolean`

### SubagentClient

Subagent Client - Interface for communicating with AI models for code analysis

**Method:** `class`

**Returns:** `class`

## New Features

### SubagentClient

Updated SubagentClient class with enhanced functionality for AI model communication.


## Architectural Changes

### SubagentClient

**Type:** undefined
**Impact:** medium

Modified the SubagentClient to improve its interface for AI model communication.

### client

**Type:** component-modified
**Impact:** medium

Component modified: client

## Changed Files

- `src/subagent/client.ts` (modified)

