/**
 * Development logging system types
 */

export interface LogEntry {
  id: string;
  timestamp: string;
  sessionId: string;
  changeDescriptions: string[];
  affectedFiles: string[];
  rationale: string;
  metadata: LogMetadata;
  groupedChanges?: LogEntry[];
}

export interface LogMetadata {
  triggerType: 'git-hook' | 'manual';
  commitHash?: string;
  author?: string;
  version: string;
  analysisTime: number;
}

export interface LogSession {
  sessionId: string;
  startTime: string;
  endTime?: string;
  entries: LogEntry[];
  totalChanges: number;
}

export interface LogConfig {
  logDirectory: string;
  maxEntriesPerFile: number;
  retentionDays: number;
  groupingTimeWindow: number; // minutes
}

export interface LogFormatter {
  formatEntry(entry: LogEntry): string;
  formatSession(session: LogSession): string;
}