/**
 * Development logging system implementation
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { LogEntry, LogSession, LogConfig } from './types';
import { ChangeAnalysis } from '../types/index';

export class DevelopmentLogger {
  private config: LogConfig;
  private currentSession: LogSession | null = null;
  private activeSessions: Map<string, LogSession> = new Map();
  private gitContextCache: {
    branch?: string;
    commitHash?: string;
    author?: string;
    commitMessage?: string;
    stagedFiles?: string[];
    modifiedFiles?: string[];
    isGitRepo?: boolean;
    cacheTime: number;
  } = { cacheTime: 0 };
  private readonly CACHE_TTL = 5000; // 5 seconds cache

  constructor(config: LogConfig) {
    this.config = config;
  }

  /**
   * Creates a timestamped log entry from analysis results
   */
  async createLogEntry(
    analysis: ChangeAnalysis,
    rationale: string,
    sessionId?: string
  ): Promise<LogEntry> {
    const entryId = this.generateEntryId();
    const currentSessionId = sessionId || this.generateSessionId();
    
    const entry: LogEntry = {
      id: entryId,
      timestamp: new Date().toISOString(),
      sessionId: currentSessionId,
      changeDescriptions: this.extractChangeDescriptions(analysis),
      affectedFiles: this.extractAffectedFiles(analysis),
      rationale,
      metadata: {
        triggerType: analysis.triggerType,
        commitHash: this.extractCommitHash(),
        author: this.extractAuthor(),
        version: '1.0.0',
        analysisTime: Date.now()
      }
    };

    return entry;
  }


  /**
   * Gets the current session
   */
  getCurrentSession(): LogSession | null {
    return this.currentSession;
  }

  /**
   * Sets the current session
   */
  setCurrentSession(session: LogSession | null): void {
    this.currentSession = session;
    if (session) {
      this.activeSessions.set(session.sessionId, session);
    }
  }

  /**
   * Groups related changes in single sessions based on timing
   */
  async groupRelatedChanges(entries: LogEntry[]): Promise<LogEntry[]> {
    if (entries.length <= 1) return entries;

    const grouped: LogEntry[] = [];
    const groupingWindow = this.config.groupingTimeWindow * 60 * 1000; // Convert to milliseconds
    
    let currentGroup: LogEntry[] = [entries[0]];
    
    for (let i = 1; i < entries.length; i++) {
      const currentTime = new Date(entries[i].timestamp).getTime();
      const lastTime = new Date(currentGroup[currentGroup.length - 1].timestamp).getTime();
      
      if (currentTime - lastTime <= groupingWindow && 
          entries[i].sessionId === currentGroup[0].sessionId) {
        currentGroup.push(entries[i]);
      } else {
        // Finalize current group
        if (currentGroup.length > 1) {
          const groupedEntry = this.mergeEntries(currentGroup);
          grouped.push(groupedEntry);
        } else {
          grouped.push(currentGroup[0]);
        }
        currentGroup = [entries[i]];
      }
    }
    
    // Handle last group
    if (currentGroup.length > 1) {
      const groupedEntry = this.mergeEntries(currentGroup);
      grouped.push(groupedEntry);
    } else {
      grouped.push(currentGroup[0]);
    }
    
    return grouped;
  }

  /**
   * Stores log entries in .kiro/development-log/ directory
   */
  async storeLogEntry(entry: LogEntry): Promise<void> {
    await this.ensureLogDirectory();
    
    const logFileName = this.generateLogFileName(entry.timestamp);
    const logFilePath = join(this.config.logDirectory, logFileName);
    
    const formattedEntry = this.formatLogEntry(entry);
    
    try {
      // Check if file exists and append, otherwise create new
      const fileExists = await this.fileExists(logFilePath);
      if (fileExists) {
        await fs.appendFile(logFilePath, '\n' + formattedEntry);
      } else {
        await fs.writeFile(logFilePath, formattedEntry);
      }
    } catch (error) {
      throw new Error(`Failed to store log entry: ${error}`);
    }
  }

  /**
   * Formats log entry with consistent structure and metadata
   */
  private formatLogEntry(entry: LogEntry): string {
    const header = `## Log Entry: ${entry.id}`;
    const timestamp = `**Timestamp:** ${entry.timestamp}`;
    const sessionId = `**Session:** ${entry.sessionId}`;
    const triggerType = `**Trigger:** ${entry.metadata.triggerType}`;
    
    const changes = entry.changeDescriptions.length > 0 
      ? `**Changes:**\n${entry.changeDescriptions.map(desc => `- ${desc}`).join('\n')}`
      : '**Changes:** None';
    
    const files = entry.affectedFiles.length > 0
      ? `**Affected Files:**\n${entry.affectedFiles.map(file => `- ${file}`).join('\n')}`
      : '**Affected Files:** None';
    
    const rationale = `**Rationale:** ${entry.rationale}`;
    
    const metadata = [
      `**Metadata:**`,
      `- Author: ${entry.metadata.author || 'Unknown'}`,
      `- Commit: ${entry.metadata.commitHash || 'N/A'}`,
      `- Analysis Time: ${entry.metadata.analysisTime}ms`,
      `- Version: ${entry.metadata.version}`
    ].join('\n');

    const groupedInfo = entry.groupedChanges && entry.groupedChanges.length > 0
      ? `**Grouped Changes:** ${entry.groupedChanges.length} related entries`
      : '';

    return [header, timestamp, sessionId, triggerType, changes, files, rationale, metadata, groupedInfo]
      .filter(section => section.length > 0)
      .join('\n\n');
  }

  private extractChangeDescriptions(analysis: ChangeAnalysis): string[] {
    const descriptions: string[] = [];
    
    analysis.newFeatures.forEach(feature => {
      descriptions.push(`Added feature: ${feature.name} - ${feature.description}`);
    });
    
    analysis.architecturalChanges.forEach(change => {
      descriptions.push(`${change.type}: ${change.component} - ${change.description}`);
    });
    
    analysis.extractedAPIs.forEach(api => {
      descriptions.push(`API change: ${api.name} (${api.method || 'function'})`);
    });
    
    return descriptions;
  }

  private extractAffectedFiles(analysis: ChangeAnalysis): string[] {
    return analysis.changedFiles.map(file => file.path);
  }

  private mergeEntries(entries: LogEntry[]): LogEntry {
    const firstEntry = entries[0];
    const allChangeDescriptions = entries.flatMap(e => e.changeDescriptions);
    const allAffectedFiles = [...new Set(entries.flatMap(e => e.affectedFiles))];
    const combinedRationale = entries.map(e => e.rationale).join('; ');
    
    return {
      ...firstEntry,
      changeDescriptions: allChangeDescriptions,
      affectedFiles: allAffectedFiles,
      rationale: combinedRationale,
      groupedChanges: entries.slice(1),
      metadata: {
        ...firstEntry.metadata,
        analysisTime: entries.reduce((sum, e) => sum + e.metadata.analysisTime, 0)
      }
    };
  }

  private generateEntryId(): string {
    return `entry-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateLogFileName(timestamp: string): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0];
    return `dev-log-${dateStr}.md`;
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDirectory, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create log directory: ${error}`);
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }


  /**
   * Retrieves the current Git branch name
   */
  getBranch(): string | undefined {
    this.refreshGitCache();
    return this.gitContextCache.branch;
  }

  /**
   * Retrieves the latest commit message
   */
  getLatestCommitMessage(): string | undefined {
    this.refreshGitCache();
    return this.gitContextCache.commitMessage;
  }

  /**
   * Retrieves a list of staged files
   */
  getStagedFiles(): string[] {
    this.refreshGitCache();
    return this.gitContextCache.stagedFiles || [];
  }

  /**
   * Retrieves a list of modified but unstaged files
   */
  getModifiedFiles(): string[] {
    this.refreshGitCache();
    return this.gitContextCache.modifiedFiles || [];
  }

  /**
   * Checks if the current directory is within a Git repository
   */
  isGitRepository(): boolean {
    this.refreshGitCache();
    return this.gitContextCache.isGitRepo || false;
  }

  private extractCommitHash(): string | undefined {
    this.refreshGitCache();
    return this.gitContextCache.commitHash;
  }

  private extractAuthor(): string | undefined {
    this.refreshGitCache();
    return this.gitContextCache.author;
  }

  private refreshGitCache(): void {
    const now = Date.now();
    if (now - this.gitContextCache.cacheTime < this.CACHE_TTL) {
      return; // Cache is still valid
    }

    // Check if we're in a git repo first
    try {
      execSync('git rev-parse --is-inside-work-tree', { 
        timeout: 5000, 
        stdio: 'pipe',
        encoding: 'utf-8'
      });
      this.gitContextCache.isGitRepo = true;
    } catch {
      this.gitContextCache.isGitRepo = false;
      this.gitContextCache.cacheTime = now;
      return;
    }

    // Extract all git context
    try {
      this.gitContextCache.branch = execSync('git rev-parse --abbrev-ref HEAD', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch {
      this.gitContextCache.branch = undefined;
    }

    try {
      this.gitContextCache.commitHash = execSync('git rev-parse --short HEAD', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch {
      this.gitContextCache.commitHash = undefined;
    }

    try {
      this.gitContextCache.author = execSync('git config user.name', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch {
      this.gitContextCache.author = undefined;
    }

    try {
      this.gitContextCache.commitMessage = execSync('git log -1 --pretty=%B', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
    } catch {
      this.gitContextCache.commitMessage = undefined;
    }

    try {
      const staged = execSync('git diff --cached --name-only', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
      this.gitContextCache.stagedFiles = staged ? staged.split('\n').filter(f => f) : [];
    } catch {
      this.gitContextCache.stagedFiles = [];
    }

    try {
      const modified = execSync('git diff --name-only', {
        timeout: 5000,
        stdio: 'pipe',
        encoding: 'utf-8'
      }).trim();
      this.gitContextCache.modifiedFiles = modified ? modified.split('\n').filter(f => f) : [];
    } catch {
      this.gitContextCache.modifiedFiles = [];
    }

    this.gitContextCache.cacheTime = now;
  }
}
