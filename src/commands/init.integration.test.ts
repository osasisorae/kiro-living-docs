/**
 * Integration tests for InitCommand
 * These tests verify actual file system behavior, not abstract properties
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InitCommand } from './init';
import { ParsedArgs } from './types';
import * as fs from 'fs';
import * as path from 'path';

describe('InitCommand Integration', () => {
  const testWorkspace = path.join(process.cwd(), 'test-init-workspace');

  beforeEach(() => {
    // Clean up test workspace
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true });
    }
    fs.mkdirSync(testWorkspace, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testWorkspace)) {
      fs.rmSync(testWorkspace, { recursive: true });
    }
  });

  it('creates .kiro directory structure with minimal template', async () => {
    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'minimal',
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(true);
    
    // Verify .kiro directory exists
    expect(fs.existsSync(path.join(testWorkspace, '.kiro'))).toBe(true);
    
    // Verify config file exists
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'auto-doc-sync.json'))).toBe(true);
    
    // Verify config is valid JSON
    const configPath = path.join(testWorkspace, '.kiro', 'auto-doc-sync.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(config).toHaveProperty('analysis');
    expect(config).toHaveProperty('output');
  });

  it('creates .kiro directory structure with standard template', async () => {
    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'standard',
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(true);
    
    // Verify directories exist
    expect(fs.existsSync(path.join(testWorkspace, '.kiro'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'development-log'))).toBe(true);
  });

  it('creates .kiro directory structure with comprehensive template', async () => {
    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'comprehensive',
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(true);
    
    // Verify all directories exist
    expect(fs.existsSync(path.join(testWorkspace, '.kiro'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'specs'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'development-log'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'hooks'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'steering'))).toBe(true);
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'subagents'))).toBe(true);
  });

  it('fails when .kiro already exists without --force', async () => {
    // Create existing .kiro directory
    fs.mkdirSync(path.join(testWorkspace, '.kiro'), { recursive: true });

    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'minimal',
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(false);
  });

  it('overwrites existing .kiro with --force flag', async () => {
    // Create existing .kiro directory with a marker file
    fs.mkdirSync(path.join(testWorkspace, '.kiro'), { recursive: true });
    fs.writeFileSync(path.join(testWorkspace, '.kiro', 'marker.txt'), 'existing');

    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'minimal',
        force: true,
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(true);
    
    // Verify new config exists
    expect(fs.existsSync(path.join(testWorkspace, '.kiro', 'auto-doc-sync.json'))).toBe(true);
  });

  it('dry-run does not create any files', async () => {
    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'comprehensive',
        'dry-run': true,
      },
    };

    const result = await command.execute(args);

    expect(result.success).toBe(true);
    
    // Verify NO files were created
    expect(fs.existsSync(path.join(testWorkspace, '.kiro'))).toBe(false);
  });

  it('config file contains valid analysis patterns', async () => {
    const command = new InitCommand();
    const args: ParsedArgs = {
      command: 'init',
      args: [],
      options: {
        workspace: testWorkspace,
        template: 'standard',
      },
    };

    await command.execute(args);

    const configPath = path.join(testWorkspace, '.kiro', 'auto-doc-sync.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Verify analysis config has required fields
    expect(config.analysis.includePatterns).toBeInstanceOf(Array);
    expect(config.analysis.excludePatterns).toBeInstanceOf(Array);
    expect(config.analysis.includePatterns.length).toBeGreaterThan(0);
    
    // Verify it includes TypeScript files
    expect(config.analysis.includePatterns.some((p: string) => p.includes('.ts'))).toBe(true);
    
    // Verify it excludes node_modules
    expect(config.analysis.excludePatterns.some((p: string) => p.includes('node_modules'))).toBe(true);
  });
});
