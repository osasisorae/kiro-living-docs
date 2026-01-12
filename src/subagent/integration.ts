/**
 * Subagent Integration - Connects the analysis engine with the Kiro Subagent
 */

import { CodeAnalyzer } from '../analysis/analyzer';
import { SubagentClient } from './client';
import { SubagentContext } from './types';
import { ChangeAnalysis, ChangedFile } from '../types';
import { AnalysisConfig } from '../analysis/types';

export class SubagentIntegration {
  private subagentClient: SubagentClient;
  private analyzer: CodeAnalyzer;

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
   */
  async performEnhancedAnalysis(changes: string[]): Promise<ChangeAnalysis> {
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
   * Enhance local analysis results with subagent processing
   */
  private async enhanceWithSubagent(localAnalysis: ChangeAnalysis, changes: string[]): Promise<ChangeAnalysis> {
    try {
      // Use subagent for more sophisticated code analysis
      const codeAnalysisResponse = await this.subagentClient.analyzeCode({
        changes,
        filePaths: localAnalysis.changedFiles.map(f => f.path),
        diffContent: localAnalysis.changedFiles.map(f => f.diffContent).join('\n---\n')
      });

      // Use subagent for enhanced change classification
      const classificationResponse = await this.subagentClient.classifyChanges({
        changedFiles: localAnalysis.changedFiles,
        previousAnalysis: localAnalysis
      });

      // Convert AI extracted functions/classes to API definitions
      const aiAPIs: any[] = [];
      
      // Convert extracted functions to APIs
      if (codeAnalysisResponse.extractedFunctions) {
        for (const func of codeAnalysisResponse.extractedFunctions) {
          aiAPIs.push({
            name: func.name,
            method: 'function',
            parameters: func.parameters || [],
            returnType: func.returnType || 'any',
            description: func.description || `${func.name} function`
          });
        }
      }
      
      // Convert extracted classes to APIs (class methods)
      if (codeAnalysisResponse.extractedClasses) {
        for (const cls of codeAnalysisResponse.extractedClasses) {
          // Add class itself as a feature
          if (cls.methods && cls.methods.length > 0) {
            for (const method of cls.methods) {
              // Parse method signature if it's a string
              const methodName = typeof method === 'string' 
                ? method.split('(')[0].trim()
                : method.name;
              
              if (methodName && !methodName.includes('constructor')) {
                aiAPIs.push({
                  name: `${cls.name}.${methodName}`,
                  method: 'method',
                  parameters: [],
                  returnType: 'any',
                  description: `${cls.name} method: ${methodName}`
                });
              }
            }
          }
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
   */
  private generateFallbackDocumentation(analysisResults: ChangeAnalysis, templateType: string): string {
    const { newFeatures, extractedAPIs, architecturalChanges } = analysisResults;

    let content = `# Documentation Update\n\nGenerated: ${new Date().toISOString()}\n\n`;

    if (newFeatures.length > 0) {
      content += `## New Features\n\n`;
      for (const feature of newFeatures) {
        content += `- **${feature.name}**: ${feature.description}\n`;
      }
      content += '\n';
    }

    if (extractedAPIs.length > 0) {
      content += `## API Changes\n\n`;
      for (const api of extractedAPIs) {
        content += `- **${api.name}**: ${api.description || 'API endpoint'}\n`;
      }
      content += '\n';
    }

    if (architecturalChanges.length > 0) {
      content += `## Architectural Changes\n\n`;
      for (const change of architecturalChanges) {
        content += `- **${change.component}**: ${change.description} (Impact: ${change.impact})\n`;
      }
      content += '\n';
    }

    return content;
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