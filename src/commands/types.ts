/**
 * Command infrastructure types for the kiro-docs CLI
 */

/**
 * Defines a single command option/flag
 */
export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: any;
}

/**
 * Result of parsing CLI arguments
 */
export interface ParsedArgs {
  command: string;
  subcommand?: string;
  options: Record<string, any>;
  positional: string[];
}

/**
 * Result returned by command execution
 */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: any;
  exitCode: number;
}

/**
 * Exit codes for CLI operations
 */
export const ExitCodes = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  CONFIGURATION_ERROR: 2,
  FILE_SYSTEM_ERROR: 3,
  VALIDATION_ERROR: 4,
} as const;

/**
 * Base interface for all CLI commands
 */
export interface Command {
  /** Command name (e.g., 'init', 'watch') */
  name: string;
  /** Brief description for help text */
  description: string;
  /** Available options for this command */
  options: CommandOption[];
  /** Execute the command with parsed arguments */
  execute(args: ParsedArgs): Promise<CommandResult>;
}

/**
 * Supported CLI commands
 */
export type CommandName = 'init' | 'watch' | 'generate' | 'sync' | 'config' | 'status';

/**
 * Map of command names to their implementations
 */
export type CommandRegistry = Map<CommandName, Command>;
