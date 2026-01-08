# Documentation Templates

This directory contains templates used by the Auto-Doc-Sync System to generate consistent documentation across the project.

## Available Templates

### API Documentation Template (`api-documentation.md`)
- **Purpose**: Generate comprehensive API documentation
- **Use Cases**: REST API endpoints, service interfaces, integration guides
- **Key Variables**: `api_name`, `endpoints`, `authentication`, `examples`
- **Output**: Formatted API specifications with examples and error handling

### Setup Instructions Template (`setup-instructions.md`)
- **Purpose**: Create installation and configuration guides
- **Use Cases**: Project setup, dependency installation, environment configuration
- **Key Variables**: `project_name`, `prerequisites`, `installation_steps`, `verification_commands`
- **Output**: Step-by-step setup guides with troubleshooting information

### Architecture Notes Template (`architecture-notes.md`)
- **Purpose**: Document system architecture and component design
- **Use Cases**: Component documentation, integration patterns, design decisions
- **Key Variables**: `component_name`, `dependencies`, `interfaces`, `integration_points`
- **Output**: Comprehensive architectural documentation with diagrams and examples

## Template Usage

Templates are automatically processed by the Auto-Doc-Sync System when:

1. **Code Analysis**: The system detects changes that require documentation updates
2. **Template Selection**: Appropriate templates are selected based on change type
3. **Variable Population**: Templates are populated with extracted data from code analysis
4. **Content Generation**: Final documentation is generated and written to target files

## Template Syntax

Templates use Handlebars syntax for variable substitution:

- `{{variable}}` - Simple variable substitution
- `{{#each array}}...{{/each}}` - Loop over arrays
- `{{#if condition}}...{{/if}}` - Conditional content
- `{{#unless condition}}...{{/unless}}` - Negative conditional

### Example Template Section

```markdown
# {{api_name}} API

{{#each endpoints}}
## {{method}} {{path}}

{{description}}

{{#if parameters}}
**Parameters:**
{{#each parameters}}
- `{{name}}` ({{type}}): {{description}}
{{/each}}
{{/if}}
{{/each}}
```

## Customization

### Adding New Templates

1. Create a new `.md` file in this directory
2. Define template variables in the header comment
3. Use Handlebars syntax for dynamic content
4. Update the template registry in the system configuration
5. Test the template with sample data

### Modifying Existing Templates

1. Edit the template file while preserving variable placeholders
2. Test changes with existing data to ensure compatibility
3. Update variable documentation if new variables are added
4. Verify that generated documentation maintains proper formatting

## Template Variables

### Common Variables Available to All Templates

- `{{timestamp}}` - Current timestamp in ISO format
- `{{project_name}}` - Name of the current project
- `{{version}}` - Current project version
- `{{author}}` - Author information from git or configuration

### Template-Specific Variables

Each template defines its own set of variables based on the type of documentation being generated. Refer to individual template files for complete variable lists.

## Best Practices

### Template Design

- Keep templates focused on a single documentation type
- Use clear, descriptive variable names
- Include fallback content for optional variables
- Maintain consistent formatting across templates

### Variable Usage

- Use semantic variable names that describe the content
- Group related variables into objects when appropriate
- Provide default values for optional variables
- Document all variables in template headers

### Content Structure

- Follow established documentation patterns
- Include examples and usage information
- Provide clear section headings and organization
- Use consistent markdown formatting

## Integration with Auto-Doc-Sync

Templates are integrated with the Auto-Doc-Sync System through:

1. **Template Registry**: System maintains a registry of available templates
2. **Variable Extraction**: Code analysis populates template variables
3. **Template Processing**: Handlebars engine processes templates with data
4. **Output Generation**: Processed templates are written to target files

## Troubleshooting

### Common Issues

- **Missing Variables**: Ensure all required variables are provided by the analysis engine
- **Formatting Problems**: Check Handlebars syntax and markdown formatting
- **Template Not Found**: Verify template is registered in the system configuration
- **Variable Type Mismatch**: Ensure variable types match template expectations

### Debugging Templates

1. Check template syntax using a Handlebars validator
2. Test with sample data to verify variable substitution
3. Review generated output for formatting issues
4. Check system logs for template processing errors

## Contributing

When contributing new templates or modifications:

1. Follow the established template structure and naming conventions
2. Include comprehensive variable documentation
3. Test templates with realistic data
4. Update this README with new template information
5. Ensure templates work with the existing Auto-Doc-Sync workflow