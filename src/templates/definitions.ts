/**
 * Template definitions for kiro-docs init command
 * Defines the file structures for minimal, standard, and comprehensive templates
 */

export type TemplateType = 'minimal' | 'standard' | 'comprehensive';

export interface TemplateFile {
  path: string;
  content: string;
  overwritable: boolean;
}

export interface TemplateDefinition {
  type: TemplateType;
  description: string;
  directories: string[];
  files: TemplateFile[];
}

/**
 * Default configuration content
 */
const defaultConfig = (template: TemplateType): string => JSON.stringify({
  version: '1.0.0',
  analysis: {
    includePatterns: ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx'],
    excludePatterns: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.*', '**/*.spec.*'],
    maxFileSize: 1048576,
    analysisDepth: template === 'minimal' ? 'shallow' : 'deep',
  },
  output: {
    preserveFormatting: true,
    backupFiles: true,
    validateOutput: true,
  },
  watch: {
    enabled: template !== 'minimal',
    debounceMs: 500,
    patterns: ['src/**/*'],
  },
  sync: {
    conflictStrategy: 'prompt',
    createBackups: true,
  },
  issueDetection: {
    enabled: template === 'comprehensive',
    githubRepo: '',
    issueLabels: [],
    issueMinPriority: 'medium',
    maxIssuesPerSync: 5,
  },
}, null, 2);

/**
 * Minimal template - bare essentials
 */
export const minimalTemplate: TemplateDefinition = {
  type: 'minimal',
  description: 'Minimal setup with just configuration',
  directories: [
    '.kiro',
  ],
  files: [
    {
      path: '.kiro/auto-doc-sync.json',
      content: defaultConfig('minimal'),
      overwritable: false,
    },
  ],
};

/**
 * Standard template - recommended for most projects
 */
export const standardTemplate: TemplateDefinition = {
  type: 'standard',
  description: 'Standard setup with documentation structure',
  directories: [
    '.kiro',
    '.kiro/steering',
    '.kiro/specs',
    '.kiro/development-log',
  ],
  files: [
    {
      path: '.kiro/auto-doc-sync.json',
      content: defaultConfig('standard'),
      overwritable: false,
    },
    {
      path: '.kiro/steering/project-patterns.md',
      content: `# Project Patterns and Standards

This steering file defines architectural patterns and coding standards for your project.

## Code Organization Patterns

### Directory Structure
- \`src/\` - Source code
- \`tests/\` - Test files
- \`docs/\` - Documentation

### File Naming Conventions
- Use kebab-case for directories
- Use camelCase for TypeScript/JavaScript files
- Use PascalCase for class names

## Documentation Standards

### Code Comments
- Use JSDoc for public APIs
- Explain "why" not "what" in comments
- Document assumptions and constraints

## Testing Patterns

### Unit Testing
- One test file per source file
- Use descriptive test names
- Test both success and error conditions
`,
      overwritable: true,
    },
    {
      path: '.kiro/steering/documentation-standards.md',
      content: `# Documentation Standards

This steering file defines documentation standards for your project.

## Documentation Types

### API Documentation
- Document all public interfaces
- Include usage examples
- Document error conditions

### README
- Project overview
- Installation instructions
- Quick start guide

## Writing Style

- Use clear, concise language
- Write in active voice
- Include code examples
`,
      overwritable: true,
    },
  ],
};

/**
 * Comprehensive template - full setup with all features
 */
