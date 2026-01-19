# Project Patterns and Standards

This steering file defines architectural patterns and coding standards for the Auto-Doc-Sync System project.

## Code Organization Patterns

### Directory Structure
- `src/analysis/` - Code analysis and AST parsing components
- `src/templates/` - Documentation template engine and generators
- `src/hooks/` - Kiro hooks integration and configuration
- `src/subagent/` - AI subagent client and integration
- `src/logging/` - Development logging system
- `src/output/` - File writing and formatting preservation

### File Naming Conventions
- Use kebab-case for directories: `code-analysis/`, `template-engine/`
- Use camelCase for TypeScript files: `changeAnalyzer.ts`, `templateEngine.ts`
- Use PascalCase for class names: `ChangeAnalyzer`, `TemplateEngine`
- Use SCREAMING_SNAKE_CASE for constants: `MAX_FILE_SIZE`, `DEFAULT_TIMEOUT`

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
- Provide integration examples for complex workflows

### Code Comments
- Use inline comments for complex business logic
- Explain "why" not "what" in comments
- Document assumptions and constraints
- Include references to requirements and design decisions

## Testing Patterns

### Unit Testing
- One test file per source file: `analyzer.ts` → `analyzer.test.ts`
- Use descriptive test names: `should extract function signatures from TypeScript code`
- Group related tests using `describe` blocks
- Test both success and error conditions

### Property-Based Testing
- Use fast-check library for property-based tests
- Run minimum 100 iterations per property test
- Tag tests with requirement references
- Focus on universal properties, not specific examples

## Error Handling Patterns

### Error Classification
- `ParseError` - Code parsing and AST generation failures
- `TemplateError` - Template processing and rendering failures
- `FileSystemError` - File reading, writing, and permission issues
- `ValidationError` - Content validation and quality check failures

### Error Recovery
- Implement graceful degradation for non-critical failures
- Provide meaningful error messages with context
- Log errors with sufficient detail for debugging
- Use fallback strategies for template and analysis failures

## Integration Patterns

### Kiro Hooks Integration
- Use JSON configuration files for hook definitions
- Implement event-driven architecture for trigger handling
- Pass structured context data between components
- Log hook execution results and errors

### Subagent Integration
- Use standardized prompt templates for AI interactions
- Implement retry logic for API failures
- Validate AI responses before processing
- Cache analysis results when appropriate

## Performance Considerations

### File Processing
- Implement streaming for large file analysis
- Use worker threads for CPU-intensive operations
- Cache parsed AST results when possible
- Implement configurable timeouts for long operations

### Memory Management
- Limit concurrent file processing
- Clean up temporary data structures
- Use lazy loading for template resources
- Monitor memory usage in long-running operations

### Issue Detection Agent Integration
- Implement the `IssueDetectionRequest` and `IssueDetectionResponse` interfaces in `src/subagent/types.ts`.
- Use the `IssueDetectionSchema` (Zod) for all AI-powered issue analysis.
- Delegate the final `issues_create` call to the GitHub MCP server via a Kiro agent prompt.
- Log all detected issues and their creation status in the development log.
