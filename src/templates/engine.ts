/**
 * Simple template engine with built-in templates for consistent documentation generation
 */

import { Template } from '../types';
import { TemplateContext } from './types';

export class TemplateEngine {
  private templates: Map<string, Template> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    // Simple templates that define the structure, actual content generation is handled by generators
    const apiDocTemplate: Template = {
      name: 'api-doc',
      type: 'api-doc',
      content: 'API_DOC_TEMPLATE', // Placeholder - actual generation in generators
      variables: []
    };

    const setupTemplate: Template = {
      name: 'setup-instructions',
      type: 'setup-instructions',
      content: 'SETUP_TEMPLATE', // Placeholder - actual generation in generators
      variables: []
    };

    const architectureTemplate: Template = {
      name: 'architecture-notes',
      type: 'architecture-notes',
      content: 'ARCHITECTURE_TEMPLATE', // Placeholder - actual generation in generators
      variables: []
    };

    this.registerTemplate(apiDocTemplate);
    this.registerTemplate(setupTemplate);
    this.registerTemplate(architectureTemplate);
  }

  registerTemplate(template: Template): void {
    this.templates.set(template.name, template);
  }

  getTemplate(name: string): Template | undefined {
    return this.templates.get(name);
  }

  listTemplates(): Template[] {
    return Array.from(this.templates.values());
  }

  render(templateName: string, context: TemplateContext): string {
    const template = this.templates.get(templateName);
    if (!template) {
      // Use default template if specific template not found
      return this.renderDefault(templateName, context);
    }

    // For this simple implementation, we just return a marker that indicates
    // the template exists and should be processed by the generators
    return `TEMPLATE_${templateName.toUpperCase()}_PROCESSED`;
  }

  private renderDefault(templateName: string, context: TemplateContext): string {
    // Default template fallback
    const timestamp = context.metadata.generatedAt;
    
    return `# ${templateName}

This documentation was generated automatically.

---
*Generated on ${timestamp}*`;
  }
}