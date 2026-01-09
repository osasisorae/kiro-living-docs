# OpenAI Integration Guide for Auto-Doc-Sync

## The 400 Error Explanation

**Error**: `Invalid parameter: 'response_format' of type 'json_object' is not supported with this model`

**Root Cause**: You're using `gpt-4-turbo` with `response_format: { type: "json_object" }`. While `gpt-4-turbo` technically supports JSON mode, the issue is likely one of:
1. Outdated model name (should use specific version like `gpt-4-turbo-2024-04-09`)
2. Using the wrong response_format structure for your model
3. Model version doesn't support this parameter

## Supported Models and Response Formats

### Two Different Approaches

OpenAI offers **two different structured output methods**:

| Feature | Structured Outputs (json_schema) | JSON Mode (json_object) |
| :--- | :--- | :--- |
| **Supported Models** | `gpt-4o`, `gpt-4o-mini`, `gpt-4o-2024-08-06` and later | `gpt-3.5-turbo`, `gpt-4-*`, `gpt-4o-*` models |
| **Response Format** | `{ type: "json_schema", strict: true, schema: {...} }` | `{ type: "json_object" }` |
| **Schema Validation** | **Yes** - Guarantees adherence to schema | **No** - Only guarantees valid JSON |
| **Reliability** | Higher (enforced schema) | Lower (no schema validation) |
| **Recommended** | ✅ Yes (for new projects) | ⚠️ Legacy (for older models) |

## Recommended Solution: Use GPT-4o with Structured Outputs

**GPT-4o** is the latest, most capable model and fully supports Structured Outputs with strict schema validation.

### Working TypeScript Code

```typescript
import OpenAI from 'openai';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

// Define your schema using Zod
const CodeAnalysisSchema = z.object({
  extractedFunctions: z.array(z.object({
    name: z.string(),
    signature: z.string(),
    description: z.string(),
  })),
  extractedClasses: z.array(z.object({
    name: z.string(),
    methods: z.array(z.string()),
    description: z.string(),
  })),
  extractedAPIs: z.array(z.object({
    endpoint: z.string(),
    method: z.string(),
    description: z.string(),
  })),
  extractedTypes: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    description: z.string(),
  })),
});

type CodeAnalysis = z.infer<typeof CodeAnalysisSchema>;

class OpenAICodeAnalyzer {
  private openai: OpenAI;

  constructor(apiKey: string = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeCode(codeChanges: string): Promise<CodeAnalysis> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert code analyzer. Analyze the provided code changes and extract:
1. All function definitions with their signatures and descriptions
2. All class definitions with their methods
3. All API endpoints (if applicable)
4. All type definitions

Return the analysis as structured JSON.`,
          },
          {
            role: 'user',
            content: `Analyze these code changes:\n\n${codeChanges}`,
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'CodeAnalysis',
            strict: true,
            schema: zodToJsonSchema(CodeAnalysisSchema) as any,
          },
        },
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      const parsed = JSON.parse(content) as CodeAnalysis;
      return parsed;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}

export { OpenAICodeAnalyzer, CodeAnalysis };
```

## Alternative: Fallback to JSON Mode (for compatibility)

If you need to support older models or want a simpler approach without Zod:

```typescript
import OpenAI from 'openai';

class OpenAICodeAnalyzerSimple {
  private openai: OpenAI;

  constructor(apiKey: string = process.env.OPENAI_API_KEY) {
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({ apiKey });
  }

  async analyzeCode(codeChanges: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // or 'gpt-4-turbo' for older model
        messages: [
          {
            role: 'system',
            content: `You are an expert code analyzer. Respond ONLY with valid JSON in this format:
{
  "extractedFunctions": [{"name": "string", "signature": "string", "description": "string"}],
  "extractedClasses": [{"name": "string", "methods": ["string"], "description": "string"}],
  "extractedAPIs": [{"endpoint": "string", "method": "string", "description": "string"}],
  "extractedTypes": [{"name": "string", "definition": "string", "description": "string"}]
}`,
          },
          {
            role: 'user',
            content: `Analyze these code changes:\n\n${codeChanges}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 2048,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      // Validate JSON
      const parsed = JSON.parse(content);
      
      // Basic validation
      if (!parsed.extractedFunctions || !Array.isArray(parsed.extractedFunctions)) {
        throw new Error('Invalid response structure: missing extractedFunctions array');
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON response from OpenAI: ${error.message}`);
      }
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }
}

export { OpenAICodeAnalyzerSimple };
```

## Installation

```bash
npm install openai zod zod-to-json-schema
```

## Environment Setup

Create a `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

Or set it in your shell:

```bash
export OPENAI_API_KEY=sk-your-api-key-here
```

## Usage in SubagentClient

Replace the mock implementation in `src/subagent/client.ts`:

