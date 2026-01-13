/**
 * Types for Subagent integration
 */

export interface SubagentConfig {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  configuration: {
    model: string;
    temperature: number;
    maxTokens: number;
    timeout: number;
  };
  prompts: {
    system: string;
    codeAnalysis: string;
    changeClassification: string;
    documentationGeneration: string;
    templateProcessing: string;
  };
}

export interface SubagentRequest {
  type: 'code-analysis' | 'change-classification' | 'documentation-generation' | 'template-processing' | 'readme-generation';
  payload: any;
  context?: SubagentContext;
}

export interface SubagentResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface SubagentContext {
  projectPath: string;
  kiroContext?: {
    specs: string[];
    steeringFiles: string[];
    hooks: string[];
  };
  analysisConfig?: {
    includeTests: boolean;
    analyzeComments: boolean;
    extractDocumentation: boolean;
  };
}

export interface CodeAnalysisRequest {
  changes: string[];
  filePaths: string[];
  diffContent: string;
}

export interface CodeAnalysisResponse {
  extractedFunctions: any[];
  extractedClasses: any[];
  extractedAPIs: any[];
  extractedTypes: any[];
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface ChangeClassificationRequest {
  changedFiles: any[];
  previousAnalysis?: any;
}

export interface ChangeClassificationResponse {
  newFeatures: any[];
  apiModifications: any[];
  architecturalChanges: any[];
  documentationRequirements: any[];
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface DocumentationGenerationRequest {
  analysisResults: any;
  templateType: string;
  targetFile: string;
  existingContent?: string;
}

export interface DocumentationGenerationResponse {
  content: string;
  metadata: {
    templateUsed: string;
    variablesApplied: string[];
    contentLength: number;
    processingTime?: number;
    tokensUsed?: number;
    model?: string;
  };
}

export interface TemplateProcessingRequest {
  template: string;
  variables: Record<string, any>;
  templateType: string;
}

export interface TemplateProcessingResponse {
  processedContent: string;
  appliedVariables: string[];
  warnings?: string[];
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}

export interface ReadmeGenerationRequest {
  analysisResults: any;
  existingContent?: string;
  projectContext?: {
    name?: string;
    description?: string;
    repository?: string;
    license?: string;
  };
}

export interface ReadmeGenerationResponse {
  content: string;
  sections: {
    title: string;
    content: string;
  }[];
  metadata?: {
    processingTime: number;
    tokensUsed: number;
    model: string;
  };
}