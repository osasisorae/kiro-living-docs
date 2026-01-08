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
    
    // Initialize subagent integration if enabled
    if (this.config.subagent.enabled) {
      try {
        this.subagentIntegration = new SubagentIntegration(
          this.config.analysis,
          this.config.subagent.configPath ? this.resolveWorkspacePath(this.config.subagent.configPath) : undefined
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
      
      // Initialize subagent configuration if needed
      if (this.config.subagent.enabled && !SubagentConfigManager.configExists()) {
        await SubagentConfigManager.initialize();
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
    console.log(`Starting Auto-Doc-Sync System (trigger: ${options.triggerType})`);

    try {
      // Step 1: Analyze code changes
      const changes = await this.detectChanges(options);
      if (changes.length === 0) {
        console.log('No changes detected, skipping documentation sync');
        return;
      }

      // Step 2: Perform analysis (with subagent enhancement if available)
      const analysis = await this.performAnalysis(changes);
      
      // Step 3: Generate documentation requirements
      const requirements = analysis.documentationRequirements;
      if (requirements.length === 0) {
        console.log('No documentation updates required');
        return;
      }

      // Step 4: Generate documentation content using templates
      const processedRequirements = await this.processDocumentationRequirements(requirements, analysis);
      
      // Step 5: Write documentation updates
      const writeResults = await this.outputManager.writeDocumentation(processedRequirements);
      
      // Step 6: Create development log entry
      await this.createLogEntry(analysis, options);
      
      // Step 7: Report results
      this.reportResults(writeResults, Date.now() - startTime);
      
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
        return await this.subagentIntegration.performEnhancedAnalysis(changes);
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
        } else if (requirement.type === 'dev-log') {
          content = await this.generateDevLogContent(analysis);
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
    const context = {
      variables: {
        apis: analysis.extractedAPIs,
        description: 'API documentation generated from code analysis',
        title: 'API Documentation'
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'Auto-Doc-Sync System'
      }
    };
    
    if (this.subagentIntegration) {
      try {
        return await this.subagentIntegration.generateDocumentation(
          analysis,
          'api-doc',
          this.resolveWorkspacePath('.kiro/specs/api.md')
        );
      } catch (error) {
        console.warn('Subagent documentation generation failed, using template engine:', error);
      }
    }
    
    return await this.templateEngine.render('api-doc', context);
  }

  /**
   * Generate README update content
   */
  private async generateREADMEUpdate(analysis: ChangeAnalysis): Promise<string> {
    // Generate meaningful content based on actual analysis
    let content = '';
    
    // Only add sections if we have meaningful content
    const meaningfulFeatures = analysis.newFeatures.filter(f => 
      f.name && f.description && 
      !f.description.toLowerCase().includes('enhanced functionality') &&
      !f.description.toLowerCase().includes('updated') &&
      !f.description.toLowerCase().includes('with 0 methods') &&
      f.description.length > 20
    );
    
    const meaningfulAPIs = analysis.extractedAPIs.filter(api => 
      api.name && api.description && 
      !api.description.toLowerCase().includes('api endpoint') &&
      !api.description.toLowerCase().includes('updated') &&
      !api.description.toLowerCase().includes('with 0 methods') &&
      api.description.length > 10
    );
    
    // Generate features content without nested headers
    if (meaningfulFeatures.length > 0) {
      content += '**Features:**\n\n';
      for (const feature of meaningfulFeatures) {
        content += `- **${feature.name}**: ${feature.description}\n`;
      }
      content += '\n';
    }
    
    // Generate API content without nested headers
    if (meaningfulAPIs.length > 0) {
      content += '**API:**\n\n';
      for (const api of meaningfulAPIs) {
        const params = api.parameters && api.parameters.length > 0 
          ? `(${api.parameters.map(p => `${p.name}: ${p.type}`).join(', ')})` 
          : '()';
        const returnType = api.returnType && api.returnType !== 'void' ? ` → ${api.returnType}` : '';
        content += `- **${api.name}${params}**${returnType}: ${api.description}\n`;
      }
      content += '\n';
    }
    
    // If no meaningful content, return empty string to avoid updating
    if (!content.trim()) {
      return '';
    }
    
    return content.trim();
  }

  /**
   * Generate development log content
   */
  private async generateDevLogContent(analysis: ChangeAnalysis): Promise<string> {
    const logEntry = await this.logger.createLogEntry(
      analysis,
      'Automated documentation sync'
    );
    
    return `# Development Log Entry\n\n${JSON.stringify(logEntry, null, 2)}`;
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
}