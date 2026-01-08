# Setup Instructions Template

This template is used by the Auto-Doc-Sync System to generate consistent setup and installation documentation.

## Template Variables

- `{{project_name}}` - Name of the project or component
- `{{project_description}}` - Brief description of the project
- `{{prerequisites}}` - Array of prerequisite requirements
- `{{installation_steps}}` - Array of installation steps
- `{{configuration_steps}}` - Array of configuration steps
- `{{verification_commands}}` - Commands to verify installation
- `{{troubleshooting}}` - Common issues and solutions
- `{{additional_resources}}` - Links to additional documentation

## Template Content

```markdown
# {{project_name}} Setup Instructions

## Overview

{{project_description}}

## Prerequisites

Before installing {{project_name}}, ensure you have the following prerequisites:

{{#each prerequisites}}
- **{{name}}** ({{version}}): {{description}}
  {{#if installation_command}}
  ```bash
  {{installation_command}}
  ```
  {{/if}}
{{/each}}

## Installation

Follow these steps to install {{project_name}}:

{{#each installation_steps}}
### Step {{@index}}: {{title}}

{{description}}

{{#if command}}
```bash
{{command}}
```
{{/if}}

{{#if notes}}
**Notes:** {{notes}}
{{/if}}

{{#if verification}}
**Verification:**
```bash
{{verification.command}}
```

Expected output:
```
{{verification.expected_output}}
```
{{/if}}

{{/each}}

## Configuration

Configure {{project_name}} by following these steps:

{{#each configuration_steps}}
### {{title}}

{{description}}

{{#if file_path}}
**File:** `{{file_path}}`
{{/if}}

{{#if content}}
```{{format}}
{{content}}
```
{{/if}}

{{#if command}}
**Command:**
```bash
{{command}}
```
{{/if}}

{{#if notes}}
**Notes:** {{notes}}
{{/if}}

{{/each}}

## Verification

Verify your installation by running the following commands:

{{#each verification_commands}}
### {{title}}

```bash
{{command}}
```

**Expected Output:**
```
{{expected_output}}
```

{{#if description}}
{{description}}
{{/if}}

{{/each}}

## Troubleshooting

{{#each troubleshooting}}
### {{issue}}

**Problem:** {{problem}}

**Solution:** {{solution}}

{{#if command}}
```bash
{{command}}
```
{{/if}}

{{#if additional_info}}
**Additional Information:** {{additional_info}}
{{/if}}

---

{{/each}}

## Next Steps

After successful installation and configuration:

1. Review the API documentation for usage examples
2. Check the project's feature specifications for detailed functionality
3. Run the test suite to ensure everything is working correctly
4. Explore the example configurations in the `.kiro/` directory

## Additional Resources

{{#each additional_resources}}
- [{{title}}]({{url}}): {{description}}
{{/each}}

## Support

If you encounter issues not covered in this guide:

1. Check the project's issue tracker for known problems
2. Review the development logs in `.kiro/development-log/`
3. Consult the project's steering files for architectural guidance
4. Contact the development team for assistance
```

## Usage Instructions

This template is automatically processed by the Auto-Doc-Sync System when:

1. New installation or configuration requirements are detected
2. Dependencies are added or updated
3. Setup procedures change due to architectural modifications
4. Manual documentation updates are triggered

## Customization

To customize this template:

1. Modify the template structure to match your project's needs
2. Add project-specific sections or requirements
3. Update variable definitions for additional data points
4. Test the template with your project's specific setup requirements

## Best Practices

- Keep installation steps clear and sequential
- Include verification steps for each major installation phase
- Provide troubleshooting information for common issues
- Update prerequisites when dependencies change
- Test installation instructions on clean environments