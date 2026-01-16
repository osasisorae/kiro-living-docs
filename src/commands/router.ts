/**
 * Command router for the kiro-docs CLI
 * Handles argument parsing and command dispatch
 */

import {
  Command,
  CommandName,
  CommandRegistry,
  CommandResult,
  ParsedArgs,
  ExitCodes,
} from './types';

/**
 * Parses command-line arguments into a structured format
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2); // Skip node and script path
  const result: ParsedArgs = {
    command: '',
    options: {},
    positional: [],
  };

  if (args.length === 0) {
    return result;
  }

  let i = 0;

  // First non-flag argument is the command
  if (args[0] && !args[0].startsWith('-')) {
    result.command = args[0];
    i = 1;

    // Check for subcommand only for commands that support them
    // A subcommand is a non-flag arg that doesn't look like a file path
    const subcommandCommands = ['config', 'hooks', 'usage'];
    if (args[1] && !args[1].startsWith('-') && !args[1].includes('=') && 
        !args[1].includes('.') && !args[1].includes('/') &&
        subcommandCommands.includes(result.command)) {
      result.subcommand = args[1];
      i = 2;
    }
  }

  // Parse remaining arguments
  for (; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long option
      const [key, ...valueParts] = arg.slice(2).split('=');
      const value = valueParts.length > 0 ? valueParts.join('=') : true;
      result.options[key] = value;
    } else if (arg.startsWith('-') && arg.length === 2) {
      // Short option (e.g., -v)
      const key = arg.slice(1);
      // Check if next arg is the value
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        result.options[key] = args[++i];
      } else {
        result.options[key] = true;
      }
    } else {
      // Positional argument
      result.positional.push(arg);
    }
  }

  return result;
}

/**
 * Command router that manages command registration and dispatch
 */
export class CommandRouter {
  private commands: CommandRegistry = new Map();
  private defaultCommand?: Command;

  /**
   * Register a command handler
   */
  register(command: Command): void {
    this.commands.set(command.name as CommandName, command);
  }

  /**
   * Set a default command to run when no command is specified
   */
  setDefault(command: Command): void {
    this.defaultCommand = command;
  }

  /**
   * Get a registered command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name as CommandName);
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Route and execute a command based on parsed arguments
   */
  async route(args: ParsedArgs): Promise<CommandResult> {
    // Handle help flag
    if (args.options.help || args.options.h) {
      if (args.command) {
        return this.showCommandHelp(args.command);
      }
      return this.showGlobalHelp();
    }

    // Handle version flag
    if (args.options.version || args.options.v) {
      return this.showVersion();
    }

    // Find and execute command
    const commandName = args.command;
    
    if (!commandName) {
      if (this.defaultCommand) {
        return this.defaultCommand.execute(args);
      }
      return this.showGlobalHelp();
    }

    const command = this.commands.get(commandName as CommandName);
    
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}\nRun 'kiro-docs --help' for available commands.`,
        exitCode: ExitCodes.GENERAL_ERROR,
      };
    }

    try {
      return await command.execute(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Command '${commandName}' failed: ${message}`,
        exitCode: ExitCodes.GENERAL_ERROR,
      };
    }
  }

  /**
   * Display help for a specific command
   */
  private showCommandHelp(commandName: string): CommandResult {
    const command = this.commands.get(commandName as CommandName);
    
    if (!command) {
      return {
        success: false,
        message: `Unknown command: ${commandName}`,
        exitCode: ExitCodes.GENERAL_ERROR,
      };
    }

    const lines = [
      `Usage: kiro-docs ${command.name} [options]`,
      '',
      command.description,
      '',
      'Options:',
    ];

    for (const opt of command.options) {
      const alias = opt.alias ? `-${opt.alias}, ` : '    ';
      const required = opt.required ? ' (required)' : '';
      const defaultVal = opt.default !== undefined ? ` [default: ${opt.default}]` : '';
      lines.push(`  ${alias}--${opt.name}  ${opt.description}${required}${defaultVal}`);
    }

    lines.push('  -h, --help     Show this help message');

    console.log(lines.join('\n'));
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }

  /**
   * Display global help with all commands
   */
  private showGlobalHelp(): CommandResult {
    const lines = [
      'kiro-docs - Autonomous Documentation Synchronization CLI',
      '',
      'Usage: kiro-docs <command> [options]',
      '',
      'Commands:',
    ];

    for (const command of this.commands.values()) {
      lines.push(`  ${command.name.padEnd(12)} ${command.description}`);
    }

    lines.push('');
    lines.push('Options:');
    lines.push('  -h, --help     Show help for a command');
    lines.push('  -v, --version  Show version information');
    lines.push('');
    lines.push('Run \'kiro-docs <command> --help\' for more information on a command.');

    console.log(lines.join('\n'));
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }

  /**
   * Display version information
   */
  private showVersion(): CommandResult {
    try {
      const packageJson = require('../../package.json');
      console.log(`kiro-docs v${packageJson.version}`);
    } catch {
      console.log('kiro-docs v0.0.0');
    }
    return { success: true, exitCode: ExitCodes.SUCCESS };
  }
}

/**
 * Create and configure the default command router
 */
export function createRouter(): CommandRouter {
  return new CommandRouter();
}
