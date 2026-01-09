/**
 * Hook-specific types
 */

export interface HookConfig {
  name: string;
  trigger: 'git-commit' | 'manual';
  enabled: boolean;
  timeout: number;
  command?: string | string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
}

export interface HookContext {
  triggerType: 'git-hook' | 'manual';
  timestamp: string;
  metadata: HookMetadata;
  gitContext?: GitContext;
  manualContext?: ManualContext;
}

export interface HookMetadata {
  sessionId: string;
  executionId: string;
  workingDirectory: string;
  environment: Record<string, string>;
  [key: string]: any;
}

export interface GitContext {
  commitHash?: string;
  author?: string;
  message?: string;
  changedFiles?: string[];
  branch?: string;
}

export interface ManualContext {
  userId?: string;
  reason?: string;
  targetFiles?: string[];
  options?: Record<string, any>;
}

export interface HookExecutionResult {
  success: boolean;
  executionId: string;
  startTime: string;
  endTime: string;
  duration: number;
  output?: string;
  error?: string;
  context: HookContext;
}

export interface HookTemplate {
  name: string;
  description: string;
  trigger: 'git-commit' | 'manual';
  command: string | string[];
  workingDirectory: string;
  environment: Record<string, string>;
  timeout: number;
  enabled: boolean;
}

export interface ManualTriggerOptions {
  targetFiles?: string[];
  reason?: string;
  options?: Record<string, any>;
}