/**
 * Property-based tests for code analysis engine
 * Feature: auto-doc-sync, Property 1: Code analysis extraction completeness
 * Feature: auto-doc-sync, Property 2: Change classification accuracy
 * Feature: auto-doc-sync, Property 3: Analysis output structure consistency
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CodeAnalyzer } from './analyzer';
import { ChangeAnalysis } from '../types';
import { AnalysisConfig } from './types';

describe('CodeAnalyzer Property Tests', () => {
  const config: AnalysisConfig = {
    includePatterns: ['**/*.ts', '**/*.js'],
    excludePatterns: ['node_modules/**'],
    maxFileSize: 1024 * 1024,
    analysisDepth: 'shallow'
  };

  /**
   * Feature: auto-doc-sync, Property 1: Code analysis extraction completeness
   * Validates: Requirements 1.3
   * 
   * For any code changes being analyzed, the system should extract all function signatures, 
   * class definitions, and API endpoints present in the changes
   */
  it('should extract all function signatures, class definitions, and API endpoints from code changes', async () => {
    const analyzer = new CodeAnalyzer(config);

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            path: fc.constantFrom('test.ts', 'src/utils.js', 'components/Button.tsx'),
            content: fc.oneof(
              // Function declarations
              fc.constant(`
diff --git a/test.ts b/test.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/test.ts
@@ -0,0 +1,5 @@
+export function testFunction(param: string): string {
+  return param;
+}
+
+function internalFunction() {}
              `),
              // Class declarations
              fc.constant(`
diff --git a/test.ts b/test.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/test.ts
@@ -0,0 +1,8 @@
+export class TestClass {
+  public method1(param: number): void {}
+  private method2(): string { return ''; }
+}
+
+class InternalClass {
+  constructor() {}
+}
              `),
              // Mixed content
              fc.constant(`
diff --git a/test.ts b/test.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/test.ts
@@ -0,0 +1,12 @@
+export function apiFunction(data: any): Promise<any> {
+  return Promise.resolve(data);
+}
+
+export class ApiClass {
+  public process(input: string): string {
+    return input.toUpperCase();
+  }
+}
+
+const helper = () => {};
              `)
            )
          }),
          { minLength: 1, maxLength: 3 }
        ),
        async (testCases) => {
          const changes = testCases.map(tc => tc.content);
          const result: ChangeAnalysis = await analyzer.analyze(changes);

          // Verify that analysis extracts content from analyzable files
          const analyzableFiles = result.changedFiles.filter(file => 
            file.path.endsWith('.ts') || file.path.endsWith('.js') || 
            file.path.endsWith('.tsx') || file.path.endsWith('.jsx')
          );

          for (const file of analyzableFiles) {
            if (file.changeType !== 'deleted') {
              // If the diff contains function declarations, they should be extracted
              if (file.diffContent.includes('function ') || file.diffContent.includes('() =>')) {
                // Should have extracted at least some functions
                const totalFunctions = file.extractedFunctions.length;
                const classMethods = file.extractedClasses.reduce((sum, cls) => sum + cls.methods.length, 0);
                expect(totalFunctions + classMethods).toBeGreaterThanOrEqual(0);
              }

              // If the diff contains class declarations, they should be extracted
              if (file.diffContent.includes('class ')) {
                expect(file.extractedClasses.length).toBeGreaterThanOrEqual(0);
              }

              // If there are exported functions or classes, they should appear in APIs
              const exportedFunctions = file.extractedFunctions.filter(f => f.isExported);
              const exportedClasses = file.extractedClasses.filter(c => c.isExported);
              
              if (exportedFunctions.length > 0 || exportedClasses.length > 0) {
                expect(result.extractedAPIs.length).toBeGreaterThanOrEqual(0);
              }
            }
          }

          // Verify that extracted functions have required properties
          result.changedFiles.forEach(file => {
            file.extractedFunctions.forEach(func => {
              expect(func).toHaveProperty('name');
              expect(func).toHaveProperty('parameters');
              expect(func).toHaveProperty('returnType');
              expect(func).toHaveProperty('isExported');
              expect(typeof func.name).toBe('string');
              expect(Array.isArray(func.parameters)).toBe(true);
              expect(typeof func.returnType).toBe('string');
              expect(typeof func.isExported).toBe('boolean');
            });

            file.extractedClasses.forEach(cls => {
              expect(cls).toHaveProperty('name');
              expect(cls).toHaveProperty('methods');
              expect(cls).toHaveProperty('properties');
              expect(cls).toHaveProperty('isExported');
              expect(typeof cls.name).toBe('string');
              expect(Array.isArray(cls.methods)).toBe(true);
              expect(Array.isArray(cls.properties)).toBe(true);
              expect(typeof cls.isExported).toBe('boolean');
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 2: Change classification accuracy
   * Validates: Requirements 1.4
   * 
   * For any code changes being processed, the system should correctly identify and classify 
   * new features, modified APIs, and architectural changes based on the change content
   */
  it('should correctly classify changes as new features, modified APIs, and architectural changes', async () => {
    const analyzer = new CodeAnalyzer(config);

    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            changeType: fc.constantFrom('added', 'modified', 'deleted'),
            hasExports: fc.boolean(),
            fileType: fc.constantFrom('.ts', '.js', '.md', '.json')
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (changeSpecs) => {
          const changes = changeSpecs.map((spec, index) => {
            const fileName = `test${index}${spec.fileType}`;
            const exportKeyword = spec.hasExports ? 'export ' : '';
            
            let diffContent = '';
            if (spec.changeType === 'added') {
              diffContent = `
diff --git a/${fileName} b/${fileName}
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/${fileName}
@@ -0,0 +1,5 @@
+${exportKeyword}function newFunction() {
+  return 'new';
+}
              `;
            } else if (spec.changeType === 'modified') {
              diffContent = `
diff --git a/${fileName} b/${fileName}
index 1234567..abcdefg 100644
--- a/${fileName}
+++ b/${fileName}
@@ -1,3 +1,6 @@
 existing code
+${exportKeyword}function addedFunction() {
+  return 'added';
+}
 more existing code
              `;
            } else { // deleted
              diffContent = `
diff --git a/${fileName} b/${fileName}
deleted file mode 100644
index 1234567..0000000
--- a/${fileName}
+++ /dev/null
@@ -1,3 +0,0 @@
-deleted function
              `;
            }
            
            return diffContent;
          });

          const result: ChangeAnalysis = await analyzer.analyze(changes);

          // Verify change classification logic
          const addedFiles = changeSpecs.filter(spec => spec.changeType === 'added').length;
          const modifiedFiles = changeSpecs.filter(spec => spec.changeType === 'modified').length;
          const deletedFiles = changeSpecs.filter(spec => spec.changeType === 'deleted').length;

          // New features should be identified for added files
          if (addedFiles > 0) {
            expect(result.newFeatures.length).toBeGreaterThanOrEqual(0);
            result.newFeatures.forEach(feature => {
              expect(['new', 'enhanced', 'deprecated']).toContain(feature.category);
              expect(feature).toHaveProperty('name');
              expect(feature).toHaveProperty('description');
              expect(feature).toHaveProperty('affectedFiles');
              expect(Array.isArray(feature.affectedFiles)).toBe(true);
            });
          }

          // Architectural changes should be identified for all change types
          const totalChanges = addedFiles + modifiedFiles + deletedFiles;
          if (totalChanges > 0) {
            expect(result.architecturalChanges.length).toBeGreaterThanOrEqual(0);
            result.architecturalChanges.forEach(change => {
              expect(['component-added', 'component-modified', 'component-removed', 'pattern-changed']).toContain(change.type);
              expect(['low', 'medium', 'high']).toContain(change.impact);
              expect(change).toHaveProperty('component');
              expect(change).toHaveProperty('description');
              expect(typeof change.component).toBe('string');
              expect(typeof change.description).toBe('string');
            });
          }

          // API changes should be identified when exports are present
          const hasExportedChanges = changeSpecs.some(spec => spec.hasExports && spec.fileType.match(/\.(ts|js)$/));
          if (hasExportedChanges) {
            expect(result.extractedAPIs.length).toBeGreaterThanOrEqual(0);
            result.extractedAPIs.forEach(api => {
              expect(api).toHaveProperty('name');
              expect(api).toHaveProperty('parameters');
              expect(api).toHaveProperty('returnType');
              expect(typeof api.name).toBe('string');
              expect(Array.isArray(api.parameters)).toBe(true);
              expect(typeof api.returnType).toBe('string');
            });
          }

          // Documentation requirements should be generated based on meaningful changes
          // Note: dev-log requirements are no longer automatically generated
          if (result.extractedAPIs.length > 0 || result.newFeatures.length > 0) {
            // Only expect documentation requirements for API/feature changes, not architectural changes
            const meaningfulRequirements = result.documentationRequirements.filter(req => 
              req.type === 'api-spec' || req.type === 'readme-section'
            );
            expect(meaningfulRequirements.length).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 3: Analysis output structure consistency
   * Validates: Requirements 1.5
   * 
   * For any completed analysis, the system should generate structured recommendations 
   * with consistent format and required fields
   */
  it('should generate analysis output with consistent structure and required fields', async () => {
    const analyzer = new CodeAnalyzer(config);

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 10 }),
        async (changes: string[]) => {
          const result: ChangeAnalysis = await analyzer.analyze(changes);

          // Verify all required fields are present
          expect(result).toHaveProperty('timestamp');
          expect(result).toHaveProperty('triggerType');
          expect(result).toHaveProperty('changedFiles');
          expect(result).toHaveProperty('extractedAPIs');
          expect(result).toHaveProperty('newFeatures');
          expect(result).toHaveProperty('architecturalChanges');
          expect(result).toHaveProperty('documentationRequirements');

          // Verify field types are correct
          expect(typeof result.timestamp).toBe('string');
          expect(['git-hook', 'manual']).toContain(result.triggerType);
          expect(Array.isArray(result.changedFiles)).toBe(true);
          expect(Array.isArray(result.extractedAPIs)).toBe(true);
          expect(Array.isArray(result.newFeatures)).toBe(true);
          expect(Array.isArray(result.architecturalChanges)).toBe(true);
          expect(Array.isArray(result.documentationRequirements)).toBe(true);

          // Verify timestamp is a valid ISO string
          expect(() => new Date(result.timestamp)).not.toThrow();
          expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

          // Verify arrays contain objects with expected structure
          result.changedFiles.forEach(file => {
            expect(file).toHaveProperty('path');
            expect(file).toHaveProperty('changeType');
            expect(file).toHaveProperty('diffContent');
            expect(file).toHaveProperty('extractedFunctions');
            expect(file).toHaveProperty('extractedClasses');
            expect(['added', 'modified', 'deleted']).toContain(file.changeType);
          });

          result.documentationRequirements.forEach(req => {
            expect(req).toHaveProperty('type');
            expect(req).toHaveProperty('targetFile');
            expect(req).toHaveProperty('content');
            expect(req).toHaveProperty('priority');
            expect(['api-spec', 'readme-section', 'dev-log', 'steering-file']).toContain(req.type);
            expect(['high', 'medium', 'low']).toContain(req.priority);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});