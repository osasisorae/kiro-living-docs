/**
 * Subagent Client - Interface for communicating with AI models for code analysis
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { config } from 'dotenv';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { 
  SubagentConfig, 
  SubagentRequest, 
  SubagentResponse, 
  SubagentContext,
  CodeAnalysisRequest,
  CodeAnalysisResponse,
  ChangeClassificationRequest,
  ChangeClassificationResponse,
  DocumentationGenerationRequest,
  DocumentationGenerationResponse,
  TemplateProcessingRequest,
  TemplateProcessingResponse,
  ReadmeGenerationRequest,
  ReadmeGenerationResponse
} from './types';

// Load environment variables
config();

// Define Zod schemas for structured outputs
const CodeAnalysisSchema = z.object({
  extractedFunctions: z.array(z.object({
    name: z.string(),
    signature: z.string(),
    description: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      type: z.string(),
      description: z.string()
    })).optional(),
    returnType: z.string().optional()
  })),
  extractedClasses: z.array(z.object({
    name: z.string(),
    methods: z.array(z.string()),
    properties: z.array(z.string()).optional(),
    description: z.string()
  })),
  extractedAPIs: z.array(z.object({
    endpoint: z.string(),
    method: z.string(),
    description: z.string(),
    parameters: z.array(z.string()).optional()
  })),
  extractedTypes: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    description: z.string()
  }))
});

const ChangeClassificationSchema = z.object({
  newFeatures: z.array(z.object({
    name: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high'])
  })),
  apiModifications: z.array(z.object({
    name: z.string(),
    type: z.enum(['added', 'modified', 'removed']),
    description: z.string(),
    breakingChange: z.boolean()
  })),
  architecturalChanges: z.array(z.object({
    component: z.string(),
    changeType: z.string(),
    description: z.string(),
    impact: z.enum(['low', 'medium', 'high'])
  })),
  documentationRequirements: z.array(z.object({
    type: z.string(),
    targetFile: z.string(),
    content: z.string(),
    priority: z.enum(['low', 'medium', 'high'])
  }))
});

const DocumentationGenerationSchema = z.object({
  content: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
    type: z.string()
  })),
  metadata: z.object({
    lastUpdated: z.string(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional()
  })
});

const TemplateProcessingSchema = z.object({
  processedContent: z.string(),
  appliedVariables: z.array(z.string()),
  warnings: z.array(z.string()).optional()
});

export class SubagentClient {
  private config: SubagentConfig;
  private context: SubagentContext;
  private openai: OpenAI;

  constructor(configPath: string = '.kiro/subagents/doc-analysis-agent.json', context: SubagentContext) {
    this.config = this.loadConfig(configPath);
    this.context = context;
    
    // Initialize OpenAI client only if API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.warn('OPENAI_API_KEY environment variable not found. Subagent will operate in fallback mode.');
      // Don't throw error, just set openai to null and handle gracefully
      this.openai = null as any;
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  /**
   * Load subagent configuration from file
   */
  private loadConfig(configPath: string): SubagentConfig {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      throw new Error(`Failed to load subagent configuration from ${configPath}: ${error}`);
    }
  }

  /**
   * Analyze code changes using the subagent
   */
  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResponse> {
    const subagentRequest: SubagentRequest = {
      type: 'code-analysis',
      payload: request,
      context: this.context
    };

    const response = await this.sendRequest(subagentRequest);
    
    if (!response.success) {
      throw new Error(`Code analysis failed: ${response.error}`);
    }

    // Attach metadata to the response data
    const result = response.data as CodeAnalysisResponse;
    result.metadata = response.metadata;
    return result;
  }

  /**
   * Classify changes using the subagent
   */
  async classifyChanges(request: ChangeClassificationRequest): Promise<ChangeClassificationResponse> {
    const subagentRequest: SubagentRequest = {
      type: 'change-classification',
      payload: request,
      context: this.context
    };

    const response = await this.sendRequest(subagentRequest);
    
    if (!response.success) {
      throw new Error(`Change classification failed: ${response.error}`);
    }

    // Attach metadata to the response data
    const result = response.data as ChangeClassificationResponse;
    result.metadata = response.metadata;
    return result;
  }

  /**
   * Generate documentation using the subagent
   */
  async generateDocumentation(request: DocumentationGenerationRequest): Promise<DocumentationGenerationResponse> {
    const subagentRequest: SubagentRequest = {
      type: 'documentation-generation',
      payload: request,
      context: this.context
    };

    const response = await this.sendRequest(subagentRequest);
    
    if (!response.success) {
      throw new Error(`Documentation generation failed: ${response.error}`);
    }

    // Attach metadata to the response data
    const result = response.data as DocumentationGenerationResponse;
    if (response.metadata) {
      result.metadata = {
        ...result.metadata,
        processingTime: response.metadata.processingTime,
        tokensUsed: response.metadata.tokensUsed,
        model: response.metadata.model
      };
    }
    return result;
  }

  /**
   * Process templates using the subagent
   */
  async processTemplate(request: TemplateProcessingRequest): Promise<TemplateProcessingResponse> {
    const subagentRequest: SubagentRequest = {
      type: 'template-processing',
      payload: request,
      context: this.context
    };

    const response = await this.sendRequest(subagentRequest);
    
    if (!response.success) {
      throw new Error(`Template processing failed: ${response.error}`);
    }

    // Attach metadata to the response data
    const result = response.data as TemplateProcessingResponse;
    result.metadata = response.metadata;
    return result;
  }

  /**
   * Generate README content using the subagent
   */
  async generateReadme(request: ReadmeGenerationRequest): Promise<ReadmeGenerationResponse> {
    const subagentRequest: SubagentRequest = {
      type: 'readme-generation',
      payload: request,
      context: this.context
    };

    const response = await this.sendRequest(subagentRequest);
    
    if (!response.success) {
      throw new Error(`README generation failed: ${response.error}`);
    }

    // Attach metadata to the response data
    const result = response.data as ReadmeGenerationResponse;
    result.metadata = response.metadata;
    return result;
  }

  /**
   * Send request to OpenAI for AI-powered analysis using structured outputs
   */
  private async sendRequest(request: SubagentRequest): Promise<SubagentResponse> {
    const startTime = Date.now();
    
    // Check if OpenAI client is available
    if (!this.openai) {
      return {
        success: false,
        error: 'OpenAI client not available. Please set OPENAI_API_KEY environment variable.',
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: 'none'
        }
      };
    }
    
    try {
      // Load system prompt from file (with fallback to config)
      let systemPrompt: string;
      try {
        systemPrompt = await this.loadPromptFile('system.md');
      } catch (error) {
        console.warn('Failed to load system prompt file, using config fallback');
        systemPrompt = this.config.prompts.system;
      }

      // Get the appropriate prompt and schema for the request type
      const { prompt, schema } = await this.buildPromptAndSchema(request);
      
      // Make OpenAI API call with structured outputs
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Use GPT-4o for structured outputs
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        temperature: this.config.configuration.temperature || 0.1,
        max_tokens: this.config.configuration.maxTokens || 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: this.getSchemaName(request.type),
            strict: true,
            schema: schema
          }
        }
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from OpenAI');
      }

      // Parse the JSON response (guaranteed to be valid with structured outputs)
      const parsedData = JSON.parse(responseContent);
      
      return {
        success: true,
        data: parsedData,
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: completion.usage?.total_tokens || 0,
          model: completion.model
        }
      };
      
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          processingTime: Date.now() - startTime,
          tokensUsed: 0,
          model: this.config.configuration.model
        }
      };
    }
  }

  /**
   * Build appropriate prompt and schema based on request type
   */
  private async buildPromptAndSchema(request: SubagentRequest): Promise<{ prompt: string; schema: any }> {
    let prompt: string;
    let schema: any;

    try {
      switch (request.type) {
        case 'code-analysis':
          prompt = await this.loadPromptFile('code-analysis.md');
          prompt = prompt.replace('{changes}', JSON.stringify(request.payload, null, 2));
          schema = {
            type: "object",
            properties: {
              extractedFunctions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    signature: { type: "string" },
                    description: { type: "string" },
                    parameters: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          type: { type: "string" },
                          description: { type: "string" }
                        },
                        required: ["name", "type", "description"],
                        additionalProperties: false
                      }
                    },
                    returnType: { type: "string" }
                  },
                  required: ["name", "signature", "description", "parameters", "returnType"],
                  additionalProperties: false
                }
              },
              extractedClasses: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    methods: { type: "array", items: { type: "string" } },
                    properties: { type: "array", items: { type: "string" } },
                    description: { type: "string" }
                  },
                  required: ["name", "methods", "properties", "description"],
                  additionalProperties: false
                }
              },
              extractedAPIs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    endpoint: { type: "string" },
                    method: { type: "string" },
                    description: { type: "string" },
                    parameters: { type: "array", items: { type: "string" } }
                  },
                  required: ["endpoint", "method", "description", "parameters"],
                  additionalProperties: false
                }
              },
              extractedTypes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    definition: { type: "string" },
                    description: { type: "string" }
                  },
                  required: ["name", "definition", "description"],
                  additionalProperties: false
                }
              }
            },
            required: ["extractedFunctions", "extractedClasses", "extractedAPIs", "extractedTypes"],
            additionalProperties: false
          };
          break;
          
        case 'change-classification':
          prompt = await this.loadPromptFile('change-classification.md');
          prompt = prompt.replace('{changedFiles}', JSON.stringify(request.payload, null, 2));
          schema = {
            type: "object",
            properties: {
              newFeatures: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    impact: { type: "string", enum: ["low", "medium", "high"] }
                  },
                  required: ["name", "description", "impact"],
                  additionalProperties: false
                }
              },
              apiModifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    type: { type: "string", enum: ["added", "modified", "removed"] },
                    description: { type: "string" },
                    breakingChange: { type: "boolean" }
                  },
                  required: ["name", "type", "description", "breakingChange"],
                  additionalProperties: false
                }
              },
              architecturalChanges: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    component: { type: "string" },
                    changeType: { type: "string" },
                    description: { type: "string" },
                    impact: { type: "string", enum: ["low", "medium", "high"] }
                  },
                  required: ["component", "changeType", "description", "impact"],
                  additionalProperties: false
                }
              },
              documentationRequirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    targetFile: { type: "string" },
                    content: { type: "string" },
                    priority: { type: "string", enum: ["low", "medium", "high"] }
                  },
                  required: ["type", "targetFile", "content", "priority"],
                  additionalProperties: false
                }
              }
            },
            required: ["newFeatures", "apiModifications", "architecturalChanges", "documentationRequirements"],
            additionalProperties: false
          };
          break;
          
        case 'documentation-generation':
          prompt = await this.loadPromptFile('documentation-generation.md');
          const docPayload = request.payload as DocumentationGenerationRequest;
          prompt = prompt
            .replace('{analysisResults}', JSON.stringify(docPayload.analysisResults, null, 2))
            .replace('{templateType}', docPayload.templateType);
          schema = {
            type: "object",
            properties: {
              content: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" },
                    type: { type: "string" }
                  },
                  required: ["title", "content", "type"],
                  additionalProperties: false
                }
              },
              metadata: {
                type: "object",
                properties: {
                  lastUpdated: { type: "string" },
                  version: { type: "string" },
                  tags: { type: "array", items: { type: "string" } }
                },
                required: ["lastUpdated", "version", "tags"],
                additionalProperties: false
              }
            },
            required: ["content", "sections", "metadata"],
            additionalProperties: false
          };
          break;
            
        case 'template-processing':
          prompt = await this.loadPromptFile('template-processing.md');
          const templatePayload = request.payload as TemplateProcessingRequest;
          prompt = prompt
            .replace('{template}', templatePayload.template)
            .replace('{variables}', JSON.stringify(templatePayload.variables, null, 2));
          schema = {
            type: "object",
            properties: {
              processedContent: { type: "string" },
              appliedVariables: { type: "array", items: { type: "string" } },
              warnings: { type: "array", items: { type: "string" } }
            },
            required: ["processedContent", "appliedVariables", "warnings"],
            additionalProperties: false
          };
          break;
          
        case 'readme-generation':
          prompt = await this.loadPromptFile('readme-generation.md');
          const readmePayload = request.payload as ReadmeGenerationRequest;
          prompt = prompt
            .replace('{analysisResults}', JSON.stringify(readmePayload.analysisResults, null, 2))
            .replace('{existingContent}', readmePayload.existingContent || 'No existing README')
            .replace('{projectContext}', JSON.stringify(readmePayload.projectContext || {}, null, 2));
          schema = {
            type: "object",
            properties: {
              content: { type: "string" },
              sections: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    content: { type: "string" }
                  },
                  required: ["title", "content"],
                  additionalProperties: false
                }
              }
            },
            required: ["content", "sections"],
            additionalProperties: false
          };
          break;
            
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      // Fallback to config prompts if file loading fails
      console.warn(`Failed to load prompt file, using config fallback: ${error}`);
      const fallbackResult = this.buildPromptFromConfig(request);
      return {
        prompt: fallbackResult,
        schema: this.getDefaultSchema(request.type)
      };
    }

    return { prompt, schema };
  }

  /**
   * Get schema name for structured output
   */
  private getSchemaName(requestType: string): string {
    switch (requestType) {
      case 'code-analysis':
        return 'CodeAnalysis';
      case 'change-classification':
        return 'ChangeClassification';
      case 'documentation-generation':
        return 'DocumentationGeneration';
      case 'template-processing':
        return 'TemplateProcessing';
      case 'readme-generation':
        return 'ReadmeGeneration';
      default:
        return 'GenericResponse';
    }
  }

  /**
   * Get default schema for fallback cases
   */
  private getDefaultSchema(requestType: string): any {
    switch (requestType) {
      case 'code-analysis':
        return {
          type: "object",
          properties: {
            extractedFunctions: { type: "array", items: { type: "object" } },
            extractedClasses: { type: "array", items: { type: "object" } },
            extractedAPIs: { type: "array", items: { type: "object" } },
            extractedTypes: { type: "array", items: { type: "object" } }
          },
          required: ["extractedFunctions", "extractedClasses", "extractedAPIs", "extractedTypes"]
        };
      case 'change-classification':
        return {
          type: "object",
          properties: {
            newFeatures: { type: "array", items: { type: "object" } },
            apiModifications: { type: "array", items: { type: "object" } },
            architecturalChanges: { type: "array", items: { type: "object" } },
            documentationRequirements: { type: "array", items: { type: "object" } }
          },
          required: ["newFeatures", "apiModifications", "architecturalChanges", "documentationRequirements"]
        };
      case 'documentation-generation':
        return {
          type: "object",
          properties: {
            content: { type: "string" },
            sections: { type: "array", items: { type: "object" } },
            metadata: { type: "object" }
          },
          required: ["content", "sections", "metadata"]
        };
      case 'template-processing':
        return {
          type: "object",
          properties: {
            processedContent: { type: "string" },
            appliedVariables: { type: "array", items: { type: "string" } }
          },
          required: ["processedContent", "appliedVariables"]
        };
      default:
        return {
          type: 'object',
          properties: {
            result: { type: 'string' },
            error: { type: 'string' }
          },
          required: ['result']
        };
    }
  }

  /**
   * Load prompt from .kiro/prompts/ directory
   */
  private async loadPromptFile(filename: string): Promise<string> {
    const promptPath = path.join('.kiro', 'prompts', filename);
    return fs.readFileSync(promptPath, 'utf-8');
  }

  /**
   * Fallback to config-based prompts
   */
  private buildPromptFromConfig(request: SubagentRequest): string {
    switch (request.type) {
      case 'code-analysis':
        return this.config.prompts.codeAnalysis.replace('{changes}', JSON.stringify(request.payload));
        
      case 'change-classification':
        return this.config.prompts.changeClassification.replace('{changedFiles}', JSON.stringify(request.payload));
        
      case 'documentation-generation':
        const docPayload = request.payload as DocumentationGenerationRequest;
        return this.config.prompts.documentationGeneration
          .replace('{analysisResults}', JSON.stringify(docPayload.analysisResults))
          .replace('{templateType}', docPayload.templateType);
          
      case 'template-processing':
        const templatePayload = request.payload as TemplateProcessingRequest;
        return this.config.prompts.templateProcessing
          .replace('{template}', templatePayload.template)
          .replace('{variables}', JSON.stringify(templatePayload.variables));
          
      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * Get subagent configuration
   */
  getConfig(): SubagentConfig {
    return { ...this.config };
  }

  /**
   * Update subagent context
   */
  updateContext(context: Partial<SubagentContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Validate subagent configuration
   */
  validateConfig(): boolean {
    const required = ['name', 'version', 'capabilities', 'configuration', 'prompts'];
    
    for (const field of required) {
      if (!(field in this.config)) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validate prompts
    const requiredPrompts = ['system', 'codeAnalysis', 'changeClassification', 'documentationGeneration', 'templateProcessing'];
    for (const prompt of requiredPrompts) {
      if (!(prompt in this.config.prompts)) {
        throw new Error(`Missing required prompt: ${prompt}`);
      }
    }

    return true;
  }
}