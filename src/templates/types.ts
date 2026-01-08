/**
 * Template-specific types
 */

export interface TemplateContext {
  variables: Record<string, any>;
  metadata: TemplateMetadata;
}

export interface TemplateMetadata {
  generatedAt: string;
  version: string;
  source: string;
}