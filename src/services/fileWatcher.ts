/**
 * FileWatcher service with debouncing
 * Monitors file system changes and triggers callbacks
 * 
 * Implements Requirements 2.1, 2.5
 */

import * as chokidar from 'chokidar';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface FileWatcherConfig {
  patterns: string[];
  excludePatterns: string[];
  debounceMs: number;
  cwd?: string;
}

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export type FileChangeCallback = (event: FileChangeEvent) => void | Promise<void>;

/**
 * FileWatcher monitors file system changes with debouncing support
 */
export class FileWatcher extends EventEmitter {
  private config: FileWatcherConfig;
  private watcher: chokidar.FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingChanges: Map<string, FileChangeEvent> = new Map();
  private isRunning = false;
  private changeCallbacks: FileChangeCallback[] = [];

  constructor(config: FileWatcherConfig) {
    super();
    this.config = {
      ...config,
      cwd: config.cwd || process.cwd(),
    };
  }

  /**
   * Start watching for file changes
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    // Convert glob patterns to watch paths
    // chokidar works better with directory paths than glob patterns when using cwd
    const watchPaths = this.config.patterns.map(pattern => {
      // Extract the base directory from glob patterns
      // e.g., "**/*.ts" -> ".", "src/**/*.ts" -> "src"
      const parts = pattern.split('/');
      const baseDir = parts[0] === '**' ? '.' : parts[0];
      return baseDir;
    });
    
    // Deduplicate watch paths
    const uniquePaths = [...new Set(watchPaths)];

    this.watcher = chokidar.watch(uniquePaths, {
      ignored: (filePath: string) => {
        // Check exclude patterns
        for (const pattern of this.config.excludePatterns) {
          if (this.matchesPattern(filePath, pattern)) {
            return true;
          }
        }
        // Check if file matches include patterns (for file extension filtering)
        const hasMatchingExtension = this.config.patterns.some(pattern => {
          const ext = pattern.match(/\*(\.[a-z]+)$/i)?.[1];
          return ext ? filePath.endsWith(ext) : true;
        });
        // Ignore if it's a file that doesn't match our extensions
        if (filePath.includes('.') && !hasMatchingExtension) {
          return true;
        }
        return false;
      },
      persistent: true,
      ignoreInitial: true,
      cwd: this.config.cwd,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 20,
      },
      usePolling: true, // More reliable for cross-platform support
      interval: 100,
    });

    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => this.emit('error', error))
      .on('ready', () => {
        this.isRunning = true;
        this.emit('ready');
      });
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.watcher) {
      return;
    }

    // Clear all pending debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Flush any pending changes
    await this.flushPendingChanges();

    await this.watcher.close();
    this.watcher = null;
    this.isRunning = false;
    this.emit('stop');
  }

  /**
   * Register a callback for file changes
   */
  onFileChange(callback: FileChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Remove a file change callback
   */
  offFileChange(callback: FileChangeCallback): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index !== -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * Check if watcher is running
   */
  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Get count of pending changes (for testing)
   */
  get pendingChangeCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * Handle a file event with debouncing
   */
  private handleFileEvent(type: 'add' | 'change' | 'unlink', filePath: string): void {
    const event: FileChangeEvent = {
      type,
      path: filePath,
      timestamp: new Date(),
    };

    // Store the latest event for this file
    this.pendingChanges.set(filePath, event);

    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.processPendingChange(filePath);
    }, this.config.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process a pending change after debounce period
   */
  private async processPendingChange(filePath: string): Promise<void> {
    const event = this.pendingChanges.get(filePath);
    if (!event) {
      return;
    }

    // Remove from pending
    this.pendingChanges.delete(filePath);
    this.debounceTimers.delete(filePath);

    // Emit event
    this.emit('change', event);

    // Call registered callbacks
    for (const callback of this.changeCallbacks) {
      try {
        await callback(event);
      } catch (error) {
        this.emit('error', error);
      }
    }
  }

  /**
   * Flush all pending changes immediately
   */
  private async flushPendingChanges(): Promise<void> {
    const pendingPaths = Array.from(this.pendingChanges.keys());
    
    for (const filePath of pendingPaths) {
      await this.processPendingChange(filePath);
    }
  }

  /**
   * Get watched paths (for testing/debugging)
   */
  getWatchedPaths(): string[] {
    if (!this.watcher) {
      return [];
    }
    
    const watched = this.watcher.getWatched();
    const paths: string[] = [];
    
    for (const [dir, files] of Object.entries(watched)) {
      for (const file of files) {
        paths.push(path.join(dir, file));
      }
    }
    
    return paths;
  }

  /**
   * Check if a path matches a glob-like pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple pattern matching for common cases
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '{{GLOBSTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/{{GLOBSTAR}}/g, '.*')
      .replace(/\./g, '\\.')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(regexPattern);
    return regex.test(filePath);
  }
}

/**
 * Create a FileWatcher with default configuration
 */
export function createFileWatcher(config: Partial<FileWatcherConfig> = {}): FileWatcher {
  const defaultConfig: FileWatcherConfig = {
    patterns: ['src/**/*.ts', 'src/**/*.js'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/*.test.*'],
    debounceMs: 500,
    ...config,
  };

  return new FileWatcher(defaultConfig);
}
