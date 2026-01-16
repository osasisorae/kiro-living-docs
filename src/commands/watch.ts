/**
 * WatchCommand - Watch for file changes and auto-update documentation
 * Implements Requirement 2: Watch Mode for Automatic Documentation Updates
 */

import { Command, CommandResult, ParsedArgs, ExitCodes } from './types';
import { FileWatcher, FileChangeEvent, createFileWatcher } from '../services/fileWatcher';
import { AutoDocSyncSystem } from '../orchestrator';
import { ConfigManager } from '../config';
import * as fs from 'fs';
import * as path from 'path';

export interface WatchOptions {
  debounceMs: number;
  verbose: boolean;
  workspace: string;
  config?: string;
}

export interface WatchState {
  isRunning: boolean;
  changesProcessed: number;
  lastChangeTime?: Date;
  errors: WatchError[];
  startTime: Date;
}

export interface WatchError {
  file: string;
  error: string;
  timestamp: Date;
}

/**
 * WatchCommand manages file watching and automatic documentation updates
 */
export class WatchCommand implements Command {
  name = 'watch';
  description = 'Watch for file changes and auto-update documentation';
  options = [
    { name: 'debounce', description: 'Debounce time in milliseconds', type: 'number' as const, default: 500 },
    { name: 'verbose', alias: 'v', description: 'Show detailed output', type: 'boolean' as const },
    { name: 'workspace', alias: 'w', description: 'Workspace root directory', type: 'string' as const },
    { name: 'config', alias: 'c', description: 'Path to configuration file', type: 'string' as const },
  ];

  private watcher: FileWatcher | null = null;
  private state: WatchState = {
    isRunning: false,
    changesProcessed: 0,
    errors: [],
    startTime: new Date(),
  };
  private system: AutoDocSyncSystem | null = null;
  private verbose = false;
  private isProcessing = false;
  private pendingFiles: Set<string> = new Set();

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const options = this.parseOptions(args);
    this.verbose = options.verbose;

    // Check if initialized
    const kiroDir = path.join(options.workspace, '.kiro');
    if (!fs.existsSync(kiroDir)) {
      console.error('❌ Auto-doc is not initialized in this directory.');
      console.error('   Run `kiro-docs init` first to set up auto-doc.');
      return { success: false, exitCode: ExitCodes.CONFIGURATION_ERROR };
    }

    // Load configuration
    const config = ConfigManager.loadConfig(options.config);
    
    // Initialize the doc sync system
    this.system = new AutoDocSyncSystem(options.config, options.workspace);

    // Create file watcher
    this.watcher = createFileWatcher({
      patterns: config.analysis.includePatterns,
      excludePatterns: config.analysis.excludePatterns,
      debounceMs: options.debounceMs,
      cwd: options.workspace,
    });

    // Set up event handlers
    this.setupEventHandlers(options);

    // Set up graceful shutdown
    this.setupShutdownHandlers();

    // Start watching
    console.log('👀 Starting watch mode...');
    console.log(`   Watching: ${config.analysis.includePatterns.join(', ')}`);
    console.log(`   Excluding: ${config.analysis.excludePatterns.join(', ')}`);
    console.log(`   Debounce: ${options.debounceMs}ms`);
    console.log('');
    console.log('Press Ctrl+C to stop watching.\n');

    this.state = {
      isRunning: true,
      changesProcessed: 0,
      errors: [],
      startTime: new Date(),
    };

    return new Promise((resolve) => {
      this.watcher!.on('ready', () => {
        console.log('✅ Watcher ready. Listening for changes...\n');
      });

      this.watcher!.on('error', (error) => {
        console.error('❌ Watcher error:', error);
      });

      // Start the watcher
      this.watcher!.start();

      // Keep the process running until shutdown
      // The promise will be resolved by the shutdown handler
      (this as any).resolveWatch = resolve;
    });
  }

  /**
   * Parse command options from arguments
   */
  private parseOptions(args: ParsedArgs): WatchOptions {
    return {
      debounceMs: Number(args.options.debounce) || 500,
      verbose: Boolean(args.options.verbose || args.options.v),
      workspace: args.options.workspace || args.options.w || process.cwd(),
      config: args.options.config || args.options.c,
    };
  }

  /**
   * Set up event handlers for file changes
   */
  private setupEventHandlers(options: WatchOptions): void {
    this.watcher!.onFileChange(async (event) => {
      await this.handleFileChange(event, options);
    });
  }

  /**
   * Handle a file change event
   */
  private async handleFileChange(event: FileChangeEvent, options: WatchOptions): Promise<void> {
    this.state.lastChangeTime = event.timestamp;

    const icon = event.type === 'add' ? '➕' : event.type === 'unlink' ? '➖' : '📝';
    console.log(`${icon} ${event.type}: ${event.path}`);

    // Add to pending files
    this.pendingFiles.add(event.path);

    // If already processing, the file will be picked up in the next batch
    if (this.isProcessing) {
      if (this.verbose) {
        console.log('   (queued for next batch)');
      }
      return;
    }

    // Process the change
    await this.processChanges(options);
  }

  /**
   * Process pending file changes
   */
  private async processChanges(options: WatchOptions): Promise<void> {
    if (this.pendingFiles.size === 0 || !this.system) {
      return;
    }

    this.isProcessing = true;
    const filesToProcess = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    try {
      console.log(`\n🔄 Processing ${filesToProcess.length} file(s)...`);
      
      if (this.verbose) {
        for (const file of filesToProcess) {
          console.log(`   - ${file}`);
        }
      }

      await this.system.run({
        triggerType: 'manual',
        targetFiles: filesToProcess,
        reason: 'Watch mode auto-sync',
      });

      this.state.changesProcessed += filesToProcess.length;
      console.log(`✅ Documentation updated (${this.state.changesProcessed} total changes processed)\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error processing changes: ${errorMessage}`);
      
      // Log error but continue watching
      for (const file of filesToProcess) {
        this.state.errors.push({
          file,
          error: errorMessage,
          timestamp: new Date(),
        });
      }

      if (this.verbose && error instanceof Error && error.stack) {
        console.error(error.stack);
      }

      console.log('   Continuing to watch for changes...\n');
    } finally {
      this.isProcessing = false;

      // Check if more files were queued while processing
      if (this.pendingFiles.size > 0) {
        await this.processChanges(options);
      }
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async () => {
      await this.gracefulShutdown();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  /**
   * Gracefully shutdown the watcher
   */
  private async gracefulShutdown(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    console.log('\n\n🛑 Shutting down watch mode...');
    this.state.isRunning = false;

    // Stop the watcher
    if (this.watcher) {
      await this.watcher.stop();
    }

    // Display summary
    this.displaySummary();

    // Resolve the watch promise
    if ((this as any).resolveWatch) {
      (this as any).resolveWatch({
        success: true,
        data: this.state,
        exitCode: ExitCodes.SUCCESS,
      });
    }
  }

  /**
   * Display watch session summary
   */
  private displaySummary(): void {
    const duration = Date.now() - this.state.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    console.log('\n📊 Watch Session Summary');
    console.log('─'.repeat(40));
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Changes processed: ${this.state.changesProcessed}`);
    console.log(`   Errors: ${this.state.errors.length}`);

    if (this.state.errors.length > 0 && this.verbose) {
      console.log('\n   Recent errors:');
      const recentErrors = this.state.errors.slice(-5);
      for (const error of recentErrors) {
        console.log(`   - ${error.file}: ${error.error}`);
      }
    }

    console.log('─'.repeat(40));
    console.log('');
  }
}
