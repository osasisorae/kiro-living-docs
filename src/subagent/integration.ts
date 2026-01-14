/**
 * Subagent Integration - Connects the analysis engine with the Kiro Subagent
 */

import { CodeAnalyzer } from '../analysis/analyzer';
import { SubagentClient } from './client';
import { SubagentContext } from './types';
import { ChangeAnalysis, ChangedFile } from '../types';
import { AnalysisConfig } from '../analysis/types';

/**
 * Result from enhanced analysis including actual token usage
 */
export interface EnhancedAnalysisResult {
  analysis: ChangeAnalysis;
  tokensUsed: number;
  processingTimeMs: number;
}

export class SubagentIntegration {
  private subagentClient: SubagentClient;
  private analyzer: CodeAnalyzer;
  private lastTokensUsed: number = 0;

  constructor(
    analyzerConfig: AnalysisConfig,
    subagentConfigPath?: string,
    projectPath: string = process.cwd()
  ) {
    // Initialize the code analyzer
    this.analyzer = new CodeAnalyzer(analyzerConfig);

    // Create subagent context
    const context: SubagentContext = {
      projectPath
    };

    // Initialize subagent client
    this.subagentClient = new SubagentClient(subagentConfigPath, context);
    
    // Validate configuration
    this.subagentClient.validateConfig();
  }

