/**
 * WatchCommand - Watch for file changes and auto-update documentation
 * Implements Requirement 2: Watch Mode for Automatic Documentation Updates
 * 
 * BEHAVIOR: Accumulates all file changes during the watch session, then
 * processes them all at once when the user stops watching (Ctrl+C).
 * This minimizes API calls and costs by batching all changes together.
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

export interface TrackedChange {
  path: string;
  type: 'add' | 'change' | 'unlink';
  firstSeen: Date;
  lastSeen: Date;
  changeCount: number;
}

export interface WatchState {
  isRunning: boolean;
  trackedChanges: Map<string, TrackedChange>;
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
 * WatchCommand manages file watching and accumulates changes for batch processing
 * Changes are only processed when the user stops watching (Ctrl+C)
 */
export class WatchCommand implements Command {
  name = 'watch';
  description = 'Watch for file changes and auto-update documentation on exit';
  options = [
    { name: 'debounce', description: 'Debounce time in milliseconds', type: 'number' as const, default: 500 },
    { name: 'verbose', alias: 'v', description: 'Show detailed output', type: 'boolean' as const },
    { name: 'workspace', alias: 'w', description: 'Workspace root directory', type: 'string' as const },
    { name: 'config', alias: 'c', description: 'Path to configuration file', type: 'string' as const },
  ];

  private watcher: FileWatcher | null = null;
  private state: WatchState = {
    isRunning: false,
    trackedChanges: new Map(),
    errors: [],
    startTime: new Date(),
  };
  private system: AutoDocSyncSystem | null = null;
  private verbose = false;
  private workspaceRoot = '';

