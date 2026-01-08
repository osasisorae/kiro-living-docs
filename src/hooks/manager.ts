/**
 * Hook manager implementation for Kiro Hook system integration
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { 
  HookConfig, 
  HookContext, 
  HookExecutionResult, 
  HookTemplate, 
  ManualTriggerOptions,
  GitContext,
  ManualContext,
  HookMetadata
} from './types';
import { DevelopmentLogger } from '../logging/logger';
import { DEFAULT_LOG_CONFIG } from '../logging/index';

export class HookManager {
  private hooks: Map<string, HookConfig> = new Map();
  private logger: DevelopmentLogger;
  private executionResults: Map<string, HookExecutionResult> = new Map();

  constructor(logDirectory: string = DEFAULT_LOG_CONFIG.logDirectory) {
    this.logger = new DevelopmentLogger({
      ...DEFAULT_LOG_CONFIG,
      logDirectory
    });
  }

  /**
   * Register a hook configuration
   */
  registerHook(config: HookConfig): void {
    this.hooks.set(config.name, config);
  }

  /**
   * Execute a hook with comprehensive logging
   */
  async executeHook(name: string, context: HookContext): Promise<HookExecutionResult> {
    const startTime = new Date().toISOString();
    const executionId = this.generateExecutionId();
    
    const hook = this.hooks.get(name);
    if (!hook) {
      const error = `Hook '${name}' not found`;
      const result = this.createFailureResult(executionId, startTime, error, context);
      await this.logHookExecution(result);
      return result;
    }

    if (!hook.enabled) {
      const error = `Hook '${name}' is disabled`;
      const result = this.createFailureResult(executionId, startTime, error, context);
      await this.logHookExecution(result);
      return result;
    }

    try {
      const result = await this.executeHookCommand(hook, context, executionId, startTime);
      await this.logHookExecution(result);
      this.executionResults.set(executionId, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result = this.createFailureResult(executionId, startTime, errorMessage, context);
      await this.logHookExecution(result);
      return result;
    }
  }

  /**
   * Create manual trigger command interface
   */
  async triggerManual(hookName: string, options: ManualTriggerOptions = {}): Promise<HookExecutionResult> {
    const context = this.createManualContext(options);
    return this.executeHook(hookName, context);
  }

  /**
   * Create git hook trigger context
   */
  async triggerGitHook(hookName: string, gitContext: GitContext): Promise<HookExecutionResult> {
    const context = this.createGitContext(gitContext);
    return this.executeHook(hookName, context);
  }

  /**
   * Get hook configuration templates for common scenarios
   */
  getHookTemplates(): HookTemplate[] {
    return [
      {
        name: 'auto-doc-sync-post-commit',
        description: 'Automatically sync documentation after git commits',
        trigger: 'git-commit',
        command: 'node dist/index.js --trigger=git-hook',
        workingDirectory: process.cwd(),
        environment: {
          NODE_ENV: 'production',
          AUTO_DOC_SYNC: 'true'
        },
        timeout: 30000,
        enabled: true
      },
      {
        name: 'auto-doc-sync-manual',
        description: 'Manual documentation sync trigger',
        trigger: 'manual',
        command: 'node dist/index.js --trigger=manual',
        workingDirectory: process.cwd(),
        environment: {
          NODE_ENV: 'production',
          AUTO_DOC_SYNC: 'true'
        },
        timeout: 60000,
        enabled: true
      }
    ];
  }

  /**
   * Create hook configuration from template
   */
  createHookFromTemplate(templateName: string, customizations: Partial<HookConfig> = {}): HookConfig {
    const template = this.getHookTemplates().find(t => t.name === templateName);
    if (!template) {
      throw new Error(`Hook template '${templateName}' not found`);
    }

    return {
      name: template.name,
      trigger: template.trigger,
      enabled: template.enabled,
      timeout: template.timeout,
      command: template.command,
      workingDirectory: template.workingDirectory,
      environment: template.environment,
      ...customizations
    };
  }

  /**
   * Save hook configuration to .kiro directory
   */
  async saveHookConfig(config: HookConfig, configPath: string = '.kiro/hooks'): Promise<void> {
    await fs.mkdir(configPath, { recursive: true });
    const configFile = join(configPath, `${config.name}.json`);
    await fs.writeFile(configFile, JSON.stringify(config, null, 2));
  }

  /**
   * Load hook configurations from .kiro directory
   */
  async loadHookConfigs(configPath: string = '.kiro/hooks'): Promise<void> {
    try {
      const files = await fs.readdir(configPath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      for (const file of jsonFiles) {
        const configFile = join(configPath, file);
        const configData = await fs.readFile(configFile, 'utf-8');
        const config: HookConfig = JSON.parse(configData);
        this.registerHook(config);
      }
    } catch (error) {
      // Directory doesn't exist or no configs - this is fine
    }
  }

  /**
   * Get execution results for analysis
   */
  getExecutionResults(): HookExecutionResult[] {
    return Array.from(this.executionResults.values());
  }

  /**
   * Get execution result by ID
   */
  getExecutionResult(executionId: string): HookExecutionResult | undefined {
    return this.executionResults.get(executionId);
  }

  private async executeHookCommand(
    hook: HookConfig, 
    context: HookContext, 
    executionId: string, 
    startTime: string
  ): Promise<HookExecutionResult> {
    return new Promise((resolve, reject) => {
      if (!hook.command) {
        reject(new Error('Hook command not specified'));
        return;
      }

      const [command, ...args] = hook.command.split(' ');
      const options = {
        cwd: hook.workingDirectory || process.cwd(),
        env: { ...process.env, ...hook.environment },
        timeout: hook.timeout
      };

      let output = '';
      let errorOutput = '';

      const child = spawn(command, args, options);

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        const endTime = new Date().toISOString();
        const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

        const result: HookExecutionResult = {
          success: code === 0,
          executionId,
          startTime,
          endTime,
          duration,
          output: output || undefined,
          error: code !== 0 ? errorOutput || `Process exited with code ${code}` : undefined,
          context
        };

        resolve(result);
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  private createManualContext(options: ManualTriggerOptions): HookContext {
    const timestamp = new Date().toISOString();
    const sessionId = this.generateSessionId();
    const executionId = this.generateExecutionId();

    const manualContext: ManualContext = {
      userId: process.env.USER || 'unknown',
      reason: options.reason || 'Manual trigger',
      targetFiles: options.targetFiles,
      options: options.options
    };

    const metadata: HookMetadata = {
      sessionId,
      executionId,
      workingDirectory: process.cwd(),
      environment: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>
    };

    return {
      triggerType: 'manual',
      timestamp,
      metadata,
      manualContext
    };
  }

  private createGitContext(gitContext: GitContext): HookContext {
    const timestamp = new Date().toISOString();
    const sessionId = this.generateSessionId();
    const executionId = this.generateExecutionId();

    const metadata: HookMetadata = {
      sessionId,
      executionId,
      workingDirectory: process.cwd(),
      environment: Object.fromEntries(
        Object.entries(process.env).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>
    };

    return {
      triggerType: 'git-hook',
      timestamp,
      metadata,
      gitContext
    };
  }

  private createFailureResult(
    executionId: string, 
    startTime: string, 
    error: string, 
    context: HookContext
  ): HookExecutionResult {
    const endTime = new Date().toISOString();
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

    return {
      success: false,
      executionId,
      startTime,
      endTime,
      duration,
      error,
      context
    };
  }

  private async logHookExecution(result: HookExecutionResult): Promise<void> {
    try {
      // Create a simplified log entry for hook execution
      const logMessage = `Hook execution ${result.success ? 'succeeded' : 'failed'}: ${result.executionId}`;
      const details = [
        `Duration: ${result.duration}ms`,
        `Trigger: ${result.context.triggerType}`,
        result.output ? `Output: ${result.output.substring(0, 200)}...` : '',
        result.error ? `Error: ${result.error}` : ''
      ].filter(Boolean).join('\n');

      // For now, just log to console - in a full implementation this would integrate with the logging system
      console.log(`[Hook Manager] ${logMessage}\n${details}`);
    } catch (error) {
      console.error('Failed to log hook execution:', error);
    }
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}