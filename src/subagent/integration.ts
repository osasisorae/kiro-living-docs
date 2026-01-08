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

      // Merge local and subagent results
      return {
        ...localAnalysis,
        extractedAPIs: [
          ...localAnalysis.extractedAPIs,
          ...codeAnalysisResponse.extractedAPIs
        ],
        newFeatures: [
          ...localAnalysis.newFeatures,
          ...classificationResponse.newFeatures
        ],
        architecturalChanges: [
          ...localAnalysis.architecturalChanges,
          ...classificationResponse.architecturalChanges
        ],
        documentationRequirements: [
          ...localAnalysis.documentationRequirements,
          ...classificationResponse.documentationRequirements
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
      // Test basic subagent functionality
      await this.subagentClient.analyzeCode({
        changes: ['// test'],
        filePaths: ['test.ts'],
        diffContent: '// test change'
      });

      return true;
    } catch (error) {
      console.warn('Subagent health check failed:', error);
      return false;
    }
  }
}