  async execute(args: ParsedArgs): Promise<CommandResult> {
    const options = this.parseOptions(args);
    this.verbose = options.verbose;
    this.workspaceRoot = options.workspace;

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
    this.setupEventHandlers();

    // Set up graceful shutdown
    this.setupShutdownHandlers();

    // Start watching
    console.log('👀 Starting watch mode...');
    console.log(`   Watching: ${config.analysis.includePatterns.join(', ')}`);
    console.log(`   Excluding: ${config.analysis.excludePatterns.join(', ')}`);
    console.log('');
    console.log('📝 Changes will be accumulated and processed when you stop watching.');
    console.log('Press Ctrl+C to stop watching and process all changes.\n');

    this.state = {
      isRunning: true,
      trackedChanges: new Map(),
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
   * Set up event handlers for file changes - just track, don't process
   */
  private setupEventHandlers(): void {
    this.watcher!.onFileChange(async (event) => {
      this.trackChange(event);
    });
  }

  /**
   * Track a file change event (accumulate for later processing)
   */
  private trackChange(event: FileChangeEvent): void {
    this.state.lastChangeTime = event.timestamp;

    const icon = event.type === 'add' ? '➕' : event.type === 'unlink' ? '🗑️' : '📝';
    
    const existing = this.state.trackedChanges.get(event.path);
    
    if (existing) {
      // Update existing tracked change
      existing.lastSeen = event.timestamp;
      existing.changeCount++;
      // If file was deleted then re-added, update the type
      if (event.type !== existing.type) {
        existing.type = event.type;
      }
      
      if (this.verbose) {
        console.log(`${icon} ${event.type}: ${event.path} (${existing.changeCount} changes)`);
      }
    } else {
      // Track new change
      this.state.trackedChanges.set(event.path, {
        path: event.path,
        type: event.type,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        changeCount: 1,
      });
      
      console.log(`${icon} ${event.type}: ${event.path}`);
    }

    // Show running total
    const total = this.state.trackedChanges.size;
    console.log(`   📊 ${total} file(s) tracked for processing\n`);
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    let isShuttingDown = false;
    
    const shutdown = async (signal: string) => {
      // Prevent multiple shutdown attempts
      if (isShuttingDown) {
        return;
      }
      isShuttingDown = true;
      
      console.log(`\n\n🛑 Received ${signal}, processing accumulated changes...`);
      await this.gracefulShutdown();
    };

    // Handle SIGINT (Ctrl+C) - prevent default exit behavior
    process.on('SIGINT', () => {
      shutdown('SIGINT').catch(console.error);
    });
    
    process.on('SIGTERM', () => {
      shutdown('SIGTERM').catch(console.error);
    });
  }

  /**
   * Gracefully shutdown the watcher and process all accumulated changes
   */
  private async gracefulShutdown(): Promise<void> {
    if (!this.state.isRunning) {
      return;
    }

    this.state.isRunning = false;

    // Stop the watcher first
    if (this.watcher) {
      await this.watcher.stop();
    }

    // Process all accumulated changes
    await this.processAccumulatedChanges();

    // Display summary
    this.displaySummary();

    // Resolve the watch promise
    if ((this as any).resolveWatch) {
      (this as any).resolveWatch({
        success: true,
        data: {
          filesProcessed: this.state.trackedChanges.size,
          errors: this.state.errors,
        },
        exitCode: ExitCodes.SUCCESS,
      });
    }
  }

  /**
   * Process all accumulated changes in a single batch
   */
  private async processAccumulatedChanges(): Promise<void> {
    const trackedFiles = Array.from(this.state.trackedChanges.values());
    
    if (trackedFiles.length === 0) {
      console.log('\n📭 No changes detected during watch session.\n');
      return;
    }

    // Filter out deleted files - we only want to process files that exist
    const filesToProcess = trackedFiles
      .filter(change => change.type !== 'unlink')
      .map(change => {
        // Convert to absolute path if needed
        const filePath = path.isAbsolute(change.path) 
          ? change.path 
          : path.join(this.workspaceRoot, change.path);
        return filePath;
      })
      .filter(filePath => fs.existsSync(filePath));

    if (filesToProcess.length === 0) {
      console.log('\n📭 No processable files (all were deleted).\n');
      return;
    }

    console.log(`\n🔄 Processing ${filesToProcess.length} file(s) in batch...`);
    
    if (this.verbose) {
      console.log('\nFiles to process:');
      for (const file of filesToProcess) {
        const relativePath = path.relative(this.workspaceRoot, file);
        const change = this.state.trackedChanges.get(relativePath) || 
                       this.state.trackedChanges.get(file);
        const changeCount = change?.changeCount || 1;
        console.log(`   - ${relativePath} (${changeCount} change${changeCount > 1 ? 's' : ''})`);
      }
      console.log('');
    }

    if (!this.system) {
      console.error('❌ System not initialized');
      return;
    }

    try {
      await this.system.run({
        triggerType: 'manual',
        targetFiles: filesToProcess,
        reason: `Watch mode batch sync - ${filesToProcess.length} files`,
      });

      console.log(`\n✅ Documentation updated successfully!\n`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Error processing changes: ${errorMessage}`);
      
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
    }
  }

  /**
   * Display watch session summary
   */
  private displaySummary(): void {
    const duration = Date.now() - this.state.startTime.getTime();
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);

    const trackedFiles = Array.from(this.state.trackedChanges.values());
    const totalChanges = trackedFiles.reduce((sum, f) => sum + f.changeCount, 0);
    const addedFiles = trackedFiles.filter(f => f.type === 'add').length;
    const modifiedFiles = trackedFiles.filter(f => f.type === 'change').length;
    const deletedFiles = trackedFiles.filter(f => f.type === 'unlink').length;

    console.log('\n📊 Watch Session Summary');
    console.log('─'.repeat(40));
    console.log(`   Duration: ${minutes}m ${seconds}s`);
    console.log(`   Files tracked: ${trackedFiles.length}`);
    console.log(`   Total changes: ${totalChanges}`);
    console.log(`     ➕ Added: ${addedFiles}`);
    console.log(`     📝 Modified: ${modifiedFiles}`);
    console.log(`     🗑️  Deleted: ${deletedFiles}`);
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
