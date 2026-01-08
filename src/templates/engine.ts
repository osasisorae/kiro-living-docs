/**
 * Enhanced template engine with comprehensive error handling and default template system
 */

import { Template } from '../types';
import { TemplateContext } from './types';
import { 
  TemplateError, 
  TemplateNotFoundError, 
  TemplateRenderError, 
  TemplateValidationError,
  ErrorHandler 
} from './errors';

export interface TemplateCustomization {
  name: string;
  content: string;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export class TemplateEngine {
  private templates: Map<string, Template> = new Map();
  private customTemplates: Map<string, TemplateCustomization> = new Map();
  private errorHandler: ErrorHandler = new ErrorHandler();

  constructor() {
    this.initializeBuiltInTemplates();
  }

  private initializeBuiltInTemplates(): void {
    try {
      // Comprehensive built-in templates with error handling
      const apiDocTemplate: Template = {
        name: 'api-doc',
        type: 'api-doc',
        content: this.getDefaultAPIDocTemplate(),
        variables: [
          { name: 'apis', type: 'APIDefinition[]', required: true, description: 'List of API definitions' },
          { name: 'description', type: 'string', required: false, description: 'API overview description' }
        ]
      };

      const setupTemplate: Template = {
        name: 'setup-instructions',
        type: 'setup-instructions',
        content: this.getDefaultSetupTemplate(),
        variables: [
          { name: 'installCommand', type: 'string', required: true, description: 'Installation command' },
          { name: 'configSteps', type: 'string[]', required: false, description: 'Configuration steps' },
          { name: 'usageExample', type: 'string', required: false, description: 'Usage example code' }
        ]
      };

      const architectureTemplate: Template = {
        name: 'architecture-notes',
        type: 'architecture-notes',
        content: this.getDefaultArchitectureTemplate(),
        variables: [
          { name: 'systemOverview', type: 'string', required: true, description: 'System overview' },
          { name: 'components', type: 'Component[]', required: true, description: 'System components' },
          { name: 'architecturalChanges', type: 'ArchitecturalChange[]', required: false, description: 'Recent changes' }
        ]
      };

      this.registerTemplate(apiDocTemplate);
      this.registerTemplate(setupTemplate);
      this.registerTemplate(architectureTemplate);
    } catch (error) {
      // If template initialization fails, create minimal fallback templates
      this.initializeFallbackTemplates();
    }
  }

  private initializeFallbackTemplates(): void {
    const fallbackTemplate: Template = {
      name: 'fallback',
      type: 'api-doc',
      content: '# {{title}}\n\nContent generated with fallback template.\n\n---\n*Generated on {{timestamp}}*',
      variables: []
    };

    this.templates.set('api-doc', fallbackTemplate);
    this.templates.set('setup-instructions', fallbackTemplate);
    this.templates.set('architecture-notes', fallbackTemplate);
  }

  registerTemplate(template: Template): void {
    try {
      this.validateTemplate(template);
      this.templates.set(template.name, template);
    } catch (error) {
      throw new TemplateValidationError(template.name, [
        error instanceof Error ? error.message : 'Unknown validation error'
      ]);
    }
  }

  getTemplate(name: string): Template | undefined {
    // First check custom templates, then built-in templates
    const customTemplate = this.customTemplates.get(name);
    if (customTemplate) {
      return this.convertCustomizationToTemplate(customTemplate);
    }
    return this.templates.get(name);
  }

  listTemplates(): Template[] {
    const builtInTemplates = Array.from(this.templates.values());
    const customTemplatesList = Array.from(this.customTemplates.values())
      .map(custom => this.convertCustomizationToTemplate(custom));
    
    return [...builtInTemplates, ...customTemplatesList];
  }

  async render(templateName: string, context: TemplateContext): Promise<string> {
    try {
      const template = this.getTemplate(templateName);
      if (!template) {
        throw new TemplateNotFoundError(templateName);
      }

      return await this.renderTemplate(template, context);
    } catch (error) {
      // Use error handler for graceful degradation
      if (error instanceof TemplateNotFoundError || error instanceof TemplateRenderError) {
        return await this.errorHandler.handleError(error, this.renderDefault(templateName, context));
      }
      throw error;
    }
  }

  private async renderTemplate(template: Template, context: TemplateContext): Promise<string> {
    try {
      // Validate required variables are present
      const missingVariables = template.variables
        .filter(variable => variable.required && !(variable.name in context.variables))
        .map(variable => variable.name);

      if (missingVariables.length > 0) {
        throw new TemplateRenderError(
          template.name,
          `Missing required variables: ${missingVariables.join(', ')}`
        );
      }

      // Process the template content
      let content = template.content;
      
      // Handle simple conditionals and loops
      content = this.processTemplateLogic(content, context.variables);
      
      // Replace simple variables
      for (const [key, value] of Object.entries(context.variables)) {
        const placeholder = `{{${key}}}`;
        const stringValue = this.safeStringify(value);
        content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
      }

      // Replace metadata variables
      content = content.replace(/\{\{timestamp\}\}/g, context.metadata.generatedAt);
      content = content.replace(/\{\{version\}\}/g, context.metadata.version);
      content = content.replace(/\{\{source\}\}/g, context.metadata.source);

      return content;
    } catch (error) {
      throw new TemplateRenderError(
        template.name,
        error instanceof Error ? error.message : 'Unknown render error',
        error instanceof Error ? error : undefined
      );
    }
  }

  private processTemplateLogic(content: string, variables: Record<string, any>): string {
    // Process templates recursively to handle nested blocks
    let previousContent = '';
    let currentContent = content;
    let iterations = 0;
    const maxIterations = 10; // Prevent infinite loops
    
    while (previousContent !== currentContent && iterations < maxIterations) {
      previousContent = currentContent;
      currentContent = this.processSinglePass(currentContent, variables);
      iterations++;
    }
    
    return currentContent;
  }

  private processSinglePass(content: string, variables: Record<string, any>): string {
    // Handle {{#if variable}} ... {{else}} ... {{/if}} blocks first (they can contain other blocks)
    content = this.processIfElseBlocks(content, variables);
    
    // Handle {{#if variable}} ... {{/if}} blocks (without else)
    content = this.processIfBlocks(content, variables);
    
    // Handle {{#each array}} ... {{/each}} blocks
    content = this.processEachBlocks(content, variables);

    return content;
  }

  private processIfElseBlocks(content: string, variables: Record<string, any>): string {
    const regex = /\{\{#if\s+(\w+)\}\}/g;
    let match;
    let result = content;
    
    while ((match = regex.exec(content)) !== null) {
      const varName = match[1];
      const startPos = match.index;
      const openTag = match[0];
      
      // Find the matching {{else}} and {{/if}}
      const elsePos = this.findMatchingElse(content, startPos);
      const endPos = this.findMatchingEndIf(content, startPos);
      
      if (elsePos !== -1 && endPos !== -1 && elsePos < endPos) {
        // Has else block
        const ifBlock = content.substring(startPos + openTag.length, elsePos);
        const elseBlock = content.substring(elsePos + 8, endPos); // 8 = "{{else}}".length
        
        const value = variables[varName];
        const shouldShowIf = value && (Array.isArray(value) ? value.length > 0 : value !== false && value !== null && value !== undefined && value !== '');
        
        const replacement = shouldShowIf ? ifBlock : elseBlock;
        result = result.substring(0, startPos) + replacement + result.substring(endPos + 7); // 7 = "{{/if}}".length
        
        // Reset regex since we modified the string
        regex.lastIndex = 0;
        content = result;
      }
    }
    
    return result;
  }

  private processIfBlocks(content: string, variables: Record<string, any>): string {
    const regex = /\{\{#if\s+(\w+)\}\}/g;
    let match;
    let result = content;
    
    while ((match = regex.exec(content)) !== null) {
      const varName = match[1];
      const startPos = match.index;
      const openTag = match[0];
      
      // Find the matching {{/if}} (but not if there's an {{else}} first)
      const elsePos = this.findMatchingElse(content, startPos);
      const endPos = this.findMatchingEndIf(content, startPos);
      
      if (endPos !== -1 && (elsePos === -1 || elsePos > endPos)) {
        // No else block, just if block
        const ifBlock = content.substring(startPos + openTag.length, endPos);
        
        const value = variables[varName];
        const shouldShowIf = value && (Array.isArray(value) ? value.length > 0 : value !== false && value !== null && value !== undefined && value !== '');
        
        const replacement = shouldShowIf ? ifBlock : '';
        result = result.substring(0, startPos) + replacement + result.substring(endPos + 7); // 7 = "{{/if}}".length
        
        // Reset regex since we modified the string
        regex.lastIndex = 0;
        content = result;
      }
    }
    
    return result;
  }

  private processEachBlocks(content: string, variables: Record<string, any>): string {
    const regex = /\{\{#each\s+(\w+)\}\}/g;
    let match;
    let result = content;
    
    while ((match = regex.exec(content)) !== null) {
      const arrayName = match[1];
      const startPos = match.index;
      const openTag = match[0];
      
      // Find the matching {{/each}}
      const endPos = this.findMatchingEndEach(content, startPos);
      
      if (endPos !== -1) {
        const block = content.substring(startPos + openTag.length, endPos);
        const array = variables[arrayName];
        
        let replacement = '';
        if (Array.isArray(array) && array.length > 0) {
          replacement = array.map((item, index) => {
            let itemBlock = block;
            
            // Replace {{@index}} with current index
            itemBlock = itemBlock.replace(/\{\{@index\}\}/g, index.toString());
            
            // Replace item properties
            if (typeof item === 'object' && item !== null) {
              for (const [key, value] of Object.entries(item)) {
                const placeholder = `{{${key}}}`;
                const stringValue = this.safeStringify(value);
                itemBlock = itemBlock.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), stringValue);
              }
            } else {
              // For primitive values, replace {{this}}
              itemBlock = itemBlock.replace(/\{\{this\}\}/g, this.safeStringify(item));
            }
            
            return itemBlock;
          }).join('');
        }
        
        result = result.substring(0, startPos) + replacement + result.substring(endPos + 9); // 9 = "{{/each}}".length
        
        // Reset regex since we modified the string
        regex.lastIndex = 0;
        content = result;
      }
    }
    
    return result;
  }

  private findMatchingElse(content: string, startPos: number): number {
    let depth = 0;
    let pos = startPos;
    
    while (pos < content.length) {
      if (content.substring(pos, pos + 5) === '{{#if') {
        depth++;
        pos += 5;
      } else if (content.substring(pos, pos + 7) === '{{/if}}') {
        depth--;
        if (depth === 0) {
          return -1; // Found {{/if}} before {{else}}
        }
        pos += 7;
      } else if (content.substring(pos, pos + 8) === '{{else}}' && depth === 1) {
        return pos;
      } else {
        pos++;
      }
    }
    
    return -1;
  }

  private findMatchingEndIf(content: string, startPos: number): number {
    let depth = 0;
    let pos = startPos;
    
    while (pos < content.length) {
      if (content.substring(pos, pos + 5) === '{{#if') {
        depth++;
        pos += 5;
      } else if (content.substring(pos, pos + 7) === '{{/if}}') {
        depth--;
        if (depth === 0) {
          return pos;
        }
        pos += 7;
      } else {
        pos++;
      }
    }
    
    return -1;
  }

  private findMatchingEndEach(content: string, startPos: number): number {
    let depth = 0;
    let pos = startPos;
    
    while (pos < content.length) {
      if (content.substring(pos, pos + 7) === '{{#each') {
        depth++;
        pos += 7;
      } else if (content.substring(pos, pos + 9) === '{{/each}}') {
        depth--;
        if (depth === 0) {
          return pos;
        }
        pos += 9;
      } else {
        pos++;
      }
    }
    
    return -1;
  }

  private renderDefault(templateName: string, context: TemplateContext): string {
    // Enhanced default template fallback with better structure
    const timestamp = context.metadata.generatedAt;
    const templateType = this.inferTemplateType(templateName);
    
    let content = `# ${this.formatTemplateName(templateName)}\n\n`;
    
    switch (templateType) {
      case 'api-doc':
        content += this.getDefaultAPIDocContent(context);
        break;
      case 'setup-instructions':
        content += this.getDefaultSetupContent(context);
        break;
      case 'architecture-notes':
        content += this.getDefaultArchitectureContent(context);
        break;
      default:
        content += 'This documentation was generated automatically using a default template.\n\n';
        content += 'Please customize this template to match your project\'s needs.\n\n';
    }
    
    content += '---\n';
    content += `*Generated on ${timestamp} using default template fallback*`;
    
    return content;
  }

  /**
   * Template customization interface
   */
  customizeTemplate(customization: TemplateCustomization): void {
    try {
      this.validateCustomization(customization);
      this.customTemplates.set(customization.name, customization);
    } catch (error) {
      throw new TemplateValidationError(customization.name, [
        error instanceof Error ? error.message : 'Unknown customization error'
      ]);
    }
  }

  removeCustomTemplate(name: string): boolean {
    return this.customTemplates.delete(name);
  }

  getCustomTemplate(name: string): TemplateCustomization | undefined {
    return this.customTemplates.get(name);
  }

  listCustomTemplates(): TemplateCustomization[] {
    return Array.from(this.customTemplates.values());
  }

  /**
   * Graceful degradation for analysis failures
   */
  async renderWithFallback(
    templateName: string, 
    context: TemplateContext,
    fallbackData?: any
  ): Promise<string> {
    try {
      return await this.render(templateName, context);
    } catch (error) {
      // If rendering fails, try with fallback data
      if (fallbackData) {
        const fallbackContext: TemplateContext = {
          variables: { ...context.variables, ...fallbackData },
          metadata: context.metadata
        };
        
        try {
          return await this.render(templateName, fallbackContext);
        } catch (fallbackError) {
          // If fallback also fails, use default template
          return this.renderDefault(templateName, context);
        }
      }
      
      // Use error handler for graceful degradation
      return await this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), this.renderDefault(templateName, context));
    }
  }

  // Private helper methods
  private validateTemplate(template: Template): void {
    if (!template.name || template.name.trim() === '') {
      throw new Error('Template name is required');
    }
    
    if (!template.content || template.content.trim() === '') {
      throw new Error('Template content is required');
    }
    
    if (!template.type) {
      throw new Error('Template type is required');
    }
    
    // Validate template variables
    if (template.variables) {
      for (const variable of template.variables) {
        if (!variable.name || variable.name.trim() === '') {
          throw new Error('Variable name is required');
        }
        if (!variable.type || variable.type.trim() === '') {
          throw new Error('Variable type is required');
        }
      }
    }
  }

  private validateCustomization(customization: TemplateCustomization): void {
    if (!customization.name || customization.name.trim() === '') {
      throw new Error('Customization name is required');
    }
    
    if (!customization.content || customization.content.trim() === '') {
      throw new Error('Customization content is required');
    }
  }

  private convertCustomizationToTemplate(customization: TemplateCustomization): Template {
    return {
      name: customization.name,
      type: this.inferTemplateType(customization.name),
      content: customization.content,
      variables: []
    };
  }

  private inferTemplateType(templateName: string): 'api-doc' | 'setup-instructions' | 'architecture-notes' {
    const name = templateName.toLowerCase();
    if (name.includes('api') || name.includes('endpoint')) {
      return 'api-doc';
    }
    if (name.includes('setup') || name.includes('install') || name.includes('config')) {
      return 'setup-instructions';
    }
    if (name.includes('architecture') || name.includes('component') || name.includes('system')) {
      return 'architecture-notes';
    }
    return 'api-doc'; // Default fallback
  }

  private formatTemplateName(templateName: string): string {
    return templateName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private safeStringify(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '[Complex Object]';
      }
    }
    return String(value);
  }

  private getDefaultAPIDocContent(context: TemplateContext): string {
    return `## Overview

API Documentation generated automatically.

## Endpoints

*No specific endpoints documented yet. Please customize this template.*

## Usage

\`\`\`typescript
// Example usage will be added here
\`\`\`

`;
  }

  private getDefaultSetupContent(context: TemplateContext): string {
    return `## Installation

\`\`\`bash
npm install
\`\`\`

## Configuration

1. Configure your environment
2. Set up required dependencies
3. Initialize the application

## Usage

Please refer to the documentation for usage instructions.

`;
  }

  private getDefaultArchitectureContent(context: TemplateContext): string {
    return `## System Overview

System architecture documentation generated automatically.

## Components

*Component documentation will be added here.*

## Recent Changes

*Architectural changes will be documented here.*

`;
  }

  private getDefaultAPIDocTemplate(): string {
    return `# {{title}} Documentation

## Overview

{{description}}

## Endpoints

{{#if apis}}
{{#each apis}}
### {{name}}

{{#if method}}**Method:** {{method}}{{/if}}
{{#if path}}**Path:** {{path}}{{/if}}

{{#if description}}{{description}}{{/if}}

{{#if parameters}}
**Parameters:**
{{#each parameters}}
- \`{{name}}\` ({{type}}){{#if optional}} - Optional{{/if}}{{#if description}} - {{description}}{{/if}}
{{/each}}
{{/if}}

**Returns:** {{returnType}}

{{/each}}
{{else}}
*No endpoints documented yet.*
{{/if}}

---
*Generated on {{timestamp}}*`;
  }

  private getDefaultSetupTemplate(): string {
    return `# {{title}} Setup Instructions

## Installation

\`\`\`bash
{{installCommand}}
\`\`\`

## Configuration

{{#if configSteps}}
{{#each configSteps}}
{{@index}}. {{this}}
{{/each}}
{{else}}
No additional configuration required.
{{/if}}

## Usage

{{#if usageExample}}
\`\`\`typescript
{{usageExample}}
\`\`\`
{{/if}}

{{#if additionalNotes}}
## Additional Notes

{{additionalNotes}}
{{/if}}

---
*Generated on {{timestamp}}*`;
  }

  private getDefaultArchitectureTemplate(): string {
    return `# {{title}} Architecture Notes

## System Overview

{{systemOverview}}

## Components

{{#each components}}
### {{name}}

{{description}}

{{#if responsibilities}}
**Responsibilities:**
{{#each responsibilities}}
- {{this}}
{{/each}}
{{/if}}

{{#if interfaces}}
**Interfaces:**
{{#each interfaces}}
- \`{{this}}\`
{{/each}}
{{/if}}

{{/each}}

{{#if architecturalChanges}}
## Recent Changes

{{#each architecturalChanges}}
### {{component}} ({{type}})

{{description}}

**Impact:** {{impact}}

{{/each}}
{{/if}}

---
*Generated on {{timestamp}}*`;
  }
}