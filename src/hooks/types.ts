/**
 * Hook-specific types
 */

export interface HookConfig {
  name: string;
  trigger: 'git-commit' | 'manual';
  enabled: boolean;
  timeout: number;
}

export interface HookContext {
  triggerType: 'git-hook' | 'manual';
  timestamp: string;
  metadata: Record<string, any>;
}