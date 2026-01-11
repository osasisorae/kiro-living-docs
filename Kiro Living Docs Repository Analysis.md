# Kiro Living Docs Repository Analysis

## Current State

The project has a solid foundation with:
- Working CLI interface and orchestration system
- Code analysis engine with AST parsing and diff detection
- Template engine for documentation generation
- Development logging system
- Property-based tests (mostly passing)
- Git hook integration framework

However, **the AI implementation is completely missing**. The `SubagentClient.sendRequest()` method only waits 100ms and returns empty mock responses with no actual AI model calls.

## Open Issues (6 Total)

### Critical Issue #15: Implement Real AI-Backed Analysis
**Status**: Open (13 minutes ago)
**Description**: The SubagentClient.sendRequest() method (src/subagent/client.ts:124-190) only waits 100ms and returns empty mock responses with no actual AI model calls. Despite advertising "AI-enhanced analysis", the system provides zero AI functionality.

**What needs to be done**: Replace mock implementation with real AI service integration to deliver:
- AI-assisted code analysis
- Change classification
- Documentation generation

### Other Open Issues
1. **Issue #20**: docs(templates): clarify placeholder vs variable terminology
2. **Issue #19**: feat(templates): enhance template processing beyond simple variable substitution
3. **Issue #18**: feat(subagent): implement dynamic analysis configuration updates
4. **Issue #17**: fix(specs): replace placeholder API documentation with real content
5. **Issue #16**: feat(logging): implement real git context extraction for commit hash and author

## The MCP vs OpenAI Debate

**Current Situation**: Developers are debating whether to use:
1. **MCP (Model Context Protocol)** - Some developers suggest this
2. **OpenAI** - Others suggest this approach

**Analysis**: 

### Why MCP is NOT the right choice for this project:
- MCP is designed for **integrating external tools and services** into an AI system (e.g., file systems, databases, APIs)
- MCP is a **protocol for tool discovery and invocation**, not for AI model inference
- Using MCP would require running a separate MCP server, adding unnecessary complexity
- MCP is better suited for scenarios where you want Claude/LLMs to call external tools

### Why OpenAI IS the right choice:
- **Direct API Integration**: OpenAI provides straightforward REST APIs for model inference
- **Simplicity**: No protocol overhead; just send prompts and get responses
- **Cost-Effective**: Pay per token, no server infrastructure needed
- **Reliability**: Battle-tested, widely used in production
- **Flexibility**: Can use different models (GPT-4, GPT-4 Turbo, GPT-3.5) based on needs
- **Speed**: Direct API calls are faster than MCP protocol overhead

### Better Alternative: Anthropic Claude API
- **Why Claude over OpenAI**: Claude has better context understanding for code analysis
- **Extended Context**: Claude can handle larger code files (100K+ tokens)
- **Better Code Understanding**: Claude excels at code analysis and documentation generation
- **Comparable Pricing**: Similar to OpenAI

## Recommended Implementation Approach

### Option 1: OpenAI (Recommended for speed)
```typescript
// Simple, direct integration
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function analyzeCode(codeChanges: string): Promise<AnalysisResult> {
  const response = await client.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{
      role: 'user',
      content: `Analyze these code changes and extract documentation requirements:\n${codeChanges}`
    }]
  });
  // Parse and return structured result
}
```

### Option 2: Anthropic Claude (Recommended for quality)
```typescript
// Better for code analysis
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function analyzeCode(codeChanges: string): Promise<AnalysisResult> {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Analyze these code changes and extract documentation requirements:\n${codeChanges}`
    }]
  });
  // Parse and return structured result
}
```

## Key Files to Modify

1. **src/subagent/client.ts** (lines 124-190): Replace mock implementation with real API calls
2. **src/subagent/subagent.ts**: Update to handle real AI responses
3. **package.json**: Add `openai` or `@anthropic-ai/sdk` dependency
4. **Configuration**: Add API key management (environment variables)

## Implementation Priority

1. **High Priority**: Replace mock SubagentClient with real API integration
2. **High Priority**: Add proper error handling and retry logic
3. **Medium Priority**: Add response parsing and validation
4. **Medium Priority**: Implement caching to reduce API costs
5. **Low Priority**: Add configuration for model selection

## Why NOT MCP

The confusion likely stems from Kiro's own MCP support. However, MCP is for **integrating tools into Kiro**, not for **calling AI models**. The project needs direct LLM integration, not tool protocol integration.
