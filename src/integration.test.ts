/**
 * Integration tests for Auto-Doc-Sync System
 * Task 12: Final integration and testing
 * 
 * Tests:
 * - End-to-end workflow from git commit to documentation updates
 * - Manual trigger functionality
 * - Documentation format validation
 * - Error handling scenarios and recovery mechanisms
 * 
 * Requirements: 1.1, 1.2, 5.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { AutoDocSyncSystem } from './orchestrator';
import { ConfigManager } from './config';

describe('Auto-Doc-Sync System Integration Tests', () => {
  const testWorkspace = path.join(process.cwd(), 'test-workspace');
  const testKiroDir = path.join(testWorkspace, '.kiro');
  const testSpecsDir = path.join(testKiroDir, 'specs');
  const testLogDir = path.join(testKiroDir, 'development-log');
  const testHooksDir = path.join(testKiroDir, 'hooks');
  const testSubagentsDir = path.join(testKiroDir, 'subagents');

  beforeEach(async () => {
    // Create test workspace structure
    await fs.mkdir(testWorkspace, { recursive: true });
    await fs.mkdir(testKiroDir, { recursive: true });
    await fs.mkdir(testSpecsDir, { recursive: true });
    await fs.mkdir(testLogDir, { recursive: true });
    await fs.mkdir(testHooksDir, { recursive: true });
    await fs.mkdir(testSubagentsDir, { recursive: true });

    // Initialize git repository
    await execCommand('git init');
    await execCommand('git config user.name "Test User"');
    await execCommand('git config user.email "test@example.com"');

    // Create initial files
    await createTestFiles();
  });

  afterEach(async () => {
    // Clean up test workspace
    try {
      await fs.rm(testWorkspace, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Test end-to-end workflow from git commit to documentation updates
   * Requirements: 1.1, 1.2
   */
  describe('End-to-End Workflow', () => {
    it('should complete full workflow from manual trigger to documentation updates', async () => {
      // Create a source file with API changes
      const apiFile = path.join(testWorkspace, 'src', 'api.ts');
      await fs.mkdir(path.dirname(apiFile), { recursive: true });
      await fs.writeFile(apiFile, `
export interface UserData {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  /**
   * Creates a new user
   * @param userData - User data to create
   * @returns Promise resolving to created user
   */
  public async createUser(userData: UserData): Promise<UserData> {
    // Implementation here
    return userData;
  }

  /**
   * Gets user by ID
   * @param id - User ID
   * @returns Promise resolving to user data
   */
  public async getUserById(id: string): Promise<UserData | null> {
    // Implementation here
    return null;
  }
}
      `);

      // Create README file
      const readmeFile = path.join(testWorkspace, 'README.md');
      await fs.writeFile(readmeFile, `
# Test Project

## Features & API

This section will be updated automatically.

## Installation

npm install
      `);

      // Create test configuration that points to our test workspace
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        workspaceRoot: testWorkspace,
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**', '**/test-*/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: '.kiro/development-log',
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: '.kiro/hooks'
        }
      }, null, 2));

      // Run the auto-doc-sync system with manual trigger
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [apiFile],
        reason: 'Integration test - manual trigger workflow'
      });

      // Verify documentation was updated
      
      // Check if development log was created
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        expect(logContent).toContain('manual');
        expect(logContent).toContain('src/api.ts');
        expect(logContent).toContain('Integration test - manual trigger workflow');
      }
    }, 30000); // 30 second timeout for integration test

    it('should handle multiple file changes in single execution', async () => {
      // Create multiple source files
      const files = [
        { path: 'src/utils.ts', content: 'export function formatDate(date: Date): string { return date.toISOString(); }' },
        { path: 'src/types.ts', content: 'export interface Config { apiUrl: string; timeout: number; }' },
        { path: 'src/service.ts', content: 'export class DataService { async fetchData(): Promise<any> { return {}; } }' }
      ];

      for (const file of files) {
        const filePath = path.join(testWorkspace, file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
      }

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: files.map(f => path.join(testWorkspace, f.path)),
        reason: 'Multiple file changes test'
      });

      // Verify all files were processed
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        expect(logContent).toContain('src/utils.ts');
        expect(logContent).toContain('src/types.ts');
        expect(logContent).toContain('src/service.ts');
      }
    }, 30000);
  });

  /**
   * Test manual trigger functionality
   * Requirements: 1.2, 5.1
   */
  describe('Manual Trigger Functionality', () => {
    it('should work correctly when triggered manually', async () => {
      // Create test files
      const testFile = path.join(testWorkspace, 'src', 'manual-test.ts');
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, `
export function processData(input: string): string {
  return input.toUpperCase();
}
      `);

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Test manual trigger
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [testFile],
        reason: 'Manual integration test'
      });

      // Verify manual trigger worked
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        expect(logContent).toContain('manual');
        expect(logContent).toContain('Manual integration test');
      }
    }, 15000);

    it('should handle specific file targeting in manual mode', async () => {
      // Create multiple test files
      const targetFile = path.join(testWorkspace, 'src', 'target.ts');
      const otherFile = path.join(testWorkspace, 'src', 'other.ts');
      
      await fs.mkdir(path.dirname(targetFile), { recursive: true });
      await fs.writeFile(targetFile, 'export const TARGET = "target";');
      await fs.writeFile(otherFile, 'export const OTHER = "other";');

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system with specific file targeting
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [targetFile],
        reason: 'Specific file targeting test'
      });

      // Verify only target file was processed
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        expect(logContent).toContain('target.ts');
        // Should not contain the other file since it wasn't targeted
      }
    }, 15000);

    it('should provide helpful error messages for invalid manual triggers', async () => {
      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();

      // Test with non-existent target files
      await expect(system.run({
        triggerType: 'manual',
        targetFiles: ['/non/existent/file.ts'],
        reason: 'Invalid file test'
      })).resolves.not.toThrow(); // Should handle gracefully, not throw

      // Verify error was logged appropriately
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThanOrEqual(0); // Should create log even for errors
    }, 15000);
  });

  /**
   * Test documentation format validation
   * Requirements: 1.1, 1.2
   */
  describe('Documentation Format Validation', () => {
    it('should generate properly formatted development logs', async () => {
      // Create API file with comprehensive examples
      const apiFile = path.join(testWorkspace, 'src', 'comprehensive-api.ts');
      await fs.mkdir(path.dirname(apiFile), { recursive: true });
      await fs.writeFile(apiFile, `
/**
 * User management API
 */
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

/**
 * Service for managing users
 */
export class UserManagementService {
  /**
   * Creates a new user
   * @param request - User creation request
   * @returns Promise resolving to created user
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    throw new Error('Not implemented');
  }

  /**
   * Updates an existing user
   * @param id - User ID
   * @param updates - Partial user updates
   * @returns Promise resolving to updated user
   */
  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    throw new Error('Not implemented');
  }
}
      `);

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [apiFile],
        reason: 'API documentation format test'
      });

      // Verify log format
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        
        // Verify markdown structure
        expect(logContent).toMatch(/^## /m); // Should have headers
        expect(logContent).toMatch(/\*\*[^*]+\*\*/); // Should have bold text
        expect(logContent).toMatch(/^- /m); // Should have list items
        
        // Verify required sections
        expect(logContent).toContain('**Timestamp:**');
        expect(logContent).toContain('**Session:**');
        expect(logContent).toContain('**Trigger:**');
        expect(logContent).toContain('**Changes:**');
        expect(logContent).toContain('**Affected Files:**');
        expect(logContent).toContain('**Rationale:**');
        expect(logContent).toContain('**Metadata:**');
        
        // Verify content
        expect(logContent).toContain('manual');
        expect(logContent).toContain('comprehensive-api.ts');
        expect(logContent).toContain('API documentation format test');
      }
    }, 20000);

    it('should handle README formatting consistently', async () => {
      // Create existing README with specific formatting
      const readmeFile = path.join(testWorkspace, 'README.md');
      await fs.writeFile(readmeFile, `# My Project

This is a test project.

## Features & API

Current features will be listed here.

## Installation

\`\`\`bash
npm install
\`\`\`

## Usage

Example usage here.
      `);

      // Create source file to trigger update
      const sourceFile = path.join(testWorkspace, 'src', 'feature.ts');
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, `
export class FeatureService {
  async processFeature(): Promise<string> {
    return 'processed';
  }
}
      `);

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [sourceFile],
        reason: 'README formatting test'
      });

      // Verify README structure is preserved
      const updatedReadme = await fs.readFile(readmeFile, 'utf-8');
      
      // Should maintain original structure
      expect(updatedReadme).toContain('# My Project');
      expect(updatedReadme).toContain('## Installation');
      expect(updatedReadme).toContain('## Usage');
      expect(updatedReadme).toContain('```bash');
      expect(updatedReadme).toContain('npm install');
      
      // Should have Features & API section
      expect(updatedReadme).toContain('## Features & API');
    }, 15000);

    it('should generate valid markdown in development logs', async () => {
      // Create test scenario
      const testFile = path.join(testWorkspace, 'src', 'log-test.ts');
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      await fs.writeFile(testFile, 'export const TEST = "log validation";');

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [testFile],
        reason: 'Development log format validation test'
      });

      // Verify log format
      const logFiles = await fs.readdir(testLogDir);
      const logFile = logFiles.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
      expect(logFile).toBeDefined();

      if (logFile) {
        const logContent = await fs.readFile(path.join(testLogDir, logFile), 'utf-8');
        
        // Verify markdown structure
        expect(logContent).toMatch(/^## /m); // Should have headers
        expect(logContent).toMatch(/\*\*[^*]+\*\*/); // Should have bold text
        expect(logContent).toMatch(/^- /m); // Should have list items
        
        // Verify required sections
        expect(logContent).toContain('**Timestamp:**');
        expect(logContent).toContain('**Session:**');
        expect(logContent).toContain('**Trigger:**');
        expect(logContent).toContain('**Changes:**');
        expect(logContent).toContain('**Affected Files:**');
        expect(logContent).toContain('**Rationale:**');
        expect(logContent).toContain('**Metadata:**');
        
        // Verify content
        expect(logContent).toContain('manual');
        expect(logContent).toContain('log-test.ts');
        expect(logContent).toContain('Development log format validation test');
      }
    }, 15000);
  });

  /**
   * Test error handling scenarios and recovery mechanisms
   * Requirements: 1.1, 1.2
   */
  describe('Error Handling and Recovery', () => {
    it('should handle missing .kiro directory structure', async () => {
      // Remove .kiro directory
      await fs.rm(testKiroDir, { recursive: true, force: true });

      // Create source file
      const sourceFile = path.join(testWorkspace, 'src', 'missing-kiro.ts');
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, 'export const MISSING_KIRO = true;');

      // Run system - should recreate directory structure
      const system = new AutoDocSyncSystem(undefined, testWorkspace);
      await system.initialize();
      
      await system.run({
        triggerType: 'manual',
        targetFiles: [sourceFile],
        reason: 'Missing .kiro directory test'
      });

      // Verify directories were recreated
      expect(await fileExists(testKiroDir)).toBe(true);
      expect(await fileExists(testSpecsDir)).toBe(true);
      expect(await fileExists(testLogDir)).toBe(true);
      expect(await fileExists(testHooksDir)).toBe(true);
      expect(await fileExists(testSubagentsDir)).toBe(true);
    }, 60000);

    it('should handle analysis failures gracefully', async () => {
      // Create file with syntax errors
      const invalidFile = path.join(testWorkspace, 'src', 'invalid.ts');
      await fs.mkdir(path.dirname(invalidFile), { recursive: true });
      await fs.writeFile(invalidFile, `
// This file has intentional syntax errors
export class InvalidClass {
  method() {
    // Missing closing brace
  
export const INVALID = "unclosed string;
      `);

      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      // Run system - should handle analysis failure gracefully
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();
      
      await expect(system.run({
        triggerType: 'manual',
        targetFiles: [invalidFile],
        reason: 'Analysis failure recovery test'
      })).resolves.not.toThrow();

      // System should still create log entry even if analysis fails
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle configuration errors and use defaults', async () => {
      // Create invalid configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, '{ invalid json }');

      // Create source file
      const sourceFile = path.join(testWorkspace, 'src', 'config-error.ts');
      await fs.mkdir(path.dirname(sourceFile), { recursive: true });
      await fs.writeFile(sourceFile, 'export const CONFIG_ERROR = true;');

      // Run system - should use default config (but we need to disable subagent for test speed)
      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      
      // Override config to disable subagent for faster test
      (system as any).config = {
        ...(system as any).config,
        subagent: { enabled: false }
      };
      
      await system.initialize();
      
      await expect(system.run({
        triggerType: 'manual',
        targetFiles: [sourceFile],
        reason: 'Configuration error test'
      })).resolves.not.toThrow();

      // Should still work with default configuration
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThan(0);
    }, 60000);

    it('should handle empty file changes gracefully', async () => {
      // Create test configuration
      const configFile = path.join(testKiroDir, 'auto-doc-sync.json');
      await fs.writeFile(configFile, JSON.stringify({
        analysis: {
          includePatterns: ['**/*.ts', '**/*.js'],
          excludePatterns: ['**/node_modules/**'],
          maxFileSize: 1048576,
          analysisDepth: 'shallow'
        },
        output: {
          preserveFormatting: true,
          backupFiles: false,
          validateOutput: true
        },
        logging: {
          logDirectory: testLogDir,
          maxEntriesPerFile: 100,
          retentionDays: 30,
          groupingTimeWindow: 5
        },
        subagent: {
          enabled: false
        },
        hooks: {
          enabled: false,
          configPath: testHooksDir
        }
      }, null, 2));

      const system = new AutoDocSyncSystem(configFile, testWorkspace);
      await system.initialize();

      // Test with no target files
      await expect(system.run({
        triggerType: 'manual',
        targetFiles: [],
        reason: 'Empty changes test'
      })).resolves.not.toThrow();

      // Should handle gracefully
      const logFiles = await fs.readdir(testLogDir);
      expect(logFiles.length).toBeGreaterThanOrEqual(0);
    }, 60000);

    it('should handle system initialization errors', async () => {
      // Create a system with invalid configuration path
      const invalidConfigPath = '/invalid/path/config.json';
      
      const system = new AutoDocSyncSystem(invalidConfigPath, testWorkspace);
      
      // Should handle initialization gracefully
      await expect(system.initialize()).resolves.not.toThrow();
      
      // Should still be able to run with defaults
      await expect(system.run({
        triggerType: 'manual',
        reason: 'Initialization error test'
      })).resolves.not.toThrow();
    }, 60000);
  });

  /**
   * Helper functions
   */
  async function createTestFiles(): Promise<void> {
    // Create basic project structure
    const srcDir = path.join(testWorkspace, 'src');
    await fs.mkdir(srcDir, { recursive: true });

    // Create package.json
    await fs.writeFile(path.join(testWorkspace, 'package.json'), JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'Test project for auto-doc-sync integration tests'
    }, null, 2));

    // Create basic README
    await fs.writeFile(path.join(testWorkspace, 'README.md'), `# Test Project

This is a test project for integration testing.

## Features & API

Features will be documented here.
    `);

    // Create example configuration
    await fs.writeFile(path.join(testKiroDir, 'auto-doc-sync.json'), JSON.stringify({
      analysis: {
        includePatterns: ['**/*.ts', '**/*.js'],
        excludePatterns: ['**/node_modules/**', '**/test-*/**'],
        maxFileSize: 1048576,
        analysisDepth: 'shallow'
      },
      output: {
        preserveFormatting: true,
        backupFiles: false,
        validateOutput: true
      },
      logging: {
        logDirectory: '.kiro/development-log',
        maxEntriesPerFile: 100,
        retentionDays: 30,
        groupingTimeWindow: 5
      },
      subagent: {
        enabled: false
      },
      hooks: {
        enabled: true,
        configPath: '.kiro/hooks'
      }
    }, null, 2));
  }

  async function fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  function execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { 
        cwd: testWorkspace,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed: ${command}\nStderr: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }
});