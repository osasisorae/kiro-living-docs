/**
 * Enhanced documentation generators with comprehensive error handling and graceful degradation
 */

import { TemplateEngine } from './engine';
import { TemplateContext } from './types';
import { 
  DocumentationRequirement, 
  APIDefinition, 
  FeatureDescription, 
  ArchitecturalChange,
  ChangeAnalysis 
} from '../types';
import { 
  TemplateError, 
  TemplateRenderError, 
  ErrorHandler 
} from './errors';

export class DocumentationGenerators {
  private errorHandler: ErrorHandler = new ErrorHandler();

  constructor(private templateEngine: TemplateEngine) {}

  /**
   * Generate API specification documentation for .kiro/specs/ files with error handling
   */
  async generateAPISpecification(
    apis: APIDefinition[], 
    description?: string
  ): Promise<DocumentationRequirement> {
    try {
      // Verify template exists and use it if available
      const template = this.templateEngine.getTemplate('api-doc');
      
      if (template) {
        const context: TemplateContext = {
          variables: {
            title: 'API',
            apis: this.sanitizeAPIs(apis),
            description: description || 'API Documentation'
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            version: '1.0.0',
            source: 'auto-doc-sync'
          }
        };

        const content = await this.templateEngine.renderWithFallback('api-doc', context, {
          apis: [],
          description: 'API Documentation (generated with fallback)'
        });

        return {
          type: 'api-spec',
          targetFile: '.kiro/specs/api.md',
          content,
          priority: 'high'
        };
      }

      // Fallback to direct generation if template not available
      return this.generateAPISpecificationFallback(apis, description);
    } catch (error) {
      // Use error handler for graceful degradation
      const fallback = this.generateAPISpecificationFallback(apis, description);
      return await this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), fallback);
    }
  }

  private generateAPISpecificationFallback(
    apis: APIDefinition[], 
    description?: string
  ): DocumentationRequirement {
    // This is the fallback when template processing fails
    let content = '# API Documentation\n\n';
    
    content += '## Overview\n';
    content += `${description || 'API Documentation'}\n\n`;
    
    content += '## Endpoints\n\n';
    
    const sanitizedAPIs = this.sanitizeAPIs(apis);
    
    if (sanitizedAPIs.length === 0) {
      content += '*No endpoints documented yet.*\n\n';
    } else {
      sanitizedAPIs.forEach(api => {
        const apiName = (api.name || '').trim() || 'Unnamed API';
        
        content += `### ${apiName}\n`;
        
        if (api.method) {
          content += `**Method:** ${api.method}\n`;
        }
        
        if (api.path) {
          content += `**Path:** ${api.path}\n`;
        }
        
        content += '\n';
        
        if (api.description && api.description.trim()) {
          content += `${api.description.trim()}\n\n`;
        }
        
        if (api.parameters && api.parameters.length > 0) {
          content += '**Parameters:**\n';
          api.parameters.forEach(param => {
            const paramName = (param.name || '').trim() || 'unnamed';
            const paramType = param.type || 'unknown';
            const optional = param.optional ? ' - Optional' : '';
            const desc = param.description && param.description.trim() ? ` - ${param.description.trim()}` : '';
            content += `- \`${paramName}\` (${paramType})${optional}${desc}\n`;
          });
          content += '\n';
        }
        
        const returnType = api.returnType || 'unknown';
        content += `**Returns:** ${returnType}\n\n`;
      });
    }
    
    content += '---\n';
    content += `*Generated on ${new Date().toISOString()}*`;

    return {
      type: 'api-spec',
      targetFile: '.kiro/specs/api.md',
      content,
      priority: 'high'
    };
  }

  /**
   * Generate README Features & API section updates with error handling
   */
  async generateREADMESection(
    features: FeatureDescription[],
    apis: APIDefinition[]
  ): Promise<DocumentationRequirement> {
    try {
      const sanitizedFeatures = this.sanitizeFeatures(features);
      const sanitizedAPIs = this.sanitizeAPIs(apis);
      
      const featuresContent = this.generateFeaturesSection(sanitizedFeatures);
      const apiContent = this.generateAPISection(sanitizedAPIs);
      
      const content = `## Features

${featuresContent}

## API

${apiContent}

---
*Last updated: ${new Date().toISOString()}*`;

      return {
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content,
        priority: 'medium'
      };
    } catch (error) {
      // Fallback to minimal content
      const fallbackContent = `## Features

Features documentation will be updated automatically.

## API

API documentation will be updated automatically.

---
*Last updated: ${new Date().toISOString()}*`;

      const fallback: DocumentationRequirement = {
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content: fallbackContent,
        priority: 'medium'
      };

      return await this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), fallback);
    }
  }

  /**
   * Generate setup instructions documentation
   */
  generateSetupInstructions(
    installCommand: string,
    configSteps?: string[],
    usageExample?: string,
    additionalNotes?: string
  ): DocumentationRequirement {
    // Verify template exists (for consistency checking)
    const template = this.templateEngine.getTemplate('setup-instructions');
    
    let content = '# Setup Instructions\n\n';
    
    content += '## Installation\n\n';
    content += `\`\`\`bash\n${installCommand || 'npm install'}\n\`\`\`\n\n`;
    
    content += '## Configuration\n\n';
    if (configSteps && configSteps.length > 0) {
      configSteps.forEach((step, index) => {
        const stepText = (step || '').trim();
        if (stepText) {
          content += `${index + 1}. ${stepText}\n`;
        }
      });
      content += '\n';
    } else {
      content += 'No additional configuration required.\n\n';
    }
    
    content += '## Usage\n\n';
    if (usageExample && usageExample.trim()) {
      content += `\`\`\`typescript\n${usageExample.trim()}\n\`\`\`\n\n`;
    }
    
    if (additionalNotes && additionalNotes.trim()) {
      content += '## Additional Notes\n\n';
      content += `${additionalNotes.trim()}\n\n`;
    }
    
    content += '---\n';
    content += `*Generated on ${new Date().toISOString()}*`;

    return {
      type: 'api-spec',
      targetFile: '.kiro/specs/setup.md',
      content,
      priority: 'medium'
    };
  }

  /**
   * Generate architecture notes documentation
   */
  generateArchitectureNotes(
    systemOverview: string,
    components: Array<{
      name: string;
      description: string;
      responsibilities?: string[];
      interfaces?: string[];
    }>,
    architecturalChanges?: ArchitecturalChange[]
  ): DocumentationRequirement {
    // Verify template exists (for consistency checking)
    const template = this.templateEngine.getTemplate('architecture-notes');
    
    let content = '# Architecture Notes\n\n';
    
    content += '## System Overview\n\n';
    content += `${systemOverview || 'System overview not provided.'}\n\n`;
    
    content += '## Components\n\n';
    components.forEach(component => {
      const componentName = (component.name || '').trim() || 'Unnamed Component';
      const componentDesc = (component.description || '').trim() || 'No description provided.';
      
      content += `### ${componentName}\n\n`;
      content += `${componentDesc}\n\n`;
      
      if (component.responsibilities && component.responsibilities.length > 0) {
        content += '**Responsibilities:**\n';
        component.responsibilities.forEach(resp => {
          const responsibility = (resp || '').trim();
          if (responsibility) {
            content += `- ${responsibility}\n`;
          }
        });
        content += '\n';
      }
      
      if (component.interfaces && component.interfaces.length > 0) {
        content += '**Interfaces:**\n';
        component.interfaces.forEach(iface => {
          const interfaceName = (iface || '').trim();
          if (interfaceName) {
            content += `- \`${interfaceName}\`\n`;
          }
        });
        content += '\n';
      }
    });
    
    if (architecturalChanges && architecturalChanges.length > 0) {
      content += '## Recent Changes\n\n';
      architecturalChanges.forEach(change => {
        const componentName = (change.component || '').trim() || 'Unknown Component';
        const changeType = change.type || 'unknown';
        const changeDesc = (change.description || '').trim() || 'No description provided.';
        const impact = change.impact || 'unknown';
        
        content += `### ${componentName} (${changeType})\n\n`;
        content += `${changeDesc}\n\n`;
        content += `**Impact:** ${impact}\n\n`;
      });
    }
    
    content += '---\n';
    content += `*Generated on ${new Date().toISOString()}*`;

    return {
      type: 'api-spec',
      targetFile: '.kiro/specs/architecture.md',
      content,
      priority: 'medium'
    };
  }

  private generateFeaturesSection(features: FeatureDescription[]): string {
    if (features.length === 0) {
      return 'No features documented yet.';
    }

    try {
      const categorized = {
        new: features.filter(f => f.category === 'new'),
        enhanced: features.filter(f => f.category === 'enhanced'),
        deprecated: features.filter(f => f.category === 'deprecated')
      };

      let content = '';

      if (categorized.new.length > 0) {
        content += '### New Features\n\n';
        content += categorized.new.map(f => {
          const name = (f.name || '').trim() || 'Unnamed Feature';
          const desc = (f.description || '').trim() || 'No description provided.';
          return `- **${name}**: ${desc}`;
        }).join('\n');
        content += '\n\n';
      }

      if (categorized.enhanced.length > 0) {
        content += '### Enhanced Features\n\n';
        content += categorized.enhanced.map(f => {
          const name = (f.name || '').trim() || 'Unnamed Feature';
          const desc = (f.description || '').trim() || 'No description provided.';
          return `- **${name}**: ${desc}`;
        }).join('\n');
        content += '\n\n';
      }

      if (categorized.deprecated.length > 0) {
        content += '### Deprecated Features\n\n';
        content += categorized.deprecated.map(f => {
          const name = (f.name || '').trim() || 'Unnamed Feature';
          const desc = (f.description || '').trim() || 'No description provided.';
          return `- **${name}**: ${desc}`;
        }).join('\n');
        content += '\n\n';
      }

      return content.trim();
    } catch (error) {
      return 'Error generating features section. Please review manually.';
    }
  }

  private generateAPISection(apis: APIDefinition[]): string {
    if (apis.length === 0) {
      return 'No API endpoints documented yet.';
    }

    try {
      return apis.map(api => {
        const apiName = (api.name || '').trim() || 'Unnamed API';
        let apiDoc = `### ${apiName}\n\n`;
        
        if (api.method && api.path) {
          apiDoc += `\`${api.method} ${api.path}\`\n\n`;
        }
        
        if (api.description && api.description.trim()) {
          apiDoc += `${api.description.trim()}\n\n`;
        }

        if (api.parameters && api.parameters.length > 0) {
          apiDoc += '**Parameters:**\n';
          apiDoc += api.parameters.map(p => {
            const paramName = (p.name || '').trim() || 'unnamed';
            const paramType = p.type || 'unknown';
            const optional = p.optional ? ' - Optional' : '';
            const desc = p.description && p.description.trim() ? ` - ${p.description.trim()}` : '';
            return `- \`${paramName}\` (${paramType})${optional}${desc}`;
          }).join('\n');
          apiDoc += '\n\n';
        }

        const returnType = api.returnType || 'unknown';
        apiDoc += `**Returns:** ${returnType}\n\n`;
        
        return apiDoc;
      }).join('');
    } catch (error) {
      return 'Error generating API section. Please review manually.';
    }
  }

  // Data sanitization methods
  private sanitizeAPIs(apis: APIDefinition[]): APIDefinition[] {
    if (!Array.isArray(apis)) {
      return [];
    }

    return apis.map(api => ({
      name: this.sanitizeString(api.name) || 'Unnamed API',
      method: this.sanitizeString(api.method),
      path: this.sanitizeString(api.path),
      parameters: Array.isArray(api.parameters) ? api.parameters.map(p => ({
        name: this.sanitizeString(p.name) || 'unnamed',
        type: this.sanitizeString(p.type) || 'unknown',
        optional: Boolean(p.optional),
        description: this.sanitizeString(p.description)
      })) : [],
      returnType: this.sanitizeString(api.returnType) || 'unknown',
      description: this.sanitizeString(api.description)
    }));
  }

  private sanitizeFeatures(features: FeatureDescription[]): FeatureDescription[] {
    if (!Array.isArray(features)) {
      return [];
    }

    return features.map(feature => ({
      name: this.sanitizeString(feature.name) || 'Unnamed Feature',
      description: this.sanitizeString(feature.description) || 'No description provided.',
      affectedFiles: Array.isArray(feature.affectedFiles) ? feature.affectedFiles.filter(f => typeof f === 'string') : [],
      category: ['new', 'enhanced', 'deprecated'].includes(feature.category) ? feature.category : 'new'
    }));
  }

  private sanitizeString(value: any): string | undefined {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  }
}