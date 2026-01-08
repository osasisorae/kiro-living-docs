# Documentation Standards

This steering file defines documentation standards and templates for the Auto-Doc-Sync System.

## Documentation Types

### API Specifications
- Located in `.kiro/specs/api.md`
- Follow OpenAPI-style documentation format
- Include endpoint descriptions, parameters, and response formats
- Provide usage examples and integration patterns

### Feature Specifications
- Located in `.kiro/specs/{feature-name}/`
- Include requirements.md, design.md, and tasks.md
- Follow EARS pattern for requirements
- Include correctness properties in design documents

### Development Logs
- Located in `.kiro/development-log/`
- Use timestamped entries with consistent formatting
- Group related changes in single sessions
- Include rationale and context for changes

## Template Standards

### API Documentation Template
```markdown
# API Documentation

## Overview
Brief description of the API functionality.

## Endpoints

### {Method} {Path}
**Description:** {Description}

**Parameters:**
- `{param}` ({type}): {description}

**Response:**
```json
{example_response}
```

**Example Usage:**
```typescript
{usage_example}
```

**Error Conditions:**
- {error_code}: {error_description}
```

### Setup Instructions Template
```markdown
# Setup Instructions

## Prerequisites
- {prerequisite_1}
- {prerequisite_2}

## Installation
1. {installation_step_1}
2. {installation_step_2}

## Configuration
1. {configuration_step_1}
2. {configuration_step_2}

## Verification
Run the following command to verify installation:
```bash
{verification_command}
```

Expected output:
```
{expected_output}
```
```

### Architecture Notes Template
```markdown
# Architecture Notes

## Component: {ComponentName}

### Purpose
{component_purpose}

### Dependencies
- {dependency_1}: {dependency_description}
- {dependency_2}: {dependency_description}

### Interfaces
```typescript
{interface_definition}
```

### Implementation Details
{implementation_details}

### Integration Points
- {integration_point_1}: {integration_description}
- {integration_point_2}: {integration_description}

### Error Handling
{error_handling_approach}
```

## Content Guidelines

### Writing Style
- Use clear, concise language
- Write in active voice
- Use present tense for current functionality
- Include specific examples and code snippets

### Code Examples
- Provide complete, runnable examples
- Include error handling in examples
- Use realistic data in examples
- Comment complex code sections

### Formatting Standards
- Use consistent heading hierarchy
- Include table of contents for long documents
- Use code blocks with appropriate language tags
- Include links to related documentation

## Quality Checks

### Content Validation
- All code examples must be syntactically correct
- Links must be valid and accessible
- Examples must match current API signatures
- Documentation must be up-to-date with implementation

### Consistency Checks
- Terminology must be consistent across documents
- Formatting must follow established patterns
- Code style must match project standards
- Examples must use consistent naming conventions

## Maintenance Guidelines

### Update Triggers
- API changes require immediate documentation updates
- New features require comprehensive documentation
- Bug fixes may require example updates
- Architecture changes require design document updates

### Review Process
- All documentation changes should be reviewed
- Examples should be tested before publication
- Links should be verified during updates
- Consistency should be checked across related documents