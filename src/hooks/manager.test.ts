/**
 * Property-based tests for Hook Manager
 * **Feature: auto-doc-sync, Property 11: Hook context passing**
 * **Feature: auto-doc-sync, Property 12: Hook execution logging**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { HookManager } from './manager.js';
import { HookConfig, HookContext, GitContext, ManualTriggerOptions } from './types.js';

describe('HookManager Property Tests', () => {
  let hookManager: HookManager;

  beforeEach(() => {
    hookManager = new HookManager();
  });

  describe('Property 11: Hook context passing', () => {
    /**
     * **Feature: auto-doc-sync, Property 11: Hook context passing**
     * **Validates: Requirements 5.3**
     * 
     * For any hook execution, the system should pass relevant context about 
     * the triggering event to the analysis engine
     */
    it('should pass complete context for git hook executions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random git context
          fc.record({
            commitHash: fc.option(fc.hexaString({ minLength: 7, maxLength: 40 })),
            author: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
            message: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
            changedFiles: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 })),
            branch: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
          }),
          // Generate random hook name
          fc.string({ minLength: 1, maxLength: 50 }),
          async (gitContext: GitContext, hookName: string) => {
            // Register a test hook that captures context
            let capturedContext: HookContext | null = null;
            
            const testHook: HookConfig = {
              name: hookName,
              trigger: 'git-commit',
              enabled: true,
              timeout: 1000,
              command: 'echo "test"'
            };
            
            hookManager.registerHook(testHook);
            
            // Execute git hook trigger
            const result = await hookManager.triggerGitHook(hookName, gitContext);
            
            // Verify context was passed correctly
            expect(result.context.triggerType).toBe('git-hook');
            expect(result.context.timestamp).toBeDefined();
            expect(result.context.metadata).toBeDefined();
            expect(result.context.metadata.sessionId).toBeDefined();
            expect(result.context.metadata.executionId).toBeDefined();
            expect(result.context.metadata.workingDirectory).toBeDefined();
            expect(result.context.gitContext).toEqual(gitContext);
            
            // Verify all git context fields are preserved
            if (gitContext.commitHash) {
              expect(result.context.gitContext?.commitHash).toBe(gitContext.commitHash);
            }
            if (gitContext.author) {
              expect(result.context.gitContext?.author).toBe(gitContext.author);
            }
            if (gitContext.message) {
              expect(result.context.gitContext?.message).toBe(gitContext.message);
            }
            if (gitContext.changedFiles) {
              expect(result.context.gitContext?.changedFiles).toEqual(gitContext.changedFiles);
            }
            if (gitContext.branch) {
              expect(result.context.gitContext?.branch).toBe(gitContext.branch);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should pass complete context for manual hook executions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random manual trigger options
          fc.record({
            targetFiles: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 100 }), { maxLength: 10 })),
            reason: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
            options: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 50 })))
          }),
          // Generate random hook name
          fc.string({ minLength: 1, maxLength: 50 }),
          async (manualOptions: ManualTriggerOptions, hookName: string) => {
            // Register a test hook
            const testHook: HookConfig = {
              name: hookName,
              trigger: 'manual',
              enabled: true,
              timeout: 1000,
              command: 'echo "test"'
            };
            
            hookManager.registerHook(testHook);
            
            // Execute manual trigger
            const result = await hookManager.triggerManual(hookName, manualOptions);
            
            // Verify context was passed correctly
            expect(result.context.triggerType).toBe('manual');
            expect(result.context.timestamp).toBeDefined();
            expect(result.context.metadata).toBeDefined();
            expect(result.context.metadata.sessionId).toBeDefined();
            expect(result.context.metadata.executionId).toBeDefined();
            expect(result.context.metadata.workingDirectory).toBeDefined();
            expect(result.context.manualContext).toBeDefined();
            
            // Verify all manual context fields are preserved
            if (manualOptions.targetFiles) {
              expect(result.context.manualContext?.targetFiles).toEqual(manualOptions.targetFiles);
            }
            if (manualOptions.reason) {
              expect(result.context.manualContext?.reason).toBe(manualOptions.reason);
            }
            if (manualOptions.options) {
              expect(result.context.manualContext?.options).toEqual(manualOptions.options);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain context consistency across hook executions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              hookName: fc.string({ minLength: 1, maxLength: 30 }),
              triggerType: fc.constantFrom('git-commit', 'manual'),
              gitContext: fc.option(fc.record({
                commitHash: fc.option(fc.hexaString({ minLength: 7, maxLength: 40 })),
                author: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
              })),
              manualOptions: fc.option(fc.record({
                reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
              }))
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (hookExecutions) => {
            // Register all hooks
            for (const exec of hookExecutions) {
              const hook: HookConfig = {
                name: exec.hookName,
                trigger: exec.triggerType,
                enabled: true,
                timeout: 1000,
                command: 'echo "test"'
              };
              hookManager.registerHook(hook);
            }
            
            // Execute all hooks and collect results
            const results = [];
            for (const exec of hookExecutions) {
              let result;
              if (exec.triggerType === 'git-commit' && exec.gitContext) {
                result = await hookManager.triggerGitHook(exec.hookName, exec.gitContext);
              } else {
                result = await hookManager.triggerManual(exec.hookName, exec.manualOptions || {});
              }
              results.push(result);
            }
            
            // Verify each result has consistent context structure
            for (const result of results) {
              expect(result.context.triggerType).toMatch(/^(git-hook|manual)$/);
              expect(result.context.timestamp).toBeDefined();
              expect(result.context.metadata).toBeDefined();
              expect(result.context.metadata.sessionId).toBeDefined();
              expect(result.context.metadata.executionId).toBeDefined();
              expect(result.context.metadata.workingDirectory).toBeDefined();
              
              // Verify context type matches trigger type
              if (result.context.triggerType === 'git-hook') {
                expect(result.context.gitContext).toBeDefined();
                expect(result.context.manualContext).toBeUndefined();
              } else {
                expect(result.context.manualContext).toBeDefined();
                expect(result.context.gitContext).toBeUndefined();
              }
            }
            
            // Verify all execution IDs are unique
            const executionIds = results.map(r => r.context.metadata.executionId);
            const uniqueIds = new Set(executionIds);
            expect(uniqueIds.size).toBe(executionIds.length);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 12: Hook execution logging', () => {
    /**
     * **Feature: auto-doc-sync, Property 12: Hook execution logging**
     * **Validates: Requirements 5.4**
     * 
     * For any completed hook execution, the system should log the results 
     * and any errors encountered during the process
     */
    it('should log successful hook executions with complete information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            commitHash: fc.option(fc.hexaString({ minLength: 7, maxLength: 40 })),
            author: fc.option(fc.string({ minLength: 1, maxLength: 50 }))
          }),
          async (hookName: string, gitContext: GitContext) => {
            // Register a hook that will succeed
            const testHook: HookConfig = {
              name: hookName,
              trigger: 'git-commit',
              enabled: true,
              timeout: 5000,
              command: 'echo "success"'
            };
            
            hookManager.registerHook(testHook);
            
            // Execute hook
            const result = await hookManager.triggerGitHook(hookName, gitContext);
            
            // Verify execution result contains all required logging information
            expect(result.success).toBeDefined();
            expect(result.executionId).toBeDefined();
            expect(result.startTime).toBeDefined();
            expect(result.endTime).toBeDefined();
            expect(result.duration).toBeDefined();
            expect(result.context).toBeDefined();
            
            // Verify timing information is logical
            expect(new Date(result.endTime).getTime()).toBeGreaterThanOrEqual(
              new Date(result.startTime).getTime()
            );
            expect(result.duration).toBeGreaterThanOrEqual(0);
            
            // For successful executions, should have output but no error
            if (result.success) {
              expect(result.output).toBeDefined();
              expect(result.error).toBeUndefined();
            }
            
            // Verify result can be retrieved by execution ID
            const retrievedResult = hookManager.getExecutionResult(result.executionId);
            expect(retrievedResult).toEqual(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log failed hook executions with error information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.record({
            reason: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
          }),
          async (hookName: string, manualOptions: ManualTriggerOptions) => {
            // Register a hook that will fail
            const testHook: HookConfig = {
              name: hookName,
              trigger: 'manual',
              enabled: true,
              timeout: 5000,
              command: 'sh -c "exit 1"' // This will cause the hook to fail
            };
            
            hookManager.registerHook(testHook);
            
            // Execute hook
            const result = await hookManager.triggerManual(hookName, manualOptions);
            
            // Verify execution result contains all required logging information
            expect(result.success).toBe(false);
            expect(result.executionId).toBeDefined();
            expect(result.startTime).toBeDefined();
            expect(result.endTime).toBeDefined();
            expect(result.duration).toBeDefined();
            expect(result.context).toBeDefined();
            expect(result.error).toBeDefined();
            
            // Verify timing information is logical
            expect(new Date(result.endTime).getTime()).toBeGreaterThanOrEqual(
              new Date(result.startTime).getTime()
            );
            expect(result.duration).toBeGreaterThanOrEqual(0);
            
            // Verify result can be retrieved by execution ID
            const retrievedResult = hookManager.getExecutionResult(result.executionId);
            expect(retrievedResult).toEqual(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain execution history for analysis', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              hookName: fc.string({ minLength: 1, maxLength: 30 }),
              shouldSucceed: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (executions) => {
            // Register hooks and execute them
            const expectedResults = [];
            
            for (const exec of executions) {
              const command = exec.shouldSucceed ? 'echo "success"' : 'sh -c "exit 1"';
              const hook: HookConfig = {
                name: exec.hookName,
                trigger: 'manual',
                enabled: true,
                timeout: 5000,
                command
              };
              
              hookManager.registerHook(hook);
              const result = await hookManager.triggerManual(exec.hookName, {});
              expectedResults.push(result);
            }
            
            // Verify all results are stored in execution history
            const allResults = hookManager.getExecutionResults();
            expect(allResults.length).toBeGreaterThanOrEqual(expectedResults.length);
            
            // Verify each expected result is in the history
            for (const expectedResult of expectedResults) {
              const foundResult = allResults.find(r => r.executionId === expectedResult.executionId);
              expect(foundResult).toBeDefined();
              expect(foundResult).toEqual(expectedResult);
            }
            
            // Verify success/failure matches expectations
            for (let i = 0; i < expectedResults.length; i++) {
              expect(expectedResults[i].success).toBe(executions[i].shouldSucceed);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});