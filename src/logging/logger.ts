/**
 * Development logging system implementation
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { LogEntry, LogSession, LogConfig, LogMetadata } from './types.js';
import { ChangeAnalysis } from '../types/index.js';

export class DevelopmentLogger {
  private config: LogConfig;
  private currentSession: LogSession | null = null;
  private activeSessions: Map<string, LogSession> = new Map();

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
    return `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

  private extractCommitHash(): string | undefined {
    // This would typically extract from git context
    // For now, return undefined as placeholder
    return undefined;
  }

  private extractAuthor(): string | undefined {
    // This would typically extract from git context
    // For now, return undefined as placeholder
    return undefined;
  }
}