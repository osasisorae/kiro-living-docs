/**
 * Unit tests for command router and argument parsing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArgs, CommandRouter, createRouter } from './router';
import { Command, CommandResult, ParsedArgs, ExitCodes } from './types';

describe('parseArgs', () => {
  it('should parse command name', () => {
    const result = parseArgs(['node', 'cli.js', 'init']);
    expect(result.command).toBe('init');
  });

  it('should parse command with subcommand', () => {
    const result = parseArgs(['node', 'cli.js', 'config', 'show']);
    expect(result.command).toBe('config');
    expect(result.subcommand).toBe('show');
  });

  it('should parse long options with values', () => {
    const result = parseArgs(['node', 'cli.js', 'init', '--template=minimal']);
    expect(result.options.template).toBe('minimal');
  });

  it('should parse boolean flags', () => {
    const result = parseArgs(['node', 'cli.js', 'init', '--dry-run']);
    expect(result.options['dry-run']).toBe(true);
  });

  it('should parse short options', () => {
    const result = parseArgs(['node', 'cli.js', 'init', '-f']);
    expect(result.options.f).toBe(true);
  });

  it('should parse short options with values', () => {
    const result = parseArgs(['node', 'cli.js', 'init', '-t', 'minimal']);
    expect(result.options.t).toBe('minimal');
  });

  it('should parse positional arguments', () => {
    const result = parseArgs(['node', 'cli.js', 'generate', 'file1.ts', 'file2.ts']);
    expect(result.positional).toEqual(['file1.ts', 'file2.ts']);
  });

  it('should handle mixed options and positional args', () => {
    const result = parseArgs(['node', 'cli.js', 'generate', '--type=api', 'file1.ts', '--preview']);
    expect(result.command).toBe('generate');
    expect(result.options.type).toBe('api');
    expect(result.options.preview).toBe(true);
    expect(result.positional).toEqual(['file1.ts']);
  });

  it('should return empty command when no args', () => {
    const result = parseArgs(['node', 'cli.js']);
    expect(result.command).toBe('');
  });

  it('should handle help flag', () => {
    const result = parseArgs(['node', 'cli.js', '--help']);
    expect(result.options.help).toBe(true);
  });

  it('should handle version flag', () => {
    const result = parseArgs(['node', 'cli.js', '-v']);
    expect(result.options.v).toBe(true);
  });

  it('should handle options with equals sign in value', () => {
    const result = parseArgs(['node', 'cli.js', 'config', 'set', '--key=analysis.maxFileSize=1024']);
    expect(result.options.key).toBe('analysis.maxFileSize=1024');
  });
});

describe('CommandRouter', () => {
  let router: CommandRouter;
  let mockCommand: Command;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    router = createRouter();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    mockCommand = {
      name: 'test',
      description: 'Test command',
      options: [
        { name: 'flag', alias: 'f', description: 'A flag', type: 'boolean' },
      ],
      execute: vi.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    };
  });

  it('should register and retrieve commands', () => {
    router.register(mockCommand);
    expect(router.getCommand('test')).toBe(mockCommand);
  });

  it('should return undefined for unregistered commands', () => {
    expect(router.getCommand('nonexistent')).toBeUndefined();
  });

  it('should route to registered command', async () => {
    router.register(mockCommand);
    const args: ParsedArgs = { command: 'test', options: {}, positional: [] };
    
    await router.route(args);
    
    expect(mockCommand.execute).toHaveBeenCalledWith(args);
  });

  it('should return error for unknown command', async () => {
    const args: ParsedArgs = { command: 'unknown', options: {}, positional: [] };
    
    const result = await router.route(args);
    
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(ExitCodes.GENERAL_ERROR);
    expect(result.message).toContain('Unknown command');
  });

  it('should show global help when --help flag is set', async () => {
    router.register(mockCommand);
    const args: ParsedArgs = { command: '', options: { help: true }, positional: [] };
    
    const result = await router.route(args);
    
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should show command help when command and --help flag are set', async () => {
    router.register(mockCommand);
    const args: ParsedArgs = { command: 'test', options: { help: true }, positional: [] };
    
    const result = await router.route(args);
    
    expect(result.success).toBe(true);
    expect(mockCommand.execute).not.toHaveBeenCalled();
  });

  it('should show version when --version flag is set', async () => {
    const args: ParsedArgs = { command: '', options: { version: true }, positional: [] };
    
    const result = await router.route(args);
    
    expect(result.success).toBe(true);
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should use default command when no command specified', async () => {
    const defaultCommand: Command = {
      name: 'default',
      description: 'Default command',
      options: [],
      execute: vi.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    };
    
    router.setDefault(defaultCommand);
    const args: ParsedArgs = { command: '', options: {}, positional: [] };
    
    await router.route(args);
    
    expect(defaultCommand.execute).toHaveBeenCalledWith(args);
  });

  it('should handle command execution errors', async () => {
    const errorCommand: Command = {
      name: 'error',
      description: 'Error command',
      options: [],
      execute: vi.fn().mockRejectedValue(new Error('Test error')),
    };
    
    router.register(errorCommand);
    const args: ParsedArgs = { command: 'error', options: {}, positional: [] };
    
    const result = await router.route(args);
    
    expect(result.success).toBe(false);
    expect(result.message).toContain('Test error');
  });

  it('should list all registered commands', () => {
    const cmd1: Command = { name: 'cmd1', description: 'Cmd 1', options: [], execute: vi.fn() };
    const cmd2: Command = { name: 'cmd2', description: 'Cmd 2', options: [], execute: vi.fn() };
    
    router.register(cmd1);
    router.register(cmd2);
    
    const commands = router.getAllCommands();
    
    expect(commands).toHaveLength(2);
    expect(commands).toContain(cmd1);
    expect(commands).toContain(cmd2);
  });
});

describe('Command routing integration', () => {
  it('should parse and route init command', async () => {
    const router = createRouter();
    const initCommand: Command = {
      name: 'init',
      description: 'Initialize',
      options: [],
      execute: vi.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    };
    router.register(initCommand);
    
    const args = parseArgs(['node', 'cli.js', 'init', '--template=minimal', '--dry-run']);
    await router.route(args);
    
    expect(initCommand.execute).toHaveBeenCalledWith({
      command: 'init',
      options: { template: 'minimal', 'dry-run': true },
      positional: [],
    });
  });

  it('should parse and route config subcommand', async () => {
    const router = createRouter();
    const configCommand: Command = {
      name: 'config',
      description: 'Config',
      options: [],
      execute: vi.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    };
    router.register(configCommand);
    
    const args = parseArgs(['node', 'cli.js', 'config', 'show']);
    await router.route(args);
    
    expect(configCommand.execute).toHaveBeenCalledWith({
      command: 'config',
      subcommand: 'show',
      options: {},
      positional: [],
    });
  });

  it('should parse and route generate with files', async () => {
    const router = createRouter();
    const generateCommand: Command = {
      name: 'generate',
      description: 'Generate',
      options: [],
      execute: vi.fn().mockResolvedValue({ success: true, exitCode: 0 }),
    };
    router.register(generateCommand);
    
    const args = parseArgs(['node', 'cli.js', 'generate', '--type=api', 'src/api.ts', 'src/types.ts']);
    await router.route(args);
    
    expect(generateCommand.execute).toHaveBeenCalledWith({
      command: 'generate',
      options: { type: 'api' },
      positional: ['src/api.ts', 'src/types.ts'],
    });
  });
});
