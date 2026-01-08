/**
 * Command-line interface for manual hook triggering
 */

import { HookManager } from './manager.js';
import { ManualTriggerOptions } from './types.js';

export class HookCLI {
  private hookManager: HookManager;

  constructor(hookManager: HookManager) {
    this.hookManager = hookManager;
  }

  /**
   * Parse command line arguments and execute manual trigger
   */
  async executeFromCLI(args: string[]): Promise<void> {
    const options = this.parseArguments(args);
    
    if (options.help) {
      this.showHelp();
      return;
    }

    if (!options.hookName) {
      console.error('Error: Hook name is required');
      this.showHelp();
      process.exit(1);
    }

    try {
      console.log(`Triggering hook: ${options.hookName}`);
      const result = await this.hookManager.triggerManual(options.hookName, {
        targetFiles: options.targetFiles,
        reason: options.reason,
        options: options.additionalOptions
      });

      if (result.success) {
        console.log(`✅ Hook executed successfully in ${result.duration}ms`);
        if (result.output) {
          console.log('Output:', result.output);
        }
      } else {
        console.error(`❌ Hook execution failed: ${result.error}`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error executing hook:', error);
      process.exit(1);
    }
  }

  private parseArguments(args: string[]): CLIOptions {
    const options: CLIOptions = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--help':
        case '-h':
          options.help = true;
          break;
        case '--hook':
        case '-k':
          options.hookName = args[++i];
          break;
        case '--reason':
        case '-r':
          options.reason = args[++i];
          break;
        case '--files':
        case '-f':
          options.targetFiles = args[++i]?.split(',') || [];
          break;
        case '--option':
        case '-o':
          const optionPair = args[++i];
          if (optionPair && optionPair.includes('=')) {
            const [key, value] = optionPair.split('=', 2);
            options.additionalOptions = options.additionalOptions || {};
            options.additionalOptions[key] = value;
          }
          break;
      }
    }
    
    return options;
  }

  private showHelp(): void {
    console.log(`
Auto-Doc-Sync Hook CLI

Usage: node cli.js [options]

Options:
  --hook, -k <name>        Hook name to execute (required)
  --reason, -r <reason>    Reason for manual trigger
  --files, -f <files>      Comma-separated list of target files
  --option, -o <key=value> Additional options (can be used multiple times)
  --help, -h               Show this help message

Examples:
  node cli.js --hook auto-doc-sync-manual --reason "Update API docs"
  node cli.js -k auto-doc-sync-manual -f "src/api.ts,src/types.ts" -r "API changes"
  node cli.js -k auto-doc-sync-manual -o "verbose=true" -o "format=json"
`);
  }
}

interface CLIOptions {
  help?: boolean;
  hookName?: string;
  reason?: string;
  targetFiles?: string[];
  additionalOptions?: Record<string, string>;
}

// CLI entry point
export async function runCLI(): Promise<void> {
  const hookManager = new HookManager();
  await hookManager.loadHookConfigs();
  
  const cli = new HookCLI(hookManager);
  await cli.executeFromCLI(process.argv.slice(2));
}