  /**
   * Perform enhanced analysis using both local analyzer and subagent
   * Returns analysis results along with actual token usage from AI provider
   */
  async performEnhancedAnalysis(changes: string[]): Promise<ChangeAnalysis> {
    this.lastTokensUsed = 0; // Reset token counter
    
    try {
      // First, perform local analysis
      const localAnalysis = await this.analyzer.analyze(changes);

      // Check if OpenAI client is available before attempting subagent enhancement
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not available, skipping subagent enhancement');
        return localAnalysis;
      }

      // Extract Kiro context for subagent
      const kiroContext = await this.analyzer.extractKiroContext();
      this.subagentClient.updateContext({ kiroContext });

      // Enhance analysis with subagent capabilities
      const enhancedAnalysis = await this.enhanceWithSubagent(localAnalysis, changes);

      return enhancedAnalysis;
    } catch (error) {
      // Fallback to local analysis if subagent fails
      console.warn('Subagent enhancement failed, falling back to local analysis:', error);
      return await this.analyzer.analyze(changes);
    }
  }

  /**
   * Get the actual token count from the last subagent operation
   * This returns real token usage from the OpenAI API response
   */
  getLastTokensUsed(): number {
    return this.lastTokensUsed;
  }

  /**
   * Enhance local analysis results with subagent processing
   * Captures actual token usage from OpenAI API responses
   */
  private async enhanceWithSubagent(localAnalysis: ChangeAnalysis, changes: string[]): Promise<ChangeAnalysis> {
    try {
      // Use subagent for more sophisticated code analysis
      const codeAnalysisResponse = await this.subagentClient.analyzeCode({
        changes,
        filePaths: localAnalysis.changedFiles.map(f => f.path),
        diffContent: localAnalysis.changedFiles.map(f => f.diffContent).join('\n---\n')
      });
      
      // Capture actual tokens from code analysis response
      if (codeAnalysisResponse.metadata?.tokensUsed) {
        this.lastTokensUsed += codeAnalysisResponse.metadata.tokensUsed;
      }

      // Use subagent for enhanced change classification
      const classificationResponse = await this.subagentClient.classifyChanges({
        changedFiles: localAnalysis.changedFiles,
        previousAnalysis: localAnalysis
      });
      
      // Capture actual tokens from classification response
      if (classificationResponse.metadata?.tokensUsed) {
        this.lastTokensUsed += classificationResponse.metadata.tokensUsed;
      }

      // Convert AI extracted functions/classes to API definitions
      const aiAPIs: any[] = [];
      
      // Convert extracted functions to APIs (skip if they belong to a class)
      const classNames = new Set(
        (codeAnalysisResponse.extractedClasses || []).map(cls => cls.name)
      );
      
      if (codeAnalysisResponse.extractedFunctions) {
        for (const func of codeAnalysisResponse.extractedFunctions) {
          // Skip constructor and class methods (they'll be handled with classes)
          if (func.name === 'constructor') continue;
          
          // Check if this function name matches a class method pattern
          const isClassMethod = Array.from(classNames).some(className => 
            func.name.startsWith(`${className}.`) || 
            func.signature?.includes(`${className}.`)
          );
          if (isClassMethod) continue;
          
          aiAPIs.push({
            name: func.name,
            method: 'function',
            parameters: func.parameters || [],
            returnType: func.returnType || 'any',
            description: func.description || `${func.name} function`
          });
        }
      }
      
      // Convert extracted classes - only add the class itself, not individual methods
      // This prevents duplicate entries (function + class.method)
      if (codeAnalysisResponse.extractedClasses) {
        for (const cls of codeAnalysisResponse.extractedClasses) {
          const methodCount = cls.methods?.length || 0;
          const methodNames = (cls.methods || [])
            .map((m: string | { name: string }) => typeof m === 'string' ? m.split('(')[0].trim() : m.name)
            .filter((n: string) => n && n !== 'constructor')
            .slice(0, 5); // Show first 5 methods
          
          const methodSummary = methodNames.length > 0 
            ? `Methods: ${methodNames.join(', ')}${methodCount > 5 ? ` (+${methodCount - 5} more)` : ''}`
            : '';
          
          aiAPIs.push({
            name: cls.name,
            method: 'class',
            parameters: [],
            returnType: 'class',
            description: cls.description || `${cls.name} class. ${methodSummary}`.trim()
          });
        }
      }
      
      // Also include any explicit extractedAPIs from AI
      if (codeAnalysisResponse.extractedAPIs) {
        aiAPIs.push(...codeAnalysisResponse.extractedAPIs);
      }

      // Convert extracted classes to features
      const aiFeatures: any[] = classificationResponse.newFeatures || [];
      if (codeAnalysisResponse.extractedClasses) {
        for (const cls of codeAnalysisResponse.extractedClasses) {
          aiFeatures.push({
            name: cls.name,
            description: cls.description || `${cls.name} class`,
            affectedFiles: localAnalysis.changedFiles.map(f => f.path),
            category: 'enhanced'
          });
        }
      }

      const aiArchChanges = classificationResponse.architecturalChanges || [];
      const aiDocReqs = classificationResponse.documentationRequirements || [];

      // Filter local data to remove garbage (keywords parsed as functions)
      const localAPIs = localAnalysis.extractedAPIs.filter(localApi => 
        !localApi.description?.includes('takes (any)') &&
        !localApi.name.includes('.if') &&
        !localApi.name.includes('.for') &&
        !localApi.name.includes('.catch') &&
        !localApi.name.includes('.while')
      );

      const localFeatures = localAnalysis.newFeatures.filter(localFeature =>
        !localFeature.description?.includes('with 0 methods') &&
        localFeature.description?.length > 15
      );

      // Deduplicate by name
      const seenAPIs = new Set<string>();
      const uniqueAPIs = [...aiAPIs, ...localAPIs].filter(api => {
        if (seenAPIs.has(api.name)) return false;
        seenAPIs.add(api.name);
        return true;
      });

      const seenFeatures = new Set<string>();
      const uniqueFeatures = [...aiFeatures, ...localFeatures].filter(f => {
        if (seenFeatures.has(f.name)) return false;
        seenFeatures.add(f.name);
        return true;
      });

      return {
        ...localAnalysis,
        extractedAPIs: uniqueAPIs,
        newFeatures: uniqueFeatures,
        architecturalChanges: [...aiArchChanges, ...localAnalysis.architecturalChanges],
        documentationRequirements: [
          ...aiDocReqs,
          ...localAnalysis.documentationRequirements
        ]
      };
    } catch (error) {
      console.warn('Subagent enhancement failed:', error);
      return localAnalysis;
    }
  }

  /**
   * Generate documentation using subagent
   */
  async generateDocumentation(
    analysisResults: ChangeAnalysis,
    templateType: string,
    targetFile: string,
    existingContent?: string
  ): Promise<string> {
    try {
      // Check if OpenAI client is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not available, using fallback documentation generation');
        return this.generateFallbackDocumentation(analysisResults, templateType);
      }

      const response = await this.subagentClient.generateDocumentation({
        analysisResults,
        templateType,
        targetFile,
        existingContent
      });

      return response.content;
    } catch (error) {
      console.warn('Subagent documentation generation failed:', error);
      // Fallback to simple documentation generation
      return this.generateFallbackDocumentation(analysisResults, templateType);
    }
  }

  /**
   * Generate README using AI subagent
   */
  async generateReadme(
    analysisResults: ChangeAnalysis,
    existingContent?: string,
    projectContext?: any
  ): Promise<string> {
    try {
      // Check if OpenAI client is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not available, using fallback README generation');
        return this.generateFallbackDocumentation(analysisResults, 'readme');
      }

      const response = await this.subagentClient.generateReadme({
        analysisResults,
        existingContent,
        projectContext
      });
      
      // Track tokens used
      if (response.metadata?.tokensUsed) {
        this.lastTokensUsed += response.metadata.tokensUsed;
      }

      return response.content;
    } catch (error) {
      console.warn('Subagent README generation failed:', error);
      return this.generateFallbackDocumentation(analysisResults, 'readme');
    }
  }

  /**
   * Process template using subagent
   */
  async processTemplate(
    template: string,
    variables: Record<string, any>,
    templateType: string
  ): Promise<string> {
    try {
      // Check if OpenAI client is available
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OPENAI_API_KEY not available, using fallback template processing');
        return this.processTemplateFallback(template, variables);
      }

      const response = await this.subagentClient.processTemplate({
        template,
        variables,
        templateType
      });

      return response.processedContent;
    } catch (error) {
      console.warn('Subagent template processing failed:', error);
      // Fallback to simple variable substitution
      return this.processTemplateFallback(template, variables);
    }
  }

  /**
   * Fallback documentation generation when subagent is unavailable
   * Provides useful output even without AI
   */
  private generateFallbackDocumentation(analysisResults: ChangeAnalysis, templateType: string): string {
    const { newFeatures, extractedAPIs, architecturalChanges, changedFiles } = analysisResults;

    let content = '';
    
    if (templateType === 'readme') {
      // Generate a structured README section update
      content = this.generateFallbackReadmeSection(analysisResults);
    } else {
      // Generate API documentation
      content = `# Documentation Update\n\nGenerated: ${new Date().toISOString()}\n\n`;
      content += `*Note: Generated in offline mode without AI enhancement*\n\n`;

      if (newFeatures.length > 0) {
        content += `## New Features\n\n`;
        for (const feature of newFeatures) {
          content += `### ${feature.name}\n\n`;
          content += `${feature.description}\n\n`;
          if (feature.affectedFiles && feature.affectedFiles.length > 0) {
            content += `**Files:** ${feature.affectedFiles.join(', ')}\n\n`;
          }
        }
      }

      if (extractedAPIs.length > 0) {
        content += `## API Reference\n\n`;
        for (const api of extractedAPIs) {
          content += `### ${api.name}\n\n`;
          if (api.description) {
            content += `${api.description}\n\n`;
          }
          if (api.method) {
            content += `**Type:** ${api.method}\n`;
          }
          if (api.parameters && api.parameters.length > 0) {
            content += `\n**Parameters:**\n`;
            for (const param of api.parameters) {
              content += `- \`${param.name}\` (${param.type})${param.description ? `: ${param.description}` : ''}\n`;
            }
          }
          if (api.returnType) {
            content += `\n**Returns:** \`${api.returnType}\`\n`;
          }
          content += '\n';
        }
      }

      if (architecturalChanges.length > 0) {
        content += `## Architectural Changes\n\n`;
        for (const change of architecturalChanges) {
          content += `### ${change.component}\n\n`;
          content += `**Type:** ${change.type}\n`;
          content += `**Impact:** ${change.impact}\n\n`;
          content += `${change.description}\n\n`;
        }
      }

      if (changedFiles.length > 0) {
        content += `## Changed Files\n\n`;
        for (const file of changedFiles) {
          content += `- \`${file.path}\` (${file.changeType})\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  /**
   * Generate a README section update in offline mode
   */
  private generateFallbackReadmeSection(analysisResults: ChangeAnalysis): string {
    const { newFeatures, extractedAPIs } = analysisResults;
    
    let content = '';
    
    // Only generate content if we have meaningful data
    const meaningfulFeatures = newFeatures.filter(f => 
      f.description && f.description.length > 20 && 
      !f.description.includes('with 0 methods')
    );
    
    const meaningfulAPIs = extractedAPIs.filter(api => 
      api.name && !api.name.includes('.if') && !api.name.includes('.for')
    );
    
    if (meaningfulFeatures.length > 0) {
      content += `## Features\n\n`;
      for (const feature of meaningfulFeatures) {
        content += `- **${feature.name}**: ${feature.description}\n`;
      }
      content += '\n';
    }
    
    if (meaningfulAPIs.length > 0) {
      // Group APIs by type
      const functions = meaningfulAPIs.filter(a => a.method === 'function');
      const classes = meaningfulAPIs.filter(a => a.method === 'class');
      
      content += `## API Reference\n\n`;
      
      if (classes.length > 0) {
        content += `### Classes\n\n`;
        for (const cls of classes) {
          content += `- **${cls.name}**: ${cls.description || 'Class'}\n`;
        }
        content += '\n';
      }
      
      if (functions.length > 0) {
        content += `### Functions\n\n`;
        for (const func of functions.slice(0, 10)) { // Limit to 10
          const params = func.parameters?.map(p => `${p.name}: ${p.type}`).join(', ') || '';
          content += `- \`${func.name}(${params})\` → \`${func.returnType || 'void'}\`\n`;
        }
        if (functions.length > 10) {
          content += `- *...and ${functions.length - 10} more functions*\n`;
        }
        content += '\n';
      }
    }
    
    return content || '*No significant changes detected*\n';
  }

  /**
   * Fallback template processing when subagent is unavailable
   */
  private processTemplateFallback(template: string, variables: Record<string, any>): string {
    let processed = template;

    // Simple variable substitution
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return processed;
  }

  /**
   * Get subagent configuration
   */
  getSubagentConfig() {
    return this.subagentClient.getConfig();
  }

  /**
   * Update analysis configuration
   */
  updateAnalysisConfig(config: Partial<AnalysisConfig>): void {
    // Note: This would require modifying the CodeAnalyzer to accept config updates
    // For now, this is a placeholder for future enhancement
    console.log('Analysis config update requested:', config);
  }

  /**
   * Health check for subagent integration
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Only check if the client is properly configured, don't make API calls
      if (!process.env.OPENAI_API_KEY) {
        console.warn('Subagent health check: OPENAI_API_KEY not configured');
        return false;
      }

      // Validate configuration without making API calls
      this.subagentClient.validateConfig();
      
      console.log('Subagent health check: Configuration valid');
      return true;
    } catch (error) {
      console.warn('Subagent health check failed:', error);
      return false;
    }
  }
}