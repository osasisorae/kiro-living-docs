/**
 * Property-based tests for analysis output structure
 * Feature: auto-doc-sync, Property 3: Analysis output structure consistency
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CodeAnalyzer } from './analyzer';
import { ChangeAnalysis } from '../types';
import { AnalysisConfig } from './types';

describe('CodeAnalyzer Property Tests', () => {
  /**
   * Feature: auto-doc-sync, Property 3: Analysis output structure consistency
   * Validates: Requirements 1.5
   * 
   * For any completed analysis, the system should generate structured recommendations 
   * with consistent format and required fields
   */
  it('should generate analysis output with consistent structure and required fields', async () => {
    const config: AnalysisConfig = {
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['node_modules/**'],
      maxFileSize: 1024 * 1024,
      analysisDepth: 'shallow'
    };

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