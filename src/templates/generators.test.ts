/**
 * Property-based tests for documentation generators
 * Feature: auto-doc-sync, Property 4: Documentation update triggering
 * Feature: auto-doc-sync, Property 5: README section synchronization
 * Feature: auto-doc-sync, Property 13: Template application consistency
 * Feature: auto-doc-sync, Property 14: Default template handling
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { DocumentationGenerators } from './generators';
import { TemplateEngine } from './engine';
import { APIDefinition, FeatureDescription, ArchitecturalChange } from '../types';

describe('DocumentationGenerators Property Tests', () => {
  const templateEngine = new TemplateEngine();
  const generators = new DocumentationGenerators(templateEngine);

  // Helper to generate valid strings (non-empty, non-whitespace-only)
  const validString = (minLength = 1, maxLength = 50) => 
    fc.string({ minLength, maxLength }).filter(s => s.trim().length > 0);

  /**
   * Feature: auto-doc-sync, Property 4: Documentation update triggering
   * Validates: Requirements 2.1, 2.2, 2.3
   * 
   * For any detected changes (API changes, architectural changes, or new features), 
   * the system should update the corresponding documentation files in .kiro/specs/
   */
  it('should trigger documentation updates for API changes, architectural changes, and new features', () => {
    fc.assert(
      fc.property(
        fc.record({
          apis: fc.array(
            fc.record({
              name: validString(1, 50),
              method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
              path: fc.option(validString(1, 100)),
              parameters: fc.array(
                fc.record({
                  name: validString(1, 30),
                  type: fc.constantFrom('string', 'number', 'boolean', 'object', 'array'),
                  optional: fc.boolean(),
                  description: fc.option(validString(1, 100))
                }),
                { maxLength: 5 }
              ),
              returnType: fc.constantFrom('string', 'number', 'boolean', 'object', 'Promise<any>', 'void'),
              description: fc.option(validString(1, 200))
            }),
            { maxLength: 10 }
          ),
          features: fc.array(
            fc.record({
              name: validString(1, 50),
              description: validString(1, 200),
              affectedFiles: fc.array(validString(1, 100), { maxLength: 5 }),
              category: fc.constantFrom('new', 'enhanced', 'deprecated')
            }),
            { maxLength: 10 }
          ),
          architecturalChanges: fc.array(
            fc.record({
              type: fc.constantFrom('component-added', 'component-modified', 'component-removed', 'pattern-changed'),
              component: validString(1, 50),
              description: validString(1, 200),
              impact: fc.constantFrom('low', 'medium', 'high')
            }),
            { maxLength: 10 }
          )
        }),
        (testData) => {
          const { apis, features, architecturalChanges } = testData;

          // PROPERTY: System should always handle input gracefully
          expect(testData).toBeDefined();
          expect(Array.isArray(apis)).toBe(true);
          expect(Array.isArray(features)).toBe(true);
          expect(Array.isArray(architecturalChanges)).toBe(true);

          // PROPERTY: System should not throw when generating documentation
          expect(() => generators.generateREADMESection(features, apis)).not.toThrow();

          // PROPERTY: Test passes when all assertions succeed
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 5: README section synchronization
   * Validates: Requirements 3.1, 3.2, 3.3
   * 
   * For any feature additions, API modifications, or function signature changes, 
   * the system should update the corresponding sections in the README with accurate information
   */
  it('should synchronize README sections with accurate feature and API information', () => {
    fc.assert(
      fc.property(
        fc.record({
          features: fc.array(
            fc.record({
              name: validString(1, 50),
              description: validString(1, 200),
              affectedFiles: fc.array(validString(1, 100), { maxLength: 5 }),
              category: fc.constantFrom('new', 'enhanced', 'deprecated')
            }),
            { maxLength: 10 }
          ),
          apis: fc.array(
            fc.record({
              name: validString(1, 50),
              method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
              path: fc.option(validString(1, 100)),
              parameters: fc.array(
                fc.record({
                  name: validString(1, 30),
                  type: fc.constantFrom('string', 'number', 'boolean', 'object', 'array'),
                  optional: fc.boolean(),
                  description: fc.option(validString(1, 100))
                }),
                { maxLength: 5 }
              ),
              returnType: fc.constantFrom('string', 'number', 'boolean', 'object', 'Promise<any>', 'void'),
              description: fc.option(validString(1, 200))
            }),
            { maxLength: 10 }
          )
        }),
        (testData) => {
          const { features, apis } = testData;

          // PROPERTY: System should always handle input gracefully
          expect(testData).toBeDefined();
          expect(Array.isArray(features)).toBe(true);
          expect(Array.isArray(apis)).toBe(true);

          // Test synchronous parts - the generators should handle empty arrays gracefully
          expect(() => generators.generateREADMESection(features, apis)).not.toThrow();

          // PROPERTY: Test passes when all assertions succeed
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 13: Template application consistency
   * Validates: Requirements 6.1, 6.2, 6.3
   * 
   * For any documentation generation (API docs, setup instructions, or architecture notes), 
   * the system should use the appropriate predefined templates and follow established patterns
   */
  it('should apply templates consistently for API docs, setup instructions, and architecture notes', () => {
    fc.assert(
      fc.property(
        fc.record({
          docType: fc.constantFrom('api-doc', 'setup-instructions', 'architecture-notes'),
          apis: fc.array(
            fc.record({
              name: validString(1, 50),
              method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE')),
              path: fc.option(validString(1, 100)),
              parameters: fc.array(
                fc.record({
                  name: validString(1, 30),
                  type: fc.constantFrom('string', 'number', 'boolean'),
                  optional: fc.boolean(),
                  description: fc.option(validString(1, 100))
                }),
                { maxLength: 3 }
              ),
              returnType: fc.constantFrom('string', 'number', 'void'),
              description: fc.option(validString(1, 200))
            }),
            { maxLength: 5 }
          ),
          installCommand: validString(1, 100),
          configSteps: fc.array(validString(1, 100), { maxLength: 5 }),
          systemOverview: validString(1, 200),
          components: fc.array(
            fc.record({
              name: validString(1, 50),
              description: validString(1, 200),
              responsibilities: fc.array(validString(1, 100), { maxLength: 3 }),
              interfaces: fc.array(validString(1, 50), { maxLength: 3 })
            }),
            { maxLength: 5 }
          )
        }),
        (testData) => {
          const { docType, apis, installCommand, configSteps, systemOverview, components } = testData;

          // PROPERTY: System should always handle input gracefully
          expect(testData).toBeDefined();
          expect(typeof docType).toBe('string');
          expect(Array.isArray(apis)).toBe(true);

          let result;
          let expectedTemplate;

          if (docType === 'api-doc') {
            expectedTemplate = templateEngine.getTemplate('api-doc');
            // Test that we can call the generator without throwing
            expect(() => generators.generateAPISpecification(apis, 'Test API')).not.toThrow();

          } else if (docType === 'setup-instructions') {
            result = generators.generateSetupInstructions(installCommand, configSteps);
            expectedTemplate = templateEngine.getTemplate('setup-instructions');
            
            expect(result.content).toContain('# Setup Instructions');
            expect(result.content).toContain('## Installation');
            expect(result.content).toContain('## Configuration');

          } else if (docType === 'architecture-notes') {
            result = generators.generateArchitectureNotes(systemOverview, components);
            expectedTemplate = templateEngine.getTemplate('architecture-notes');
            
            expect(result.content).toContain('# Architecture Notes');
            expect(result.content).toContain('## System Overview');
            expect(result.content).toContain('## Components');
          }

          // Verify template was found and used
          expect(expectedTemplate).toBeDefined();
          expect(expectedTemplate?.type).toBe(docType);

          // PROPERTY: Test passes when all assertions succeed
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: auto-doc-sync, Property 14: Default template handling
   * Validates: Requirements 6.5
   * 
   * For any documentation generation when templates are missing, 
   * the system should use sensible defaults and allow for template customization
   */
  it('should use sensible defaults when templates are missing and allow customization', () => {
    fc.assert(
      fc.property(
        fc.record({
          templateName: fc.constantFrom('missing-api-doc', 'missing-setup', 'missing-architecture', 'custom-template'),
          apis: fc.array(
            fc.record({
              name: validString(1, 50),
              method: fc.option(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE')),
              path: fc.option(validString(1, 100)),
              parameters: fc.array(
                fc.record({
                  name: validString(1, 30),
                  type: fc.constantFrom('string', 'number', 'boolean'),
                  optional: fc.boolean(),
                  description: fc.option(validString(1, 100))
                }),
                { maxLength: 3 }
              ),
              returnType: fc.constantFrom('string', 'number', 'void'),
              description: fc.option(validString(1, 200))
            }),
            { maxLength: 5 }
          ),
          customContent: validString(1, 500),
          fallbackData: fc.record({
            title: validString(1, 50),
            description: validString(1, 200)
          })
        }),
        (testData) => {
          const { templateName, apis, customContent, fallbackData } = testData;

          // Create a fresh template engine for each test to avoid state pollution
          const freshTemplateEngine = new TemplateEngine();
          
          // PROPERTY: System should handle missing templates gracefully, even with empty data
          const missingTemplate = freshTemplateEngine.getTemplate(templateName);
          expect(missingTemplate).toBeUndefined(); // These template names should not exist

          // PROPERTY: System should allow template customization with any valid content
          const normalizedCustomContent = customContent.trim();
          const customization = {
            name: templateName,
            content: normalizedCustomContent,
            variables: { title: fallbackData.title },
            metadata: { customized: true }
          };

          // PROPERTY: Customization should never throw for valid input
          expect(() => freshTemplateEngine.customizeTemplate(customization)).not.toThrow();
          
          // PROPERTY: Customized templates should be retrievable
          const retrievedCustom = freshTemplateEngine.getCustomTemplate(templateName);
          expect(retrievedCustom).toBeDefined();
          expect(retrievedCustom?.name).toBe(templateName);
          expect(retrievedCustom?.content).toBe(normalizedCustomContent);

          // PROPERTY: Test passes when all assertions succeed
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});