/**
 * Property-based tests for FileWatcher
 * 
 * **Validates: Requirements 2.5**
 * - Property 6: Debounce coalesces rapid changes
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileWatcher, FileChangeEvent } from './fileWatcher';

describe('FileWatcher Property Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiro-watcher-test-'));
    // Create a src directory for watching
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Property 6: Debounce coalesces rapid changes
   * 
   * *For any* sequence of N file changes occurring within the debounce window,
   * the watch mode SHALL trigger exactly one documentation update, not N updates.
   * 
   * **Validates: Requirements 2.5**
   * 
   * Note: These tests use a simulated approach to avoid flaky file system timing issues.
   * The debounce logic is tested by directly invoking the internal handlers.
   */
  describe('Property 6: Debounce coalesces rapid changes', () => {
    it('should coalesce multiple rapid changes to same file into one event', async () => {
      const debounceMs = 50;
      
      await fc.assert(
        fc.asyncProperty(
          // Generate number of rapid changes (2-10)
          fc.integer({ min: 2, max: 10 }),
          async (numChanges) => {
            const watcher = new FileWatcher({
              patterns: ['src/**/*.ts'],
              excludePatterns: [],
              debounceMs,
              cwd: tempDir,
            });

            const receivedEvents: FileChangeEvent[] = [];
            watcher.onFileChange((event) => {
              receivedEvents.push(event);
            });

            // Simulate rapid file changes by directly calling the internal handler
            // This tests the debounce logic without file system timing issues
            const testPath = 'src/test.ts';
            
            for (let i = 0; i < numChanges; i++) {
              // Access private method for testing debounce logic
              (watcher as any).handleFileEvent('change', testPath);
              await sleep(5); // Small delay between simulated changes
            }

            // Wait for debounce to complete
            await sleep(debounceMs + 50);

            // Assert: Should receive exactly 1 event, not N events
            expect(receivedEvents.length).toBe(1);
            expect(receivedEvents[0].type).toBe('change');
            expect(receivedEvents[0].path).toBe(testPath);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit separate events for changes outside debounce window', async () => {
      const debounceMs = 30;
      
      const watcher = new FileWatcher({
        patterns: ['src/**/*.ts'],
        excludePatterns: [],
        debounceMs,
        cwd: tempDir,
      });

      const receivedEvents: FileChangeEvent[] = [];
      watcher.onFileChange((event) => {
        receivedEvents.push(event);
      });

      const testPath = 'src/test.ts';

      // First change
      (watcher as any).handleFileEvent('change', testPath);
      
      // Wait for debounce to complete
      await sleep(debounceMs + 30);
      
      // Second change (outside first debounce window)
      (watcher as any).handleFileEvent('change', testPath);
      
      // Wait for second debounce to complete
      await sleep(debounceMs + 30);

      // Should receive 2 separate events
      expect(receivedEvents.length).toBe(2);
    });

    it('should handle rapid changes to multiple files independently', async () => {
      const debounceMs = 50;
      
      await fc.assert(
        fc.asyncProperty(
          // Generate number of files (2-5)
          fc.integer({ min: 2, max: 5 }),
          async (numFiles) => {
            const watcher = new FileWatcher({
              patterns: ['src/**/*.ts'],
              excludePatterns: [],
              debounceMs,
              cwd: tempDir,
            });

            const receivedEvents: FileChangeEvent[] = [];
            watcher.onFileChange((event) => {
              receivedEvents.push(event);
            });

            // Create file paths
            const testPaths = Array.from({ length: numFiles }, (_, i) => `src/file${i}.ts`);

            // Make rapid changes to each file
            for (let round = 0; round < 3; round++) {
              for (const filePath of testPaths) {
                (watcher as any).handleFileEvent('change', filePath);
              }
              await sleep(5);
            }

            // Wait for debounce to complete
            await sleep(debounceMs + 50);

            // Should receive exactly numFiles events (one per file)
            // Each file's rapid changes should be coalesced
            expect(receivedEvents.length).toBe(numFiles);
            
            // Verify each file got exactly one event
            const eventPaths = receivedEvents.map(e => e.path);
            const uniquePaths = new Set(eventPaths);
            expect(uniquePaths.size).toBe(numFiles);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve the latest event type when coalescing', async () => {
      const debounceMs = 50;
      
      await fc.assert(
        fc.asyncProperty(
          // Generate sequence of event types
          fc.array(fc.constantFrom('add', 'change', 'unlink'), { minLength: 2, maxLength: 5 }),
          async (eventTypes) => {
            const watcher = new FileWatcher({
              patterns: ['src/**/*.ts'],
              excludePatterns: [],
              debounceMs,
              cwd: tempDir,
            });

            const receivedEvents: FileChangeEvent[] = [];
            watcher.onFileChange((event) => {
              receivedEvents.push(event);
            });

            const testPath = 'src/test.ts';
            const lastEventType = eventTypes[eventTypes.length - 1] as 'add' | 'change' | 'unlink';

            // Simulate rapid events of different types
            for (const eventType of eventTypes) {
              (watcher as any).handleFileEvent(eventType, testPath);
              await sleep(5);
            }

            // Wait for debounce to complete
            await sleep(debounceMs + 50);

            // Should receive exactly 1 event with the last event type
            expect(receivedEvents.length).toBe(1);
            expect(receivedEvents[0].type).toBe(lastEventType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Helper function to sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
