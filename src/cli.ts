#!/usr/bin/env node

/**
 * Command-line interface for the Auto-Doc-Sync System
 * Supports both new kiro-docs commands and legacy auto-doc-sync usage
 */

import { AutoDocSyncSystem } from './orchestrator';
import { runUsageCLI } from './usage/cli';
import { installGitHooks, uninstallGitHooks, checkGitHooks } from './hooks/install-git-hooks';
import { CommandRouter, parseArgs, createRouter } from './commands';
import { Command, CommandResult, ParsedArgs, ExitCodes } from './commands/types';
import { InitCommand } from './commands/init';
import { WatchCommand } from './commands/watch';

/**
 * Legacy command for backward compatibility with auto-doc-sync
 */
class LegacyCommand implements Command {
  name = 'legacy';
  description = 'Run the legacy auto-doc-sync system';
  options = [
    { name: 'trigger', alias: 't', description: 'Trigger type', type: 'string' as const, default: 'manual' },
    { name: 'config', alias: 'c', description: 'Path to configuration file', type: 'string' as const },
    { name: 'workspace', alias: 'w', description: 'Workspace root directory', type: 'string' as const },
    { name: 'reason', alias: 'r', description: 'Reason for manual trigger', type: 'string' as const },
    { name: 'files', description: 'Files to analyze', type: 'string' as const },
  ];

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const trigger = (args.options.trigger || 'manual') as 'git-hook' | 'manual';
    const config = args.options.config as string | undefined;
    const workspace = args.options.workspace as string | undefined;
    const reason = args.options.reason as string | undefined;
    
    // Collect files from options and positional args
    let files: string[] | undefined;
    if (args.options.files) {
      files = String(args.options.files).split(',');
    }
    if (args.positional.length > 0) {
      files = [...(files || []), ...args.positional];
    }

    console.log('🚀 Starting Auto-Doc-Sync System...');
    
    const system = new AutoDocSyncSystem(config, workspace);
    
    await system.run({
      triggerType: trigger,
      configPath: config,
      targetFiles: files,
      reason: reason
    });

    console.log('✅ Auto-Doc-Sync System completed successfully');
    
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }
}

/**
 * Usage command wrapper
 */
class UsageCommand implements Command {
  name = 'usage';
  description = 'Show usage statistics and cost projections';
  options = [];

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const subcommand = args.subcommand || 'summary';
    const commandArgs = args.positional;
    await runUsageCLI(subcommand, commandArgs);
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }
}

/**
 * Hooks command wrapper (git hooks, not Kiro hooks)
 */
class HooksCommand implements Command {
  name = 'hooks';
  description = 'Manage git hooks for automatic doc sync';
  options = [
    { name: 'force', alias: 'f', description: 'Force installation', type: 'boolean' as const },
  ];

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const subcommand = args.subcommand;
    const force = Boolean(args.options.force);

    switch (subcommand) {
      case 'install':
        await installGitHooks({ force });
        break;
      case 'uninstall':
        await uninstallGitHooks();
        break;
      case 'check':
        await checkGitHooks();
        break;
      default:
        console.error(`❌ Unknown hooks command: ${subcommand}`);
        console.error('Available commands: install, uninstall, check');
        return { success: false, exitCode: ExitCodes.GENERAL_ERROR };
    }
    
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }
}

/**
 * Placeholder commands for new kiro-docs functionality
 * These will be implemented in subsequent tasks
 */

class GenerateCommand implements Command {
  name = 'generate';
  description = 'Generate documentation from source files';
  options = [
    { name: 'files', description: 'Specific files to analyze', type: 'string' as const },
    { name: 'type', description: 'Documentation type (api, readme, changelog, all)', type: 'string' as const, default: 'all' },
    { name: 'preview', description: 'Preview changes without writing files', type: 'boolean' as const },
  ];

  async execute(_args: ParsedArgs): Promise<CommandResult> {
    console.log('⚠️  Generate command not yet implemented');
    return { success: false, message: 'Not implemented', exitCode: ExitCodes.GENERAL_ERROR };
  }
}

class SyncCommand implements Command {
  name = 'sync';
  description = 'Sync documentation with current codebase';
  options = [
    { name: 'force', alias: 'f', description: 'Overwrite without prompting', type: 'boolean' as const },
    { name: 'dry-run', description: 'Show changes without applying', type: 'boolean' as const },
  ];

  async execute(_args: ParsedArgs): Promise<CommandResult> {
    console.log('⚠️  Sync command not yet implemented');
    return { success: false, message: 'Not implemented', exitCode: ExitCodes.GENERAL_ERROR };
  }
}

class ConfigCommand implements Command {
  name = 'config';
  description = 'Manage auto-doc configuration';
  options = [];

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const subcommand = args.subcommand;
    
    switch (subcommand) {
      case 'show':
      case 'set':
      case 'validate':
      case 'reset':
        console.log(`⚠️  Config ${subcommand} not yet implemented`);
        return { success: false, message: 'Not implemented', exitCode: ExitCodes.GENERAL_ERROR };
      default:
        console.error('Usage: kiro-docs config <show|set|validate|reset>');
        return { success: false, exitCode: ExitCodes.GENERAL_ERROR };
    }
  }
}

class StatusCommand implements Command {
  name = 'status';
  description = 'Show auto-doc status and diagnostics';
  options = [
    { name: 'verbose', alias: 'v', description: 'Show detailed status', type: 'boolean' as const },
  ];

  async execute(_args: ParsedArgs): Promise<CommandResult> {
    console.log('⚠️  Status command not yet implemented');
    return { success: false, message: 'Not implemented', exitCode: ExitCodes.GENERAL_ERROR };
  }
}

/**
 * Set up the command router with all commands
 */
function setupRouter(): CommandRouter {
  const router = createRouter();
  
  // Register new kiro-docs commands
  router.register(new InitCommand());
  router.register(new WatchCommand());
  router.register(new GenerateCommand());
  router.register(new SyncCommand());
  router.register(new ConfigCommand());
  router.register(new StatusCommand());
  
  // Register legacy/utility commands
  router.register(new UsageCommand());
  router.register(new HooksCommand());
  
  // Set legacy command as default for backward compatibility
  router.setDefault(new LegacyCommand());
  
  return router;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  try {
    const router = setupRouter();
    const args = parseArgs(process.argv);
    
    const result = await router.route(args);
    
    if (!result.success && result.message) {
      console.error(result.message);
    }
    
    process.exit(result.exitCode);
  } catch (error) {
    console.error('❌ CLI failed:');
    
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      
      if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    
    console.error('\nFor help, run: kiro-docs --help');
    process.exit(1);
  }
}

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}

export { main as runCLI, setupRouter };