export const comprehensiveTemplate: TemplateDefinition = {
  type: 'comprehensive',
  description: 'Full setup with all features including issue detection',
  directories: [
    '.kiro',
    '.kiro/steering',
    '.kiro/specs',
    '.kiro/development-log',
    '.kiro/hooks',
    '.kiro/prompts',
  ],
  files: [
    {
      path: '.kiro/auto-doc-sync.json',
      content: defaultConfig('comprehensive'),
      overwritable: false,
    },
    {
      path: '.kiro/steering/project-patterns.md',
      content: `# Project Patterns and Standards

This steering file defines architectural patterns and coding standards for your project.

## Code Organization Patterns

### Directory Structure
- \`src/\` - Source code
- \`tests/\` - Test files
- \`docs/\` - Documentation

### File Naming Conventions
- Use kebab-case for directories
- Use camelCase for TypeScript/JavaScript files
- Use PascalCase for class names
- Use SCREAMING_SNAKE_CASE for constants

### Interface Design Patterns
- All major components should implement well-defined interfaces
- Use dependency injection for component integration
- Prefer composition over inheritance
- Implement error handling at component boundaries

## Documentation Standards

### API Documentation
- All public methods must have JSDoc comments
- Include parameter types, return types, and usage examples
- Document error conditions and exception handling

### Code Comments
- Use inline comments for complex business logic
- Explain "why" not "what" in comments
- Document assumptions and constraints

## Testing Patterns

### Unit Testing
- One test file per source file
- Use descriptive test names
- Test both success and error conditions

### Property-Based Testing
- Use fast-check for property-based tests
- Run minimum 100 iterations per property test
- Focus on universal properties

## Error Handling Patterns

### Error Classification
- Use typed errors for different failure modes
- Implement graceful degradation
- Provide meaningful error messages
`,
      overwritable: true,
    },
    {
      path: '.kiro/steering/documentation-standards.md',
      content: `# Documentation Standards

This steering file defines documentation standards for your project.

## Documentation Types

### API Documentation
- Document all public interfaces
- Include usage examples
- Document error conditions

### README
- Project overview
- Installation instructions
- Quick start guide

### Architecture Notes
- Component descriptions
- Integration points
- Design decisions

## Writing Style

- Use clear, concise language
- Write in active voice
- Include code examples
- Use consistent terminology
`,
      overwritable: true,
    },
    {
      path: '.kiro/steering/ai-agent-issue-detection-policy.md',
      content: `# AI Agent Issue Detection Policy

This document provides steering for the Issue Detection Agent.

## Issue Classification

| Category | Definition | Labels |
|----------|------------|--------|
| Bug | Verifiable defect in logic or behavior | \`bug\` |
| Refactor | Code quality issues or technical debt | \`refactor\` |
| Documentation | Missing or outdated documentation | \`documentation\` |

## Priority Guidelines

- **High**: Causes crash, data loss, or security vulnerability
- **Medium**: Causes incorrect but non-critical output
- **Low**: Minor issues that don't affect functionality

## Rate Limiting

- Maximum 5 issues per sync run
- Prioritize high-priority issues first
`,
      overwritable: true,
    },
    {
      path: '.kiro/hooks/doc-sync-on-commit.json',
      content: JSON.stringify({
        name: 'Doc Sync on Commit',
        version: '1.0.0',
        description: 'Trigger documentation sync when files are edited',
        when: {
          type: 'fileEdited',
          patterns: ['src/**/*.ts', 'src/**/*.js'],
        },
        then: {
          type: 'askAgent',
          prompt: 'Review the edited files and update documentation if needed',
        },
      }, null, 2),
      overwritable: true,
    },
    {
      path: '.kiro/prompts/readme-generation.md',
      content: `# README Generation Prompt

Generate a comprehensive README for this project based on the codebase analysis.

## Include

- Project title and description
- Installation instructions
- Usage examples
- API documentation summary
- Contributing guidelines
- License information

## Style

- Use clear, concise language
- Include code examples
- Add badges where appropriate
`,
      overwritable: true,
    },
  ],
};

/**
 * Get template definition by type
 */
export function getTemplate(type: TemplateType): TemplateDefinition {
  switch (type) {
    case 'minimal':
      return minimalTemplate;
    case 'standard':
      return standardTemplate;
    case 'comprehensive':
      return comprehensiveTemplate;
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}

/**
 * Get all available templates
 */
export function getAllTemplates(): TemplateDefinition[] {
  return [minimalTemplate, standardTemplate, comprehensiveTemplate];
}

/**
 * Validate template type
 */
export function isValidTemplateType(type: string): type is TemplateType {
  return ['minimal', 'standard', 'comprehensive'].includes(type);
}
