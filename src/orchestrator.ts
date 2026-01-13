/**
 * Main orchestration system that coordinates all components
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { CodeAnalyzer } from './analysis/analyzer';
import { TemplateEngine } from './templates/engine';
import { OutputManager } from './output/manager';
import { HookManager } from './hooks/manager';
import { DevelopmentLogger } from './logging/logger';
import { SubagentIntegration } from './subagent/integration';
import { SubagentConfigManager } from './subagent/config-manager';
import { ConfigManager } from './config';
import { UsageTracker, UsageConfig, DEFAULT_USAGE_CONFIG } from './usage';
import { ChangeAnalysis, DocumentationRequirement } from './types';
import { AnalysisConfig } from './analysis/types';
import { OutputConfig } from './output/types';
import { DEFAULT_LOG_CONFIG } from './logging';

export interface SystemConfig {
  workspaceRoot?: string;
  analysis: AnalysisConfig;
  output: OutputConfig;
  logging: {
    logDirectory: string;
    maxEntriesPerFile: number;
    retentionDays: number;
    groupingTimeWindow: number;
  };
  usage: UsageConfig;
  subagent: {
    enabled: boolean;
    configPath?: string;
  };
  hooks: {
    enabled: boolean;
    configPath: string;
  };
}

export interface RunOptions {
  triggerType: 'git-hook' | 'manual';
  configPath?: string;
  targetFiles?: string[];
  reason?: string;
}

export class AutoDocSyncSystem {
  private config: SystemConfig;
  private workspaceRoot: string;
  private analyzer: CodeAnalyzer;
  private templateEngine: TemplateEngine;
  private outputManager: OutputManager;
  private hookManager: HookManager;
  private logger: DevelopmentLogger;
  private usageTracker: UsageTracker;
  private subagentIntegration?: SubagentIntegration;
  private initialized = false;

  constructor(configPath?: string, workspaceRoot?: string) {
    this.workspaceRoot = workspaceRoot || process.cwd();
    this.config = ConfigManager.loadConfig(configPath);
    
    // Constructor workspace root takes precedence over config file workspace root
    if (workspaceRoot) {
      this.workspaceRoot = path.resolve(workspaceRoot);
    } else if (this.config.workspaceRoot) {
      this.workspaceRoot = path.resolve(this.config.workspaceRoot);
    }
    
    // Initialize core components
    this.analyzer = new CodeAnalyzer(this.config.analysis, this.resolveWorkspacePath.bind(this));
    this.templateEngine = new TemplateEngine();
    this.outputManager = new OutputManager(this.config.output);
    this.hookManager = new HookManager(this.resolveWorkspacePath(this.config.logging.logDirectory));
    this.logger = new DevelopmentLogger({
      ...this.config.logging,
      logDirectory: this.resolveWorkspacePath(this.config.logging.logDirectory)
    });
    
    // Initialize usage tracker
    this.usageTracker = new UsageTracker({
      ...this.config.usage,
      dataDirectory: this.resolveWorkspacePath(this.config.usage.dataDirectory)
    });
    
    // Initialize subagent integration if enabled
    if (this.config.subagent.enabled) {
      try {
        // Ensure subagent config exists before creating integration
        const configPath = this.config.subagent.configPath 
          ? this.resolveWorkspacePath(this.config.subagent.configPath)
          : undefined;
        
        if (!SubagentConfigManager.configExists(configPath)) {
          // Initialize config synchronously to avoid async constructor issues
          const fs = require('fs');
          const path = require('path');
          
          const targetPath = configPath || SubagentConfigManager.getConfigPath(this.workspaceRoot);
          const dir = path.dirname(targetPath);
          
          // Create directory if it doesn't exist
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          
          // Create default config if it doesn't exist
          if (!fs.existsSync(targetPath)) {
            // Use the same default config creation logic as SubagentConfigManager
            const defaultConfig = {
              name: "doc-analysis-agent",
              version: "1.0.0",
              description: "Specialized AI agent for code analysis and documentation generation in the Auto-Doc-Sync System",
              capabilities: [
                "code-analysis",
                "ast-parsing", 
                "diff-analysis",
                "documentation-generation",
                "template-processing",
                "change-classification"
              ],
              configuration: {
                model: "gpt-4",
                temperature: 0.1,
                maxTokens: 4000,
                timeout: 30000
              },
              prompts: {
                system: "You are a specialized documentation analysis agent for the Auto-Doc-Sync System. Your role is to analyze code changes and generate structured documentation requirements.",
                codeAnalysis: "Analyze the following code changes and extract functions, classes, APIs, and types.",
                changeClassification: "Classify the following code changes and identify new features, API modifications, and architectural changes.",
                documentationGeneration: "Generate documentation content based on the provided analysis results.",
                templateProcessing: "Process the following template with the provided variables."
              }
            };
            
            fs.writeFileSync(targetPath, JSON.stringify(defaultConfig, null, 2));
          }
        }
        
        this.subagentIntegration = new SubagentIntegration(
          this.config.analysis,
          configPath,
          this.workspaceRoot
        );
      } catch (error) {
        console.warn('Subagent integration failed to initialize, continuing without it:', error);
      }
    }
  }

  /**
   * Resolve a path relative to the workspace root
   */
  private resolveWorkspacePath(relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(this.workspaceRoot, relativePath);
  }

  /**
   * Initialize the system and load configurations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure required directories exist
      await this.ensureDirectories();
      
      // Initialize subagent configuration if needed (fallback for async initialization)
      if (this.config.subagent.enabled && !this.subagentIntegration) {
        try {
          await SubagentConfigManager.initialize(this.workspaceRoot);
          
          const configPath = this.config.subagent.configPath 
            ? this.resolveWorkspacePath(this.config.subagent.configPath)
            : undefined;
            
          this.subagentIntegration = new SubagentIntegration(
            this.config.analysis,
            configPath,
            this.workspaceRoot
          );
        } catch (error) {
          console.warn('Subagent integration initialization failed during async setup:', error);
        }
      }
      
      // Load hook configurations
      if (this.config.hooks.enabled) {
        await this.hookManager.loadHookConfigs(this.resolveWorkspacePath(this.config.hooks.configPath));
      }
      
      // Validate system health
      await this.performHealthCheck();
      
      this.initialized = true;
      console.log('Auto-Doc-Sync System initialized successfully');
    } catch (error) {
      throw new Error(`System initialization failed: ${error}`);
    }
  }

  /**
   * Main execution method that coordinates all system components
   */
  async run(options: RunOptions): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    console.log(`Starting Auto-Doc-Sync System (trigger: ${options.triggerType})`);

    // Start usage tracking
    await this.usageTracker.startSession(sessionId);

    try {
      // Step 1: Analyze code changes
      const analysisOpId = this.usageTracker.startOperation('analysis');
      const changes = await this.detectChanges(options);
      this.usageTracker.endOperation(analysisOpId, 'analysis');
      
      if (changes.length === 0) {
        console.log('No changes detected, skipping documentation sync');
        // Still create a log entry for tracking purposes
        const emptyAnalysis: ChangeAnalysis = {
          timestamp: new Date().toISOString(),
          triggerType: options.triggerType,
          changedFiles: [],
          extractedAPIs: [],
          newFeatures: [],
          architecturalChanges: [],
          documentationRequirements: []
        };
        await this.createLogEntry(emptyAnalysis, options);
        await this.endSessionWithSummary();
        return;
      }

      // Step 2: Perform analysis (with subagent enhancement if available)
      const analysis = await this.performAnalysis(changes);
      this.usageTracker.trackAnalysisRun(changes.length);
      
      // Check cost thresholds
      const costAlert = this.usageTracker.checkCostThresholds();
      if (costAlert) {
        console.warn(`Usage Alert: ${costAlert.message}`);
        if (costAlert.type === 'limit-reached') {
          throw new Error(`Cost limit exceeded: ${costAlert.message}`);
        }
      }
      
      // Step 3: Generate documentation requirements from enhanced analysis
      // Override local analyzer's requirements with ones based on actual content
      let requirements = analysis.documentationRequirements;
      
      // If we have APIs or features but no requirements, generate them
      if (requirements.length === 0 && (analysis.extractedAPIs.length > 0 || analysis.newFeatures.length > 0)) {
        requirements = [];
        
        if (analysis.extractedAPIs.length > 0) {
          requirements.push({
            type: 'api-spec' as const,
            targetFile: this.resolveWorkspacePath('.kiro/specs/api.md'),
            content: '', // Will be generated in processDocumentationRequirements
            priority: 'high' as const
          });
        }
        
        if (analysis.newFeatures.length > 0 || analysis.extractedAPIs.length > 0) {
          requirements.push({
            type: 'readme-section' as const,
            targetFile: this.resolveWorkspacePath('README.md'),
            section: 'Features & API',
            content: '', // Will be generated in processDocumentationRequirements
            priority: 'medium' as const
          });
        }
      }
      
      if (requirements.length === 0) {
        console.log('No documentation updates required');
        // Still create a log entry for tracking purposes
        await this.createLogEntry(analysis, options);
        await this.endSessionWithSummary();
        return;
      }

      // Step 4: Generate documentation content using templates
      const templateOpId = this.usageTracker.startOperation('template');
      const processedRequirements = await this.processDocumentationRequirements(requirements, analysis);
      this.usageTracker.endOperation(templateOpId, 'template');
      
      // Step 5: Write documentation updates
      const writeOpId = this.usageTracker.startOperation('file-write');
      const writeResults = await this.outputManager.writeDocumentation(processedRequirements);
      this.usageTracker.endOperation(writeOpId, 'file-write');
      
      // Step 6: Create development log entry
      await this.createLogEntry(analysis, options);
      
      // Step 7: Report results
      this.reportResults(writeResults, Date.now() - startTime);
      
      // Step 8: End session and show usage summary
      await this.endSessionWithSummary();
      
    } catch (error) {
      console.error('Auto-Doc-Sync System execution failed:', error);
      
      // Log the error for debugging
      try {
        const errorAnalysis: ChangeAnalysis = {
          timestamp: new Date().toISOString(),
          triggerType: options.triggerType,
          changedFiles: [],
          extractedAPIs: [],
          newFeatures: [],
          architecturalChanges: [],
          documentationRequirements: [{
            type: 'dev-log',
            targetFile: this.resolveWorkspacePath(path.join(this.config.logging.logDirectory, 'error.md')),
            content: `System error: ${error instanceof Error ? error.message : String(error)}`,
            priority: 'high'
          }]
        };
        
        await this.createLogEntry(errorAnalysis, options);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      // End session even on error
      await this.endSessionWithSummary();
      
      throw error;
    }
  }

  /**
   * Detect code changes based on trigger type
   */
  private async detectChanges(options: RunOptions): Promise<string[]> {
    if (options.triggerType === 'git-hook') {
      // For git hooks, get the latest commit changes
      return this.getGitChanges();
    } else {
      // For manual triggers, analyze working directory changes or specific files
      if (options.targetFiles && options.targetFiles.length > 0) {
        return this.getFileChanges(options.targetFiles);
      } else {
        return this.getWorkingDirectoryChanges();
      }
    }
  }

  /**
   * Perform code analysis with optional subagent enhancement
   */
  private async performAnalysis(changes: string[]): Promise<ChangeAnalysis> {
    if (this.subagentIntegration) {
      try {
        console.log('Performing enhanced analysis with subagent...');
        const subagentOpId = this.usageTracker.startOperation('subagent');
        const result = await this.subagentIntegration.performEnhancedAnalysis(changes);
        
        // Get ACTUAL token usage from OpenAI API response
        const actualTokens = this.subagentIntegration.getLastTokensUsed();
        this.usageTracker.endOperation(subagentOpId, 'subagent', actualTokens);
        
        console.log(`Subagent used ${actualTokens} tokens (actual count from OpenAI)`);
        return result;
      } catch (error) {
        console.warn('Subagent analysis failed, falling back to local analysis:', error);
      }
    }
    
    console.log('Performing local analysis...');
    return await this.analyzer.analyze(changes);
  }

  /**
   * Process documentation requirements using templates
   */
  private async processDocumentationRequirements(
    requirements: DocumentationRequirement[],
    analysis: ChangeAnalysis
  ): Promise<DocumentationRequirement[]> {
    const processedRequirements: DocumentationRequirement[] = [];
    
    for (const requirement of requirements) {
      try {
        let content = requirement.content;
        
        // Apply templates based on requirement type
        if (requirement.type === 'api-spec') {
          content = await this.generateAPIDocumentation(analysis);
        } else if (requirement.type === 'readme-section') {
          content = await this.generateREADMEUpdate(analysis);
        }
        
        processedRequirements.push({
          ...requirement,
          content
        });
      } catch (error) {
        console.warn(`Failed to process requirement ${requirement.type}:`, error);
        // Include original requirement as fallback
        processedRequirements.push(requirement);
      }
    }
    
    return processedRequirements;
  }

  /**
   * Generate API documentation using templates
   */
  private async generateAPIDocumentation(analysis: ChangeAnalysis): Promise<string> {
    // Build comprehensive API documentation from analysis
    let content = `# API Documentation\n\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;

    // Document extracted APIs
    if (analysis.extractedAPIs.length > 0) {
      content += `## API Endpoints\n\n`;
      for (const api of analysis.extractedAPIs) {
        content += `### ${api.name}\n\n`;
        if (api.description) {
          content += `${api.description}\n\n`;
        }
        if (api.method) {
          content += `**Method:** \`${api.method}\`\n`;
        }
        if (api.path) {
          content += `**Path:** \`${api.path}\`\n`;
        }
        if (api.parameters && api.parameters.length > 0) {
          content += `\n**Parameters:**\n`;
          for (const param of api.parameters) {
            content += `- \`${param.name}\` (${param.type})${param.description ? ` - ${param.description}` : ''}\n`;
          }
        }
        if (api.returnType) {
          content += `\n**Returns:** \`${api.returnType}\`\n`;
        }
        content += '\n';
      }
    }

    // Document new features
    if (analysis.newFeatures.length > 0) {
      content += `## New Features\n\n`;
      for (const feature of analysis.newFeatures) {
        content += `### ${feature.name}\n\n`;
        content += `${feature.description}\n\n`;
        if (feature.category) {
          content += `**Category:** ${feature.category}\n`;
        }
        if (feature.affectedFiles && feature.affectedFiles.length > 0) {
          content += `**Affected Files:** ${feature.affectedFiles.join(', ')}\n`;
        }
        content += '\n';
      }
    }

    // Document architectural changes
    if (analysis.architecturalChanges.length > 0) {
      content += `## Architectural Changes\n\n`;
      for (const change of analysis.architecturalChanges) {
        content += `### ${change.component}\n\n`;
        content += `**Type:** ${change.type}\n`;
        content += `**Impact:** ${change.impact}\n\n`;
        content += `${change.description}\n\n`;
      }
    }

    // Document changed files
    if (analysis.changedFiles.length > 0) {
      content += `## Changed Files\n\n`;
      for (const file of analysis.changedFiles) {
        content += `- \`${file.path}\``;
        if (file.changeType) {
          content += ` (${file.changeType})`;
        }
        content += '\n';
      }
      content += '\n';
    }

    return content;
  }

  /**
   * Generate README update content
   */
  private async generateREADMEUpdate(analysis: ChangeAnalysis): Promise<string> {
    let content = '';
    
    // Filter for meaningful features (not generic placeholders)
    const meaningfulFeatures = analysis.newFeatures.filter(f => 
      f.name && f.description && 
      f.description.length > 10 &&
      !f.description.toLowerCase().includes('with 0 methods')
    );
    
    // Filter for meaningful APIs
    const meaningfulAPIs = analysis.extractedAPIs.filter(api => 
      api.name && 
      (api.description || api.parameters?.length || api.returnType)
    );
    
    // Generate features content
    if (meaningfulFeatures.length > 0) {
      content += '**Features:**\n\n';
      for (const feature of meaningfulFeatures) {
        content += `- **${feature.name}**: ${feature.description}\n`;
      }
      content += '\n';
    }
    
    // Generate API content
    if (meaningfulAPIs.length > 0) {
      content += '**API:**\n\n';
      for (const api of meaningfulAPIs) {
        const params = api.parameters && api.parameters.length > 0 
          ? `(${api.parameters.map(p => p.type || p.name).join(', ')})` 
          : '()';
        const returnType = api.returnType && api.returnType !== 'void' ? ` → ${api.returnType}` : '';
        const desc = api.description || `${api.name} function`;
        content += `- **${api.name}**${params}${returnType}: ${desc}\n`;
      }
      content += '\n';
    }
    
    return content.trim();
  }

  /**
   * Create development log entry
   */
  private async createLogEntry(analysis: ChangeAnalysis, options: RunOptions): Promise<void> {
    try {
      const rationale = options.reason || `Automated sync triggered by ${options.triggerType}`;
      const logEntry = await this.logger.createLogEntry(analysis, rationale);
      await this.logger.storeLogEntry(logEntry);
      console.log(`Development log entry created: ${logEntry.id}`);
    } catch (error) {
      console.warn('Failed to create development log entry:', error);
    }
  }

  /**
   * Report execution results
   */
  private reportResults(writeResults: any[], executionTime: number): void {
    const successful = writeResults.filter(r => r.success).length;
    const failed = writeResults.filter(r => !r.success).length;
    
    console.log(`\nAuto-Doc-Sync System completed in ${executionTime}ms`);
    console.log(`Documentation updates: ${successful} successful, ${failed} failed`);
    
    if (failed > 0) {
      console.log('\nFailed updates:');
      writeResults.filter(r => !r.success).forEach(result => {
        console.log(`- ${result.filePath}: ${result.errors.join(', ')}`);
      });
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    const directories = [
      this.resolveWorkspacePath('.kiro'),
      this.resolveWorkspacePath('.kiro/specs'),
      this.resolveWorkspacePath(this.config.logging.logDirectory),
      this.resolveWorkspacePath(this.config.hooks.configPath),
      this.resolveWorkspacePath('.kiro/subagents')
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist, which is fine
      }
    }
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    const checks = [];

    // Check if subagent is healthy
    if (this.subagentIntegration) {
      checks.push(this.subagentIntegration.healthCheck());
    }

    // Wait for all health checks
    const results = await Promise.allSettled(checks);
    const failures = results.filter(r => r.status === 'rejected');
    
    if (failures.length > 0) {
      console.warn(`Health check warnings: ${failures.length} components may not be fully functional`);
    }
  }

  /**
   * Get git changes for the latest commit
   */
  private async getGitChanges(): Promise<string[]> {
    try {
      const { spawn } = require('child_process');
      return new Promise((resolve, reject) => {
        const git = spawn('git', ['diff', 'HEAD~1', 'HEAD']);
        let output = '';
        
        git.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        git.on('close', (code: number) => {
          if (code === 0) {
            resolve(output ? [output] : []);
          } else {
            reject(new Error(`Git diff failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.warn('Failed to get git changes, using empty changes:', error);
      return [];
    }
  }

  /**
   * Get changes for specific files
   */
  private async getFileChanges(filePaths: string[]): Promise<string[]> {
    const changes: string[] = [];
    
    for (const filePath of filePaths) {
      try {
        if (await this.fileExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          changes.push(`diff --git a/${filePath} b/${filePath}\n+++ b/${filePath}\n${content}`);
        }
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error);
      }
    }
    
    return changes;
  }

  /**
   * Get working directory changes (simplified implementation)
   */
  private async getWorkingDirectoryChanges(): Promise<string[]> {
    try {
      const { spawn } = require('child_process');
      return new Promise((resolve, reject) => {
        const git = spawn('git', ['diff']);
        let output = '';
        
        git.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        git.on('close', (code: number) => {
          if (code === 0) {
            resolve(output ? [output] : []);
          } else {
            // If git diff fails, try to analyze recent files
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.warn('Failed to get working directory changes:', error);
      return [];
    }
  }

  /**
   * End usage tracking session and display summary
   */
  private async endSessionWithSummary(): Promise<void> {
    try {
      const sessionMetrics = await this.usageTracker.endSession();
      if (sessionMetrics) {
        console.log('\n--- Usage Summary ---');
        console.log(`Session: ${sessionMetrics.sessionId}`);
        console.log(`Analysis runs: ${sessionMetrics.analysisRuns}`);
        console.log(`Files processed: ${sessionMetrics.filesProcessed}`);
        console.log(`Tokens consumed: ${sessionMetrics.tokensConsumed}`);
        console.log(`Estimated cost: $${sessionMetrics.estimatedCost.toFixed(4)}`);
        console.log(`Execution time: ${sessionMetrics.executionTimeMs}ms`);
        
        if (sessionMetrics.operationBreakdown.length > 0) {
          console.log('\nOperation breakdown:');
          for (const op of sessionMetrics.operationBreakdown) {
            console.log(`  ${op.type}: ${op.count} ops, ${op.durationMs}ms, $${op.cost.toFixed(4)}`);
          }
        }
        console.log('-------------------\n');
      }
    } catch (error) {
      console.warn('Failed to generate usage summary:', error);
    }
  }
}