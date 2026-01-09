# Documentation Generation Prompt

Generate documentation content based on the provided analysis results and template type.

## Generation Requirements

Create documentation that:

1. **Follows the specified template format**
2. **Includes all relevant technical details**
3. **Maintains consistency with existing documentation**
4. **Provides clear, actionable information**

## Input Data

Analysis Results:
{analysisResults}

Template Type: {templateType}

## Template Types

### API Documentation (`api-spec`)
Generate comprehensive API documentation including:
- Endpoint descriptions with HTTP methods and paths
- Request/response schemas with examples
- Parameter documentation with types and constraints
- Error codes and handling
- Usage examples and integration guides

### README Sections (`readme-section`)
Generate README content including:
- Feature descriptions with benefits
- Installation and setup instructions
- Usage examples with code snippets
- Configuration options
- Troubleshooting guides

### Setup Instructions (`setup-guide`)
Generate setup documentation including:
- Prerequisites and dependencies
- Step-by-step installation process
- Configuration requirements
- Verification steps
- Common issues and solutions

### Architecture Notes (`architecture-notes`)
Generate architectural documentation including:
- Component descriptions and responsibilities
- Integration patterns and data flow
- Design decisions and rationale
- Performance considerations
- Extension points and customization

## Output Format

Return the generated content as structured text ready for file output. The content should be:

- **Well-formatted Markdown** with proper headers, lists, and code blocks
- **Complete and self-contained** with all necessary information
- **Consistent in style** with existing project documentation
- **Actionable** with clear instructions and examples

## Generation Guidelines

- Use the analysis results to populate specific technical details
- Include code examples that are syntactically correct
- Provide context and explanations, not just raw data
- Structure content logically with clear sections
- Include links to related documentation when relevant
- Use consistent terminology throughout