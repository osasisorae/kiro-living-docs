# Code Analysis Prompt

Analyze the following code changes and extract detailed information about the codebase modifications.

## Analysis Requirements

Extract the following elements from the code changes:

1. **Function definitions** with parameters and return types
2. **Class definitions** with methods and properties  
3. **API endpoints** and their specifications
4. **Exported interfaces** and types

## Input Data

Code changes:
{changes}

## Expected Output Format

Provide the analysis in the following JSON structure:

```json
{
  "extractedFunctions": [
    {
      "name": "functionName",
      "parameters": [
        {
          "name": "paramName",
          "type": "paramType",
          "optional": false,
          "description": "Parameter description"
        }
      ],
      "returnType": "returnType",
      "description": "Function description",
      "isExported": true,
      "filePath": "src/file.ts"
    }
  ],
  "extractedClasses": [
    {
      "name": "ClassName", 
      "methods": [
        {
          "name": "methodName",
          "parameters": [],
          "returnType": "void",
          "visibility": "public"
        }
      ],
      "properties": [
        {
          "name": "propertyName",
          "type": "propertyType",
          "visibility": "private"
        }
      ],
      "isExported": true,
      "filePath": "src/file.ts"
    }
  ],
  "extractedAPIs": [
    {
      "name": "endpointName",
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/endpoint",
      "parameters": [],
      "returnType": "ResponseType",
      "description": "API endpoint description"
    }
  ],
  "extractedTypes": [
    {
      "name": "TypeName",
      "definition": "type definition",
      "isExported": true,
      "filePath": "src/types.ts"
    }
  ]
}
```

## Analysis Guidelines

- Focus on **exported** functions, classes, and types that affect the public API
- Include meaningful descriptions based on code context and comments
- Identify TypeScript/JavaScript patterns and modern syntax
- Extract JSDoc comments when available
- Note any breaking changes or deprecations