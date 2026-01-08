/**
 * Core data types for the Auto-Doc-Sync System
 */

export interface ChangeAnalysis {
  timestamp: string;
  triggerType: 'git-hook' | 'manual';
  changedFiles: ChangedFile[];
  extractedAPIs: APIDefinition[];
  newFeatures: FeatureDescription[];
  architecturalChanges: ArchitecturalChange[];
  documentationRequirements: DocumentationRequirement[];
}

export interface ChangedFile {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  diffContent: string;
  extractedFunctions: FunctionDefinition[];
  extractedClasses: ClassDefinition[];
}

export interface DocumentationRequirement {
  type: 'api-spec' | 'readme-section' | 'dev-log' | 'steering-file';
  targetFile: string;
  section?: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Template {
  name: string;
  type: 'api-doc' | 'setup-instructions' | 'architecture-notes';
  content: string;
  variables: TemplateVariable[];
}

// Supporting interfaces
export interface APIDefinition {
  name: string;
  method?: string;
  path?: string;
  parameters: Parameter[];
  returnType: string;
  description?: string;
}

export interface FeatureDescription {
  name: string;
  description: string;
  affectedFiles: string[];
  category: 'new' | 'enhanced' | 'deprecated';
}

export interface ArchitecturalChange {
  type: 'component-added' | 'component-modified' | 'component-removed' | 'pattern-changed';
  component: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}

export interface FunctionDefinition {
  name: string;
  parameters: Parameter[];
  returnType: string;
  isExported: boolean;
  documentation?: string;
}

export interface ClassDefinition {
  name: string;
  methods: FunctionDefinition[];
  properties: PropertyDefinition[];
  isExported: boolean;
  documentation?: string;
}

export interface Parameter {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

export interface PropertyDefinition {
  name: string;
  type: string;
  visibility: 'public' | 'private' | 'protected';
  documentation?: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string;
  description?: string;
}