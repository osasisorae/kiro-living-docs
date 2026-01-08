/**
 * Property-based tests for Output Manager
 * Feature: auto-doc-sync
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs/promises';
import * as path from 'path';
import { OutputManager } from './manager';
import { DocumentationRequirement } from '../types';
import { OutputConfig } from './types';

describe('OutputManager Property Tests', () => {
  const testDir = path.join(__dirname, '../../test-output');
  let outputManager: OutputManager;

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
    
    const config: OutputConfig = {
      preserveFormatting: true,
      backupFiles: false,
      validateOutput: true
    };
    outputManager = new OutputManager(config);
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  /**
   * Property 6: Formatting and structure preservation
   * **Feature: auto-doc-sync, Property 6: Formatting and structure preservation**
   * **Validates: Requirements 2.4, 3.4, 6.4**
   */
  it('should preserve markdown formatting and structure when updating sections', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate original markdown content with various formatting
        fc.record({
          headers: fc.array(fc.record({
            level: fc.integer({ min: 1, max: 6 }),
            title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('\n')),
            content: fc.string({ minLength: 0, maxLength: 200 })
          }), { minLength: 1, maxLength: 5 }),
          lineEnding: fc.constantFrom('\n', '\r\n'),
          indentation: fc.constantFrom('', '  ', '    ', '\t'),
          emptyLines: fc.boolean()
        }),
        // Generate section update
        fc.record({
          sectionName: fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\n')),
          newContent: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async (original, update) => {
          // Create original markdown content
          const originalContent = original.headers.map(header => 
            `${'#'.repeat(header.level)} ${header.title}${original.lineEnding}${original.lineEnding}${header.content}`
          ).join(original.lineEnding + (original.emptyLines ? original.lineEnding : ''));

          const testFile = path.join(testDir, `test-${Date.now()}-${Math.random()}.md`);
          await fs.writeFile(testFile, originalContent);

          // Update a section
          const requirement: DocumentationRequirement = {
            type: 'readme-section',
            targetFile: testFile,
            section: update.sectionName,
            content: update.newContent,
            priority: 'medium'
          };

          const results = await outputManager.writeDocumentation([requirement]);
          expect(results[0].success).toBe(true);

          // Read updated content
          const updatedContent = await fs.readFile(testFile, 'utf8');

          // Verify line endings are preserved
          if (originalContent.includes('\r\n')) {
            expect(updatedContent.includes('\r\n')).toBe(true);
          }

          // Verify structure is maintained (headers still exist)
          const originalHeaders = originalContent.match(/^#{1,6}\s+.+$/gm) || [];
          const updatedHeaders = updatedContent.match(/^#{1,6}\s+.+$/gm) || [];
          
          // Should have at least the same number of headers (or one more if section was added)
          expect(updatedHeaders.length).toBeGreaterThanOrEqual(originalHeaders.length);

          // Verify content was actually updated
          expect(updatedContent).toContain(update.newContent);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 7: Post-update validation
   * **Feature: auto-doc-sync, Property 7: Post-update validation**
   * **Validates: Requirements 2.5, 3.5**
   */
  it('should validate generated content and ensure links remain valid', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate markdown content with links
        fc.record({
          content: fc.string({ minLength: 10, maxLength: 200 }),
          links: fc.array(fc.record({
            text: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.includes(']')),
            url: fc.oneof(
              fc.string({ minLength: 1, maxLength: 30 }).map(s => `https://example.com/${s}`),
              fc.string({ minLength: 1, maxLength: 20 }).map(s => `./docs/${s}.md`),
              fc.string({ minLength: 1, maxLength: 20 }).map(s => `../src/${s}.ts`)
            )
          }), { minLength: 0, maxLength: 3 })
        }),
        async (data) => {
          // Create content with links
          let content = data.content;
          const createdFiles: string[] = [];
          
          for (const link of data.links) {
            content += `\n[${link.text}](${link.url})`;
            
            // Create actual files for relative links to make them valid
            if (link.url.startsWith('./') || link.url.startsWith('../')) {
              const testFile = path.join(testDir, `test-${Date.now()}-${Math.random()}.md`);
              const linkPath = path.resolve(path.dirname(testFile), link.url);
              await fs.mkdir(path.dirname(linkPath), { recursive: true });
              await fs.writeFile(linkPath, 'test content');
              createdFiles.push(linkPath);
            }
          }

          const testFile = path.join(testDir, `test-${Date.now()}-${Math.random()}.md`);
          
          const requirement: DocumentationRequirement = {
            type: 'readme-section',
            targetFile: testFile,
            content,
            priority: 'high'
          };

          const results = await outputManager.writeDocumentation([requirement]);
          
          // Should succeed for valid content
          expect(results[0].success).toBe(true);
          expect(results[0].errors).toHaveLength(0);

          // Verify file was created and contains expected content
          const writtenContent = await fs.readFile(testFile, 'utf8');
          expect(writtenContent).toBe(content);

          // Verify all links are preserved
          for (const link of data.links) {
            expect(writtenContent).toContain(`[${link.text}](${link.url})`);
          }

          // Clean up created files
          for (const file of createdFiles) {
            try {
              await fs.unlink(file);
            } catch {
              // Ignore cleanup errors
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property test for atomic operations
   */
  it('should perform atomic write operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }),
        async (content) => {
          const testFile = path.join(testDir, `atomic-test-${Date.now()}-${Math.random()}.md`);
          
          const requirement: DocumentationRequirement = {
            type: 'api-spec',
            targetFile: testFile,
            content,
            priority: 'high'
          };

          const results = await outputManager.writeDocumentation([requirement]);
          
          if (results[0].success) {
            // File should exist and contain exactly the expected content
            const writtenContent = await fs.readFile(testFile, 'utf8');
            expect(writtenContent).toBe(content);
            
            // No temporary files should remain
            const tempFile = `${testFile}.tmp`;
            await expect(fs.access(tempFile)).rejects.toThrow();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});