#!/usr/bin/env node

/**
 * Command-line interface for manual triggering of the Auto-Doc-Sync System
 */

import { AutoDocSyncSystem } from './orchestrator';

interface CLIOptions {
  trigger: 'git-hook' | 'manual';
  config?: string;
  files?: string[];
  reason?: string;
  help?: boolean;
  version?: boolean;
}

function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    trigger: 'manual'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--version' || arg === '-v') {
      options.version = true;
    } else if (arg.startsWith('--trigger=')) {
      const value = arg.split('=')[1] as 'git-hook' | 'manual';
      if (value === 'git-hook' || value === 'manual') {
        options.trigger = value;
      } else {
        throw new Error(`Invalid trigger type: ${value}. Must be 'git-hook' or 'manual'`);
      }
    } else if (arg.startsWith('--config=')) {
      options.config = arg.split('=')[1];
    } else if (arg.startsWith('--reason=')) {
      options.reason = arg.split('=')[1];
    } else if (arg.startsWith('--file=')) {
      if (!options.files) options.files = [];
      options.files.push(arg.split('=')[1]);
    } else if (arg.startsWith('--files=')) {
      options.files = arg.split('=')[1].split(',');
    } else if (!arg.startsWith('-')) {
      // Treat non-flag arguments as files
      if (!options.files) options.files = [];
      options.files.push(arg);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Auto-Doc-Sync System - Autonomous Documentation Synchronization

USAGE:
  auto-doc-sync [OPTIONS] [FILES...]

OPTIONS:
  --trigger=TYPE        Trigger type: 'manual' (default) or 'git-hook'
  --config=PATH         Path to configuration file
  --reason=TEXT         Reason for manual trigger (for logging)
  --file=PATH           Specific file to analyze (can be used multiple times)
  --files=PATH1,PATH2   Comma-separated list of files to analyze
  -h, --help           Show this help message
  -v, --version        Show version information

EXAMPLES:
  # Manual trigger for all changes
  auto-doc-sync

  # Manual trigger with specific files
  auto-doc-sync src/api.ts src/types.ts

  # Manual trigger with reason
  auto-doc-sync --reason="Updated API documentation"

  # Git hook trigger (typically called by git hooks)
  auto-doc-sync --trigger=git-hook

  # Use custom configuration
  auto-doc-sync --config=./my-config.json

CONFIGURATION:
  The system looks for configuration in the following order:
  1. File specified by --config option
  2. .kiro/auto-doc-sync.json
  3. Default configuration

  Configuration file format:
  {
    "analysis": {
      "includePatterns": ["**/*.ts", "**/*.js"],
      "excludePatterns": ["**/node_modules/**"],
      "maxFileSize": 1048576,
      "analysisDepth": "deep"
    },
    "output": {
      "preserveFormatting": true,
      "backupFiles": true,
      "validateOutput": true
    },
    "subagent": {
      "enabled": true,
      "configPath": ".kiro/subagents/doc-analysis-agent.json"
    },
    "hooks": {
      "enabled": true,
      "configPath": ".kiro/hooks"
    }
  }

DIRECTORIES:
  The system creates and uses the following directories:
  - .kiro/specs/           - Technical specifications
  - .kiro/development-log/ - Development log entries
  - .kiro/hooks/          - Hook configurations
  - .kiro/subagents/      - Subagent configurations

For more information, visit: https://github.com/your-org/auto-doc-sync
`);
}

function showVersion(): void {
  const packageJson = require('../package.json');
  console.log(`Auto-Doc-Sync System v${packageJson.version}`);
}

async function main(): Promise<void> {
  try {
    const options = parseArguments();

    if (options.help) {
      showHelp();
      return;
    }

    if (options.version) {
      showVersion();
      return;
    }

    console.log('🚀 Starting Auto-Doc-Sync System...');
    
    const system = new AutoDocSyncSystem(options.config);
    
    await system.run({
      triggerType: options.trigger,
      configPath: options.config,
      targetFiles: options.files,
      reason: options.reason
    });

    console.log('✅ Auto-Doc-Sync System completed successfully');
  } catch (error) {
    console.error('❌ Auto-Doc-Sync System failed:');
    
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      
      // Show stack trace in debug mode
      if (process.env.DEBUG || process.env.NODE_ENV === 'development') {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(`   ${String(error)}`);
    }
    
    console.error('\nFor help, run: auto-doc-sync --help');
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

export { main as runCLI };