/**
 * Configuration loading and validation for the Auto-Doc-Sync System
 */

import * as fs from 'fs';
import * as path from 'path';
import { SystemConfig } from './orchestrator';
import { DEFAULT_LOG_CONFIG } from './logging';
import { DEFAULT_USAGE_CONFIG } from './usage';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigManager {
  private static readonly CONFIG_PATHS = [
    '.kiro/auto-doc-sync.json',
    'auto-doc-sync.config.json',
    '.auto-doc-sync.json'
  ];

  /**
   * Load configuration from file or use defaults
   */
  static loadConfig(configPath?: string): SystemConfig {
    const defaultConfig = this.getDefaultConfig();

    if (configPath) {
      return this.loadConfigFromPath(configPath, defaultConfig);
    }

    // Try to find configuration file in standard locations
    for (const standardPath of this.CONFIG_PATHS) {
      if (fs.existsSync(standardPath)) {
        return this.loadConfigFromPath(standardPath, defaultConfig);
      }
    }

    console.log('No configuration file found, using default configuration');
    return defaultConfig;
  }

  /**
   * Load configuration from specific path
   */
  private static loadConfigFromPath(configPath: string, defaultConfig: SystemConfig): SystemConfig {
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      const configContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);

      const validation = this.validateConfig(userConfig);
      if (!validation.valid) {
        console.warn(`Configuration validation failed for ${configPath}:`);
        validation.errors.forEach(error => console.warn(`  - ${error}`));
        console.warn('Using default configuration');
        return defaultConfig;
      }

      if (validation.warnings.length > 0) {
        console.warn(`Configuration warnings for ${configPath}:`);
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }

      console.log(`Loaded configuration from ${configPath}`);
      return this.mergeConfigs(defaultConfig, userConfig);
    } catch (error) {
      console.warn(`Failed to load configuration from ${configPath}:`, error);
      console.warn('Using default configuration');
      return defaultConfig;
    }
  }

  /**
   * Get default system configuration
   */
  static getDefaultConfig(): SystemConfig {
    return {
      workspaceRoot: process.cwd(),
      analysis: {
        includePatterns: [
          '**/*.ts',
          '**/*.js',
          '**/*.tsx',
          '**/*.jsx'
        ],
        excludePatterns: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/*.test.*',
          '**/*.spec.*',
          '**/*.d.ts'
        ],
        maxFileSize: 1024 * 1024, // 1MB
        analysisDepth: 'deep'
      },
      output: {
        preserveFormatting: true,
        backupFiles: true,
        validateOutput: true
      },
      logging: {
        ...DEFAULT_LOG_CONFIG
      },
      usage: {
        ...DEFAULT_USAGE_CONFIG
      },
      subagent: {
        enabled: true,
        configPath: '.kiro/subagents/doc-analysis-agent.json'
      },
      hooks: {
        enabled: true,
        configPath: '.kiro/hooks'
      }
    };
  }

  /**
   * Validate configuration object
   */
  static validateConfig(config: any): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate workspace root
    if (config.workspaceRoot && typeof config.workspaceRoot !== 'string') {
      errors.push('workspaceRoot must be a string');
    }

    // Validate analysis configuration
    if (config.analysis) {
      if (config.analysis.includePatterns && !Array.isArray(config.analysis.includePatterns)) {
        errors.push('analysis.includePatterns must be an array');
      }
      if (config.analysis.excludePatterns && !Array.isArray(config.analysis.excludePatterns)) {
        errors.push('analysis.excludePatterns must be an array');
      }
      if (config.analysis.maxFileSize && typeof config.analysis.maxFileSize !== 'number') {
        errors.push('analysis.maxFileSize must be a number');
      }
      if (config.analysis.analysisDepth && !['shallow', 'deep'].includes(config.analysis.analysisDepth)) {
        errors.push('analysis.analysisDepth must be "shallow" or "deep"');
      }
    }

    // Validate output configuration
    if (config.output) {
      if (config.output.preserveFormatting !== undefined && typeof config.output.preserveFormatting !== 'boolean') {
        errors.push('output.preserveFormatting must be a boolean');
      }
      if (config.output.backupFiles !== undefined && typeof config.output.backupFiles !== 'boolean') {
        errors.push('output.backupFiles must be a boolean');
      }
      if (config.output.validateOutput !== undefined && typeof config.output.validateOutput !== 'boolean') {
        errors.push('output.validateOutput must be a boolean');
      }
    }

    // Validate logging configuration
    if (config.logging) {
      if (config.logging.logDirectory && typeof config.logging.logDirectory !== 'string') {
        errors.push('logging.logDirectory must be a string');
      }
      if (config.logging.maxEntriesPerFile && typeof config.logging.maxEntriesPerFile !== 'number') {
        errors.push('logging.maxEntriesPerFile must be a number');
      }
      if (config.logging.retentionDays && typeof config.logging.retentionDays !== 'number') {
        errors.push('logging.retentionDays must be a number');
      }
      if (config.logging.groupingTimeWindow && typeof config.logging.groupingTimeWindow !== 'number') {
        errors.push('logging.groupingTimeWindow must be a number');
      }
    }

    // Validate usage configuration
    if (config.usage) {
      if (config.usage.enabled !== undefined && typeof config.usage.enabled !== 'boolean') {
        errors.push('usage.enabled must be a boolean');
      }
      if (config.usage.dataDirectory && typeof config.usage.dataDirectory !== 'string') {
        errors.push('usage.dataDirectory must be a string');
      }
      if (config.usage.inputTokenCostPer1K && typeof config.usage.inputTokenCostPer1K !== 'number') {
        errors.push('usage.inputTokenCostPer1K must be a number');
      }
      if (config.usage.outputTokenCostPer1K && typeof config.usage.outputTokenCostPer1K !== 'number') {
        errors.push('usage.outputTokenCostPer1K must be a number');
      }
      if (config.usage.costWarningThreshold && typeof config.usage.costWarningThreshold !== 'number') {
        errors.push('usage.costWarningThreshold must be a number');
      }
      if (config.usage.costLimitPerSession && typeof config.usage.costLimitPerSession !== 'number') {
        errors.push('usage.costLimitPerSession must be a number');
      }
      if (config.usage.retentionDays && typeof config.usage.retentionDays !== 'number') {
        errors.push('usage.retentionDays must be a number');
      }
    }

    // Validate subagent configuration
    if (config.subagent) {
      if (config.subagent.enabled !== undefined && typeof config.subagent.enabled !== 'boolean') {
        errors.push('subagent.enabled must be a boolean');
      }
      if (config.subagent.configPath && typeof config.subagent.configPath !== 'string') {
        errors.push('subagent.configPath must be a string');
      }
      if (config.subagent.enabled && config.subagent.configPath && !fs.existsSync(config.subagent.configPath)) {
        warnings.push(`subagent.configPath file does not exist: ${config.subagent.configPath}`);
      }
    }

    // Validate hooks configuration
    if (config.hooks) {
      if (config.hooks.enabled !== undefined && typeof config.hooks.enabled !== 'boolean') {
        errors.push('hooks.enabled must be a boolean');
      }
      if (config.hooks.configPath && typeof config.hooks.configPath !== 'string') {
        errors.push('hooks.configPath must be a string');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Merge user configuration with defaults
   */
  private static mergeConfigs(defaultConfig: SystemConfig, userConfig: any): SystemConfig {
    return {
      workspaceRoot: userConfig.workspaceRoot || defaultConfig.workspaceRoot,
      analysis: {
        ...defaultConfig.analysis,
        ...userConfig.analysis
      },
      output: {
        ...defaultConfig.output,
        ...userConfig.output
      },
      logging: {
        ...defaultConfig.logging,
        ...userConfig.logging
      },
      usage: {
        ...defaultConfig.usage,
        ...userConfig.usage
      },
      subagent: {
        ...defaultConfig.subagent,
        ...userConfig.subagent
      },
      hooks: {
        ...defaultConfig.hooks,
        ...userConfig.hooks
      }
    };
  }

  /**
   * Save configuration to file
   */
  static saveConfig(config: SystemConfig, configPath: string = '.kiro/auto-doc-sync.json'): void {
    try {
      const dir = path.dirname(configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`Configuration saved to ${configPath}`);
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  /**
   * Create example configuration file
   */
  static createExampleConfig(outputPath: string = '.kiro/auto-doc-sync.example.json'): void {
    const exampleConfig = {
      ...this.getDefaultConfig(),
      // Add comments as properties (will be ignored by JSON.parse but visible in file)
      _comments: {
        analysis: "Configuration for code analysis engine",
        output: "Configuration for documentation output",
        logging: "Configuration for development logging",
        subagent: "Configuration for AI subagent integration",
        hooks: "Configuration for Kiro hooks integration"
      }
    };

    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(exampleConfig, null, 2));
      console.log(`Example configuration created at ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to create example configuration: ${error}`);
    }
  }
}// change3 Fri Jan 16 23:53:52 WAT 2026
// change2 Fri Jan 16 23:55:27 WAT 2026
// test change 1768604212973
