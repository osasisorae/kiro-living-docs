/**
 * Development logging system exports
 */

export { DevelopmentLogger } from './logger';
export * from './types';

// Default configuration
export const DEFAULT_LOG_CONFIG = {
  logDirectory: '.kiro/development-log',
  maxEntriesPerFile: 50,
  retentionDays: 90,
  groupingTimeWindow: 30 // 30 minutes
};