# Auto-Doc-Sync System API Documentation

## Overview

The Auto-Doc-Sync System provides a comprehensive API for automated documentation synchronization. This API enables integration with code analysis, template processing, and documentation generation workflows.

**Version:** 1.0.0  
**Base URL:** `http://localhost:3000/api`

## Authentication

The API uses API key authentication. Include your API key in the request headers:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### POST /analyze

**Description:** Analyze code changes and generate documentation requirements

**Parameters:**
- `files` (array) *required*: Array of file paths to analyze
- `depth` (string): Analysis depth - "shallow" or "deep" (default: "deep")
- `includePatterns` (array): File patterns to include in analysis
- `excludePatterns` (array): File patterns to exclude from analysis

**Request Body:**
```json
{
  "files": ["src/analyzer.ts", "src/templates.ts"],
  "depth": "deep",
  "includePatterns": ["**/*.ts", "**/*.js"],
  "excludePatterns": ["**/*.test.*", "**/node_modules/**"]
}
```

**Response:**
```json
{
  "analysis": {
    "timestamp": "2026-01-08T10:30:00Z",
    "triggerType": "manual",
    "changedFiles": [...],
    "extractedAPIs": [...],
    "newFeatures": [...],
    "architecturalChanges": [...],
    "documentationRequirements": [...]
  },
  "status": "success"
}
```

**Example Usage:**
```typescript
const response = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    files: ['src/analyzer.ts'],
    depth: 'deep'
  })
});
const analysis = await response.json();
```

**Error Conditions:**
- `400`: Invalid request parameters
- `401`: Authentication required
- `422`: Analysis failed due to invalid code

---

### POST /generate

**Description:** Generate documentation using templates and analysis results

**Parameters:**
- `analysisId` (string) *required*: ID of the analysis to use for generation
- `templates` (array) *required*: Array of template names to apply
- `outputTargets` (array): Specific output targets to generate

**Request Body:**
```json
{
  "analysisId": "analysis-123",
  "templates": ["api-documentation", "setup-instructions"],
  "outputTargets": ["api-specs", "readme-sections"]
}
```

**Response:**
```json
{
  "generated": [
    {
      "template": "api-documentation",
      "target": "api-specs",
      "file": ".kiro/specs/api.md",
      "status": "success"
    }
  ],
  "status": "success"
}
```

---

### GET /templates

**Description:** List available documentation templates

**Response:**
```json
{
  "templates": [
    {
      "name": "api-documentation",
      "type": "api-doc",
      "description": "Standard API documentation template",
      "variables": ["api_name", "endpoints", "authentication"]
    },
    {
      "name": "setup-instructions",
      "type": "setup-instructions", 
      "description": "Installation and setup guide template",
      "variables": ["project_name", "prerequisites", "installation_steps"]
    }
  ]
}
```

---

### POST /hooks/trigger

**Description:** Manually trigger a documentation sync hook

**Parameters:**
- `hookName` (string) *required*: Name of the hook to trigger
- `context` (object): Additional context data for the hook

**Request Body:**
```json
{
  "hookName": "manual-doc-sync",
  "context": {
    "scope": "all",
    "force": false
  }
}
```

**Response:**
```json
{
  "execution": {
    "hookName": "manual-doc-sync",
    "status": "completed",
    "duration": 1250,
    "results": {
      "filesUpdated": 3,
      "errors": 0
    }
  }
}
```

## Common Error Codes

- `400`: Bad Request - Invalid request parameters or format
- `401`: Unauthorized - Authentication required or invalid API key
- `404`: Not Found - Requested resource does not exist
- `422`: Unprocessable Entity - Request valid but cannot be processed
- `500`: Internal Server Error - Unexpected server error

## Examples

### Complete Documentation Sync Workflow

Analyze code changes and generate documentation:

```typescript
// 1. Analyze code changes
const analysisResponse = await fetch('/api/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    files: ['src/**/*.ts'],
    depth: 'deep'
  })
});

const analysis = await analysisResponse.json();

// 2. Generate documentation
const generateResponse = await fetch('/api/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    analysisId: analysis.analysis.id,
    templates: ['api-documentation', 'architecture-notes'],
    outputTargets: ['api-specs', 'dev-logs']
  })
});

const generated = await generateResponse.json();
console.log('Documentation updated:', generated.generated);
```

**Expected Output:**
```json
{
  "generated": [
    {
      "template": "api-documentation",
      "target": "api-specs", 
      "file": ".kiro/specs/api.md",
      "status": "success"
    },
    {
      "template": "architecture-notes",
      "target": "dev-logs",
      "file": ".kiro/development-log/architecture-update.md",
      "status": "success"
    }
  ]
}
```

---

### Manual Hook Trigger

Trigger documentation sync manually:

```typescript
const hookResponse = await fetch('/api/hooks/trigger', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    hookName: 'manual-doc-sync',
    context: {
      scope: 'api',
      dryRun: false
    }
  })
});

const execution = await hookResponse.json();
console.log('Hook execution:', execution.execution);
```

**Expected Output:**
```json
{
  "execution": {
    "hookName": "manual-doc-sync",
    "status": "completed",
    "duration": 850,
    "results": {
      "filesUpdated": 1,
      "errors": 0,
      "updatedFiles": [".kiro/specs/api.md"]
    }
  }
}
```

## Integration Notes

- All endpoints return JSON responses
- Use appropriate HTTP methods for different operations
- Include proper error handling in your implementations
- Rate limiting may apply to analysis and generation endpoints
- Hook executions are asynchronous and may take time to complete

## Support

For questions or issues with this API, please refer to the Auto-Doc-Sync System documentation or contact the development team.