```typescript
import { OpenAICodeAnalyzer } from './openai-analyzer';
import { AnalysisRequest, AnalysisResponse } from '../types';

export class SubagentClient {
  private analyzer: OpenAICodeAnalyzer;

  constructor() {
    this.analyzer = new OpenAICodeAnalyzer();
  }

  async sendRequest(request: AnalysisRequest): Promise<AnalysisResponse> {
    try {
      const codeContext = request.changedFiles
        .map(f => `File: ${f.path}\n${f.diffContent}`)
        .join('\n\n');

      const analysis = await this.analyzer.analyzeCode(codeContext);

      return {
        success: true,
        analysis: {
          timestamp: new Date().toISOString(),
          triggerType: request.triggerType,
          changedFiles: request.changedFiles,
          extractedAPIs: analysis.extractedAPIs || [],
          newFeatures: [], // Map from analysis if needed
          architecturalChanges: [], // Map from analysis if needed
          documentationRequirements: this.mapToDocRequirements(analysis),
        },
      };
    } catch (error) {
      console.error('Subagent analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapToDocRequirements(analysis: any) {
    const requirements = [];

    // Map extracted functions to documentation requirements
    if (analysis.extractedFunctions?.length > 0) {
      requirements.push({
        type: 'api-spec',
        targetFile: '.kiro/specs/api.md',
        content: this.generateFunctionDocs(analysis.extractedFunctions),
        priority: 'high',
      });
    }

    // Map extracted classes to documentation requirements
    if (analysis.extractedClasses?.length > 0) {
      requirements.push({
        type: 'api-spec',
        targetFile: '.kiro/specs/api.md',
        content: this.generateClassDocs(analysis.extractedClasses),
        priority: 'high',
      });
    }

    return requirements;
  }

  private generateFunctionDocs(functions: any[]): string {
    return functions
      .map(f => `### ${f.name}\n\n${f.description}\n\n\`\`\`\n${f.signature}\n\`\`\``)
      .join('\n\n');
  }

  private generateClassDocs(classes: any[]): string {
    return classes
      .map(c => `### ${c.name}\n\n${c.description}\n\nMethods: ${c.methods.join(', ')}`)
      .join('\n\n');
  }
}
```

## Rate Limiting & Cost Considerations

### Rate Limits
- **Free tier**: 3 requests/min, 200 requests/day
- **Paid tier**: 500 requests/min (default, can request higher)

### Cost Estimation
- **GPT-4o**: ~$0.015 per 1K input tokens, ~$0.06 per 1K output tokens
- **GPT-4o-mini**: ~$0.0005 per 1K input tokens, ~$0.0015 per 1K output tokens

**For code analysis**: Average code diff = 500-2000 tokens, response = 500-1000 tokens
- **Cost per analysis**: ~$0.01-0.05 with GPT-4o, ~$0.0003-0.001 with GPT-4o-mini

### Optimization Tips
1. **Use GPT-4o-mini for simple analysis** (saves 90% on costs)
2. **Implement caching** to avoid re-analyzing the same code
3. **Batch requests** when possible
4. **Set reasonable max_tokens** (2048 is usually sufficient)

## Error Handling Strategy

```typescript
async function analyzeWithFallback(codeChanges: string) {
  const analyzers = [
    new OpenAICodeAnalyzer(), // Primary: GPT-4o with structured outputs
    new OpenAICodeAnalyzerSimple(), // Fallback: GPT-4o with JSON mode
  ];

  for (const analyzer of analyzers) {
    try {
      return await analyzer.analyzeCode(codeChanges);
    } catch (error) {
      console.warn(`Analyzer failed, trying next: ${error}`);
      continue;
    }
  }

  throw new Error('All analyzers failed');
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('OpenAI Code Analyzer', () => {
  it('should analyze code and return structured JSON', async () => {
    const analyzer = new OpenAICodeAnalyzer();
    const testCode = `
      export function greet(name: string): string {
        return \`Hello, \${name}!\`;
      }
    `;

    const result = await analyzer.analyzeCode(testCode);

    expect(result).toHaveProperty('extractedFunctions');
    expect(Array.isArray(result.extractedFunctions)).toBe(true);
    expect(result.extractedFunctions.length).toBeGreaterThan(0);
  });

  it('should handle API errors gracefully', async () => {
    const analyzer = new OpenAICodeAnalyzer('invalid-key');
    
    await expect(analyzer.analyzeCode('test')).rejects.toThrow();
  });
});
```

## Summary

**Use GPT-4o with Structured Outputs** for the best experience:
- ✅ Strict schema validation
- ✅ Guaranteed valid JSON
- ✅ Best code understanding
- ✅ Latest model features
- ✅ Reasonable cost (~$0.01-0.05 per analysis)

**Avoid `gpt-4-turbo`** for new projects—it's being phased out in favor of GPT-4o.
