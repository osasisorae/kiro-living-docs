/**
 * Property-based tests for development logging system
 * Feature: auto-doc-sync, Property 8: Development log entry creation
 * Feature: auto-doc-sync, Property 9: Log entry content completeness
 * Feature: auto-doc-sync, Property 10: Related change grouping
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { promises as fs } from 'fs';
import { join } from 'path';
import { DevelopmentLogger, DEFAULT_LOG_CONFIG } from './index.js';
import { LogEntry, LogConfig } from './types.js';
import { ChangeAnalysis } from '../types/index.js';

describe('DevelopmentLogger Property Tests', () => {
  let testLogDir: string;
  let logger: DevelopmentLogger;
  let config: LogConfig;

  beforeEach(async () => {
    testLogDir = join(process.cwd(), 'test-logs', `test-${Date.now()}`);
    config = {
      ...DEFAULT_LOG_CONFIG,
      logDirectory: testLogDir,
      groupingTimeWindow: 5 // 5 minutes for testing
    };
    logger = new DevelopmentLogger(config);
  });

  afterEach(async () => {
    try {
      await fs.rm(testLogDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Feature: auto-doc-sync, Property 8: Development log entry creation
   * Validates: Requirements 4.1, 4.4
   * 
   * For any documentation updates processed, the system should create a timestamped 
   * development log entry in the .kiro/development-log/ directory
   */
  it('should create timestamped log entries for any documentation updates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          triggerType: fc.constantFrom('git-hook', 'manual'),
          changedFiles: fc.array(
            fc.record({
              path: fc.constantFrom('src/test.ts', 'README.md', 'docs/api.md'),
              changeType: fc.constantFrom('added', 'modified', 'deleted'),
              diffContent: fc.string({ minLength: 10, maxLength: 200 }),
              extractedFunctions: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 20 }),
                  parameters: fc.array(fc.record({
                    name: fc.string({ minLength: 1, maxLength: 10 }),
                    type: fc.constantFrom('string', 'number', 'boolean'),
                    optional: fc.boolean()
                  })),
                  returnType: fc.constantFrom('string', 'number', 'void', 'Promise<any>'),
                  isExported: fc.boolean()
                }),
                { maxLength: 3 }
              ),
              extractedClasses: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 20 }),
                  methods: fc.array(fc.record({
                    name: fc.string({ minLength: 1, maxLength: 15 }),
                    parameters: fc.array(fc.record({
                      name: fc.string({ minLength: 1, maxLength: 10 }),
                      type: fc.string({ minLength: 1, maxLength: 10 }),
                      optional: fc.boolean()
                    })),
                    returnType: fc.string({ minLength: 1, maxLength: 10 }),
                    isExported: fc.boolean()
                  })),
                  properties: fc.array(fc.record({
                    name: fc.string({ minLength: 1, maxLength: 15 }),
                    type: fc.string({ minLength: 1, maxLength: 10 }),
                    visibility: fc.constantFrom('public', 'private', 'protected')
                  })),
                  isExported: fc.boolean()
                }),
                { maxLength: 2 }
              )
            }),
            { minLength: 1, maxLength: 5 }
          ),
          extractedAPIs: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              method: fc.constantFrom('GET', 'POST', 'PUT', 'DELETE'),
              path: fc.string({ minLength: 1, maxLength: 30 }),
              parameters: fc.array(fc.record({
                name: fc.string({ minLength: 1, maxLength: 10 }),
                type: fc.string({ minLength: 1, maxLength: 10 }),
                optional: fc.boolean()
              })),
              returnType: fc.string({ minLength: 1, maxLength: 15 })
            }),
            { maxLength: 3 }
          ),
          newFeatures: fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 25 }),
              description: fc.string({ minLength: 10, maxLength: 100 }),
              affectedFiles: fc.array(fc.string({ minLength: 1, maxLength: 30 })),
              category: fc.constantFrom('new', 'enhanced', 'deprecated')
            }),
            { maxLength: 3 }
          ),
          architecturalChanges: fc.array(
            fc.record({
              type: fc.constantFrom('component-added', 'component-modified', 'component-removed', 'pattern-changed'),
              component: fc.string({ minLength: 1, maxLength: 20 }),
              description: fc.string({ minLength: 10, maxLength: 80 }),
              impact: fc.constantFrom('low', 'medium', 'high')
            }),
            { maxLength: 3 }
          ),
          documentationRequirements: fc.array(
            fc.record({
              type: fc.constantFrom('api-spec', 'readme-section', 'dev-log', 'steering-file'),
              targetFile: fc.string({ minLength: 1, maxLength: 30 }),
              section: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
              content: fc.string({ minLength: 10, maxLength: 150 }),
              priority: fc.constantFrom('high', 'medium', 'low')
            }),
            { minLength: 1, maxLength: 5 }
          )
        }),
        fc.string({ minLength: 10, maxLength: 200 }), // rationale
        async (analysisData, rationale) => {
          const analysis: ChangeAnalysis = {
            timestamp: new Date().toISOString(),
            ...analysisData
          };

          // Create log entry
          const entry = await logger.createLogEntry(analysis, rationale);

          // Verify entry has required properties
          expect(entry).toHaveProperty('id');
          expect(entry).toHaveProperty('timestamp');
          expect(entry).toHaveProperty('sessionId');
          expect(entry).toHaveProperty('changeDescriptions');
          expect(entry).toHaveProperty('affectedFiles');
          expect(entry).toHaveProperty('rationale');
          expect(entry).toHaveProperty('metadata');

          // Verify timestamp is valid and recent
          expect(typeof entry.timestamp).toBe('string');
          const entryTime = new Date(entry.timestamp);
          const now = new Date();
          expect(entryTime.getTime()).toBeLessThanOrEqual(now.getTime());
          expect(now.getTime() - entryTime.getTime()).toBeLessThan(5000); // Within 5 seconds

          // Verify ID is unique and properly formatted
          expect(typeof entry.id).toBe('string');
          expect(entry.id).toMatch(/^entry-\d+-[a-z0-9]+$/);

          // Verify session ID is properly formatted
          expect(typeof entry.sessionId).toBe('string');
          expect(entry.sessionId).toMatch(/^session-\d+-[a-z0-9]+$/);

          // Verify rationale matches input
          expect(entry.rationale).toBe(rationale);

          // Verify metadata structure
          expect(entry.metadata).toHaveProperty('triggerType');
          expect(entry.metadata).toHaveProperty('version');
          expect(entry.metadata).toHaveProperty('analysisTime');
          expect(entry.metadata.triggerType).toBe(analysis.triggerType);
          expect(typeof entry.metadata.version).toBe('string');
          expect(typeof entry.metadata.analysisTime).toBe('number');

          // Store the entry and verify it's written to correct directory
          await logger.storeLogEntry(entry);

          // Verify file was created in the correct directory
          const files = await fs.readdir(testLogDir);
          expect(files.length).toBeGreaterThan(0);

          // Verify file name format
          const logFile = files.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
          expect(logFile).toBeDefined();

          // Verify file content contains entry data
          const filePath = join(testLogDir, logFile!);
          const content = await fs.readFile(filePath, 'utf-8');
          expect(content).toContain(entry.id);
          expect(content).toContain(entry.timestamp);
          expect(content).toContain(entry.rationale);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 9: Log entry content completeness
   * Validates: Requirements 4.2, 4.5
   * 
   * For any generated log entries, the system should include change descriptions, 
   * affected files, rationale, consistent formatting, and relevant metadata
   */
  it('should include complete content with consistent formatting in log entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          triggerType: fc.constantFrom('git-hook', 'manual'),
          changedFiles: fc.array(
            fc.record({
              path: fc.string({ minLength: 5, maxLength: 50 }),
              changeType: fc.constantFrom('added', 'modified', 'deleted'),
              diffContent: fc.string({ minLength: 20, maxLength: 300 }),
              extractedFunctions: fc.array(
                fc.record({
                  name: fc.string({ minLength: 3, maxLength: 25 }),
                  parameters: fc.array(fc.record({
                    name: fc.string({ minLength: 1, maxLength: 15 }),
                    type: fc.constantFrom('string', 'number', 'boolean', 'object'),
                    optional: fc.boolean()
                  })),
                  returnType: fc.constantFrom('string', 'number', 'void', 'Promise<any>', 'boolean'),
                  isExported: fc.boolean()
                }),
                { minLength: 0, maxLength: 4 }
              ),
              extractedClasses: fc.array(
                fc.record({
                  name: fc.string({ minLength: 3, maxLength: 25 }),
                  methods: fc.array(fc.record({
                    name: fc.string({ minLength: 3, maxLength: 20 }),
                    parameters: fc.array(fc.record({
                      name: fc.string({ minLength: 1, maxLength: 15 }),
                      type: fc.string({ minLength: 3, maxLength: 15 }),
                      optional: fc.boolean()
                    })),
                    returnType: fc.string({ minLength: 3, maxLength: 15 }),
                    isExported: fc.boolean()
                  })),
                  properties: fc.array(fc.record({
                    name: fc.string({ minLength: 3, maxLength: 20 }),
                    type: fc.string({ minLength: 3, maxLength: 15 }),
                    visibility: fc.constantFrom('public', 'private', 'protected')
                  })),
                  isExported: fc.boolean()
                }),
                { minLength: 0, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 6 }
          ),
          extractedAPIs: fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 30 }),
              method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
              path: fc.option(fc.string({ minLength: 1, maxLength: 40 })),
              parameters: fc.array(fc.record({
                name: fc.string({ minLength: 1, maxLength: 15 }),
                type: fc.string({ minLength: 3, maxLength: 15 }),
                optional: fc.boolean()
              })),
              returnType: fc.string({ minLength: 3, maxLength: 20 })
            }),
            { minLength: 0, maxLength: 4 }
          ),
          newFeatures: fc.array(
            fc.record({
              name: fc.string({ minLength: 5, maxLength: 35 }),
              description: fc.string({ minLength: 20, maxLength: 150 }),
              affectedFiles: fc.array(fc.string({ minLength: 5, maxLength: 40 }), { minLength: 1, maxLength: 5 }),
              category: fc.constantFrom('new', 'enhanced', 'deprecated')
            }),
            { minLength: 0, maxLength: 4 }
          ),
          architecturalChanges: fc.array(
            fc.record({
              type: fc.constantFrom('component-added', 'component-modified', 'component-removed', 'pattern-changed'),
              component: fc.string({ minLength: 5, maxLength: 30 }),
              description: fc.string({ minLength: 20, maxLength: 120 }),
              impact: fc.constantFrom('low', 'medium', 'high')
            }),
            { minLength: 0, maxLength: 4 }
          ),
          documentationRequirements: fc.array(
            fc.record({
              type: fc.constantFrom('api-spec', 'readme-section', 'dev-log', 'steering-file'),
              targetFile: fc.string({ minLength: 5, maxLength: 40 }),
              section: fc.option(fc.string({ minLength: 3, maxLength: 25 })),
              content: fc.string({ minLength: 20, maxLength: 200 }),
              priority: fc.constantFrom('high', 'medium', 'low')
            }),
            { minLength: 1, maxLength: 6 }
          )
        }),
        fc.string({ minLength: 20, maxLength: 300 }), // rationale
        async (analysisData, rationale) => {
          const analysis: ChangeAnalysis = {
            timestamp: new Date().toISOString(),
            ...analysisData
          };

          // Create and store log entry
          const entry = await logger.createLogEntry(analysis, rationale);
          await logger.storeLogEntry(entry);

          // Read the stored content
          const files = await fs.readdir(testLogDir);
          const logFile = files.find(f => f.startsWith('dev-log-') && f.endsWith('.md'));
          expect(logFile).toBeDefined();

          const filePath = join(testLogDir, logFile!);
          const content = await fs.readFile(filePath, 'utf-8');

          // Verify all required content sections are present
          expect(content).toContain('## Log Entry:');
          expect(content).toContain('**Timestamp:**');
          expect(content).toContain('**Session:**');
          expect(content).toContain('**Trigger:**');
          expect(content).toContain('**Changes:**');
          expect(content).toContain('**Affected Files:**');
          expect(content).toContain('**Rationale:**');
          expect(content).toContain('**Metadata:**');

          // Verify specific content is included
          expect(content).toContain(entry.id);
          expect(content).toContain(entry.timestamp);
          expect(content).toContain(entry.sessionId);
          expect(content).toContain(entry.rationale);
          expect(content).toContain(analysis.triggerType);

          // Verify change descriptions are included
          entry.changeDescriptions.forEach(desc => {
            expect(content).toContain(desc);
          });

          // Verify affected files are listed
          entry.affectedFiles.forEach(file => {
            expect(content).toContain(file);
          });

          // Verify metadata fields are present
          expect(content).toContain('- Author:');
          expect(content).toContain('- Commit:');
          expect(content).toContain('- Analysis Time:');
          expect(content).toContain('- Version:');

          // Verify consistent markdown formatting
          const lines = content.split('\n');
          const headerLine = lines.find(line => line.startsWith('## Log Entry:'));
          expect(headerLine).toBeDefined();

          const boldSections = content.match(/\*\*[^*]+\*\*/g) || [];
          expect(boldSections.length).toBeGreaterThanOrEqual(7); // At least 7 bold sections

          // Verify structure consistency - each section should be properly formatted
          expect(content).toMatch(/\*\*Timestamp:\*\* \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
          expect(content).toMatch(/\*\*Session:\*\* session-\d+-[a-z0-9]+/);
          expect(content).toMatch(/\*\*Trigger:\*\* (git-hook|manual)/);

          // Verify lists are properly formatted with dashes
          if (entry.changeDescriptions.length > 0) {
            entry.changeDescriptions.forEach(desc => {
              expect(content).toContain(`- ${desc}`);
            });
          }

          if (entry.affectedFiles.length > 0) {
            entry.affectedFiles.forEach(file => {
              expect(content).toContain(`- ${file}`);
            });
          }

          // Verify metadata list formatting
          expect(content).toMatch(/- Author: .*/);
          expect(content).toMatch(/- Commit: .*/);
          expect(content).toMatch(/- Analysis Time: \d+ms/);
          expect(content).toMatch(/- Version: .*/);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 10: Related change grouping
   * Validates: Requirements 4.3
   * 
   * For any multiple changes occurring in a single session, the system should group 
   * related modifications in one log entry rather than creating separate entries
   */
  it('should group related changes in single sessions based on timing and session ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') }),
            sessionId: fc.string({ minLength: 10, maxLength: 30 }),
            rationale: fc.string({ minLength: 10, maxLength: 100 }),
            changeCount: fc.integer({ min: 1, max: 5 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        async (entrySpecs) => {
          // Create log entries with controlled timing and session IDs
          const entries: LogEntry[] = [];
          
          for (const spec of entrySpecs) {
            const entry: LogEntry = {
              id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: spec.timestamp.toISOString(),
              sessionId: spec.sessionId,
              changeDescriptions: Array.from({ length: spec.changeCount }, (_, i) => 
                `Change ${i + 1}: Modified component`
              ),
              affectedFiles: Array.from({ length: spec.changeCount }, (_, i) => 
                `src/component${i + 1}.ts`
              ),
              rationale: spec.rationale,
              metadata: {
                triggerType: 'manual',
                version: '1.0.0',
                analysisTime: 100
              }
            };
            entries.push(entry);
          }

          // Sort entries by timestamp for proper grouping logic
          entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          // Apply grouping logic
          const groupedEntries = await logger.groupRelatedChanges(entries);

          // Verify grouping behavior
          expect(Array.isArray(groupedEntries)).toBe(true);
          expect(groupedEntries.length).toBeLessThanOrEqual(entries.length);

          // Verify that entries with the same session ID and close timestamps are grouped
          const sessionGroups = new Map<string, LogEntry[]>();
          entries.forEach(entry => {
            if (!sessionGroups.has(entry.sessionId)) {
              sessionGroups.set(entry.sessionId, []);
            }
            sessionGroups.get(entry.sessionId)!.push(entry);
          });

          // Check grouping logic for each session
          sessionGroups.forEach((sessionEntries, sessionId) => {
            if (sessionEntries.length > 1) {
              // Check if entries in the same session within time window are grouped
              const sortedSessionEntries = sessionEntries.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
              );

              let expectedGroups = 0;
              let currentGroupStart = 0;
              const groupingWindow = config.groupingTimeWindow * 60 * 1000;

              for (let i = 1; i < sortedSessionEntries.length; i++) {
                const timeDiff = new Date(sortedSessionEntries[i].timestamp).getTime() - 
                                new Date(sortedSessionEntries[currentGroupStart].timestamp).getTime();
                
                if (timeDiff > groupingWindow) {
                  expectedGroups++;
                  currentGroupStart = i;
                }
              }
              expectedGroups++; // Add the last group

              // Find grouped entries for this session in the result
              const sessionGroupedEntries = groupedEntries.filter(entry => 
                entry.sessionId === sessionId || 
                (entry.groupedChanges && entry.groupedChanges.some(gc => gc.sessionId === sessionId))
              );

              // Verify that grouping occurred when expected
              if (sortedSessionEntries.length > 1) {
                const hasGroupedChanges = sessionGroupedEntries.some(entry => 
                  entry.groupedChanges && entry.groupedChanges.length > 0
                );
                
                // If entries are within grouping window, they should be grouped
                const allWithinWindow = sortedSessionEntries.every((entry, index) => {
                  if (index === 0) return true;
                  const timeDiff = new Date(entry.timestamp).getTime() - 
                                  new Date(sortedSessionEntries[0].timestamp).getTime();
                  return timeDiff <= groupingWindow;
                });

                if (allWithinWindow && sortedSessionEntries.length > 1) {
                  expect(hasGroupedChanges).toBe(true);
                }
              }
            }
          });

          // Verify grouped entries maintain all original information
          groupedEntries.forEach(entry => {
            expect(entry).toHaveProperty('id');
            expect(entry).toHaveProperty('timestamp');
            expect(entry).toHaveProperty('sessionId');
            expect(entry).toHaveProperty('changeDescriptions');
            expect(entry).toHaveProperty('affectedFiles');
            expect(entry).toHaveProperty('rationale');
            expect(entry).toHaveProperty('metadata');

            // If this entry has grouped changes, verify structure
            if (entry.groupedChanges && entry.groupedChanges.length > 0) {
              expect(Array.isArray(entry.groupedChanges)).toBe(true);
              
              // Verify that grouped changes have the same session ID
              entry.groupedChanges.forEach(groupedChange => {
                expect(groupedChange.sessionId).toBe(entry.sessionId);
              });

              // Verify that change descriptions and affected files are merged
              const totalOriginalChanges = 1 + entry.groupedChanges.length; // Main entry + grouped
              expect(entry.changeDescriptions.length).toBeGreaterThanOrEqual(1);
              expect(entry.affectedFiles.length).toBeGreaterThanOrEqual(1);

              // Verify rationale is combined
              expect(entry.rationale).toContain(';'); // Should contain separator for combined rationales
            }
          });

          // Verify no data loss - all original change descriptions should be preserved
          const originalChangeCount = entries.reduce((sum, entry) => sum + entry.changeDescriptions.length, 0);
          const groupedChangeCount = groupedEntries.reduce((sum, entry) => sum + entry.changeDescriptions.length, 0);
          expect(groupedChangeCount).toBe(originalChangeCount);

          // Verify no duplicate files in grouped entries
          groupedEntries.forEach(entry => {
            const uniqueFiles = new Set(entry.affectedFiles);
            expect(uniqueFiles.size).toBe(entry.affectedFiles.length);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});