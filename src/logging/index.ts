/**
 * Development logging system exports
 */

export { DevelopmentLogger } from './logger.js';
export * from './types.js';

// Default configuration
export const DEFAULT_LOG_CONFIG = {
  logDirectory: '.kiro/development-log',
  maxEntriesPerFile: 50,
  retentionDays: 90,
  groupingTimeWindow: 30 // 30 minutes
};