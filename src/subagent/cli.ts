#!/usr/bin/env node

/**
 * CLI utility for managing Subagent configuration
 */

import { SubagentConfigManager } from './config-manager';
import { SubagentClient } from './client';
import { SubagentContext } from './types';

interface CLIOptions {
  command: string;
  args: string[];
}

class SubagentCLI {
  async run(options: CLIOptions): Promise<void> {
    const { command, args } = options;

    try {
      switch (command) {
        case 'init':
          await this.initializeSubagent(args[0]);
          break;
        case 'validate':
          await this.validateConfiguration(args[0]);
          break;
        case 'test':
          await this.testSubagent(args[0]);
          break;
        case 'config':
          await this.showConfiguration(args[0]);
          break;
        case 'update':
          await this.updateConfiguration(args[0], args[1], args[2]);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  private async initializeSubagent(projectPath?: string): Promise<void> {
    console.log('Initializing Subagent configuration...');
    
    await SubagentConfigManager.initialize(projectPath);
    
    console.log('✅ Subagent configuration initialized successfully');
    console.log(`Configuration file created at: ${SubagentConfigManager.getConfigPath(projectPath)}`);
  }

  private async validateConfiguration(configPath?: string): Promise<void> {
    console.log('Validating Subagent configuration...');
    
    try {
      const config = SubagentConfigManager.loadConfig(configPath);
      const validation = SubagentConfigManager.validateConfig(config);
      
      if (validation.valid) {
        console.log('✅ Configuration is valid');
      } else {
        console.log('❌ Configuration validation failed:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  }

  private async testSubagent(configPath?: string): Promise<void> {
    console.log('Testing Subagent connection...');
    
    try {
      const context: SubagentContext = {
        projectPath: process.cwd()
      };

      const client = new SubagentClient(configPath, context);
      
      // Test basic functionality
      const testResponse = await client.analyzeCode({
        changes: ['// test change'],
        filePaths: ['test.ts'],
        diffContent: '// test diff content'
      });

      console.log('✅ Subagent test successful');
      console.log('Response:', JSON.stringify(testResponse, null, 2));
    } catch (error) {
      console.error('❌ Subagent test failed:', error);
      process.exit(1);
    }
  }

  private async showConfiguration(configPath?: string): Promise<void> {
    try {
      const config = SubagentConfigManager.loadConfig(configPath);
      console.log('Current Subagent Configuration:');
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  }

  private async updateConfiguration(field: string, value: string, configPath?: string): Promise<void> {
    if (!field || !value) {
      console.error('Usage: update <field> <value> [configPath]');
      process.exit(1);
    }

    try {
      // Parse the field path (e.g., "configuration.temperature")
      const fieldParts = field.split('.');
      const updates: any = {};
      
      let current = updates;
      for (let i = 0; i < fieldParts.length - 1; i++) {
        current[fieldParts[i]] = {};
        current = current[fieldParts[i]];
      }
      
      // Try to parse value as JSON, fallback to string
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = value;
      }
      
      current[fieldParts[fieldParts.length - 1]] = parsedValue;

      SubagentConfigManager.updateConfig(updates, configPath);
      console.log(`✅ Configuration updated: ${field} = ${value}`);
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
      process.exit(1);
    }
  }

  private showHelp(): void {
    console.log(`
Subagent Configuration CLI

Usage: subagent-cli <command> [options]

Commands:
  init [projectPath]              Initialize Subagent configuration
  validate [configPath]           Validate configuration file
  test [configPath]               Test Subagent connection
  config [configPath]             Show current configuration
  update <field> <value> [path]   Update configuration field

Examples:
  subagent-cli init
  subagent-cli validate
  subagent-cli test
  subagent-cli config
  subagent-cli update configuration.temperature 0.2
  subagent-cli update prompts.system "New system prompt"

Configuration Path:
  Default: .kiro/subagents/doc-analysis-agent.json
    `);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const remainingArgs = args.slice(1);

  const cli = new SubagentCLI();
  cli.run({ command, args: remainingArgs });
}

export { SubagentCLI };