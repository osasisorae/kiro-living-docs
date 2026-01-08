/**
 * Kiro Hooks Integration - Hook system for triggering documentation updates
 */

export * from './types';
export * from './manager';
export * from './cli';
export * from './config-generator';

// Re-export commonly used functions
export { runCLI } from './cli';