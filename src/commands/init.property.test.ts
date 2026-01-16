/**
 * Property-based tests for InitCommand
 * 
 * **Validates: Requirements 1.1, 1.2**
 * - Property 1: Init creates correct directory structure
 * - Property 2: Template scaffolding matches definition
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { InitCommand } from './init';
import { ParsedArgs } from './types';
import { getTemplate, TemplateType, getAllTemplates } from '../templates';
import { ConfigManager } from '../config';

describe('InitCommand Property Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-docs-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Property 1: Init creates correct directory structure
   * 
   * *For any* valid project directory, running `kiro-docs init` SHALL create 
   * the `.kiro/` directory with a valid `auto-doc-sync.json` configuration 
   * file that passes validation.
   * 
   * **Validates: Requirements 1.1**
   */
  describe('Property 1: Init creates correct directory structure', () => {
    it('should create .kiro directory with valid config for any template type', async () => {
      const templateTypes: TemplateType[] = ['minimal', 'standard', 'comprehensive'];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...templateTypes),
          async (templateType) => {
            // Create a fresh subdirectory for this iteration
            const testDir = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            fs.mkdirSync(testDir, { recursive: true });

            const command = new InitCommand();
            const args: ParsedArgs = {
              command: 'init',
              options: {
                template: templateType,
                workspace: testDir,
              },
              positional: [],
            };

            const result = await command.execute(args);

            // Assert: Command succeeded
            expect(result.success).toBe(true);

            // Assert: .kiro directory exists
            const kiroDir = path.join(testDir, '.kiro');
            expect(fs.existsSync(kiroDir)).toBe(true);

            // Assert: Config file exists
            const configPath = path.join(kiroDir, 'auto-doc-sync.json');
            expect(fs.existsSync(configPath)).toBe(true);

            // Assert: Config file is valid JSON
            const configContent = fs.readFileSync(configPath, 'utf-8');
            let config: any;
            expect(() => {
              config = JSON.parse(configContent);
            }).not.toThrow();

            // Assert: Config has required fields
            expect(config).toHaveProperty('version');
            expect(config).toHaveProperty('analysis');
            expect(config).toHaveProperty('output');

            // Clean up this iteration's directory
            fs.rmSync(testDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 2: Template scaffolding matches definition
   * 
   * *For any* template type (minimal, standard, comprehensive), the scaffolded 
   * files and directories SHALL exactly match the template definition for that type.
   * 
   * **Validates: Requirements 1.2**
   */
  describe('Property 2: Template scaffolding matches definition', () => {
    it('should create exactly the files and directories defined in template', async () => {
      const templateTypes: TemplateType[] = ['minimal', 'standard', 'comprehensive'];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...templateTypes),
          async (templateType) => {
            // Create a fresh subdirectory for this iteration
            const testDir = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            fs.mkdirSync(testDir, { recursive: true });

            const template = getTemplate(templateType);
            const command = new InitCommand();
            const args: ParsedArgs = {
              command: 'init',
              options: {
                template: templateType,
                workspace: testDir,
              },
              positional: [],
            };

            await command.execute(args);

            // Assert: All directories from template exist
            for (const dir of template.directories) {
              const fullPath = path.join(testDir, dir);
              expect(fs.existsSync(fullPath), `Directory ${dir} should exist`).toBe(true);
              expect(fs.statSync(fullPath).isDirectory(), `${dir} should be a directory`).toBe(true);
            }

            // Assert: All files from template exist with correct content
            for (const file of template.files) {
              const fullPath = path.join(testDir, file.path);
              expect(fs.existsSync(fullPath), `File ${file.path} should exist`).toBe(true);
              expect(fs.statSync(fullPath).isFile(), `${file.path} should be a file`).toBe(true);
              
              const content = fs.readFileSync(fullPath, 'utf-8');
              expect(content).toBe(file.content);
            }

            // Clean up this iteration's directory
            fs.rmSync(testDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not create extra files beyond template definition', async () => {
      const templateTypes: TemplateType[] = ['minimal', 'standard', 'comprehensive'];
      
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...templateTypes),
          async (templateType) => {
            // Create a fresh subdirectory for this iteration
            const testDir = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
            fs.mkdirSync(testDir, { recursive: true });

            const template = getTemplate(templateType);
            const command = new InitCommand();
            const args: ParsedArgs = {
              command: 'init',
              options: {
                template: templateType,
                workspace: testDir,
              },
              positional: [],
            };

            await command.execute(args);

            // Get all files created in .kiro
            const kiroDir = path.join(testDir, '.kiro');
            const createdFiles = getAllFilesRecursive(kiroDir, testDir);
            
            // Get expected files from template
            const expectedFiles = new Set(template.files.map(f => f.path));

            // Assert: No extra files were created
            for (const file of createdFiles) {
              expect(expectedFiles.has(file), `Unexpected file created: ${file}`).toBe(true);
            }

            // Clean up this iteration's directory
            fs.rmSync(testDir, { recursive: true, force: true });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to recursively get all files in a directory
 */
function getAllFilesRecursive(dir: string, baseDir: string): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      files.push(...getAllFilesRecursive(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}


/**
 * Property 4: Dry-run/preview idempotence
 * 
 * *For any* command with `--dry-run` or `--preview` flag, the file system state 
 * before and after execution SHALL be identical, while the output SHALL describe 
 * what would have been changed.
 * 
 * **Validates: Requirements 1.6**
 */
describe('Property 4: Dry-run/preview idempotence', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-docs-dryrun-'));
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should not modify file system when --dry-run is set', async () => {
    const templateTypes: TemplateType[] = ['minimal', 'standard', 'comprehensive'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...templateTypes),
        async (templateType) => {
          // Create a fresh subdirectory for this iteration
          const testDir = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
          fs.mkdirSync(testDir, { recursive: true });

          // Capture file system state before
          const stateBefore = getDirectoryState(testDir);

          const command = new InitCommand();
          const args: ParsedArgs = {
            command: 'init',
            options: {
              template: templateType,
              'dry-run': true,
              workspace: testDir,
            },
            positional: [],
          };

          // Execute with dry-run
          const result = await command.execute(args);

          // Assert: Command succeeded
          expect(result.success).toBe(true);

          // Capture file system state after
          const stateAfter = getDirectoryState(testDir);

          // Assert: File system state is unchanged
          expect(stateAfter).toEqual(stateBefore);

          // Clean up
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not modify existing files when --dry-run is set', async () => {
    const templateTypes: TemplateType[] = ['minimal', 'standard', 'comprehensive'];
    
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...templateTypes),
        async (templateType) => {
          // Create a fresh subdirectory with existing .kiro
          const testDir = path.join(tempDir, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
          fs.mkdirSync(testDir, { recursive: true });
          
          // Create existing .kiro directory with a file
          const kiroDir = path.join(testDir, '.kiro');
          fs.mkdirSync(kiroDir, { recursive: true });
          const existingFile = path.join(kiroDir, 'existing.txt');
          fs.writeFileSync(existingFile, 'original content');

          // Capture file system state before
          const stateBefore = getDirectoryState(testDir);

          const command = new InitCommand();
          const args: ParsedArgs = {
            command: 'init',
            options: {
              template: templateType,
              'dry-run': true,
              workspace: testDir,
            },
            positional: [],
          };

          // Execute with dry-run
          await command.execute(args);

          // Capture file system state after
          const stateAfter = getDirectoryState(testDir);

          // Assert: File system state is unchanged
          expect(stateAfter).toEqual(stateBefore);

          // Assert: Existing file content is unchanged
          const content = fs.readFileSync(existingFile, 'utf-8');
          expect(content).toBe('original content');

          // Clean up
          fs.rmSync(testDir, { recursive: true, force: true });
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Helper function to capture directory state (files and their contents)
 */
function getDirectoryState(dir: string): Map<string, string | 'directory'> {
  const state = new Map<string, string | 'directory'>();
  
  if (!fs.existsSync(dir)) {
    return state;
  }

  function walkDir(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(dir, fullPath);
      
      if (entry.isDirectory()) {
        state.set(relativePath, 'directory');
        walkDir(fullPath);
      } else {
        const content = fs.readFileSync(fullPath, 'utf-8');
        state.set(relativePath, content);
      }
    }
  }

  walkDir(dir);
  return state;
}
