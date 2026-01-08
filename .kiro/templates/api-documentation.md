# API Documentation Template

This template is used by the Auto-Doc-Sync System to generate consistent API documentation.

## Template Variables

- `{{api_name}}` - Name of the API or service
- `{{api_version}}` - Version of the API
- `{{api_description}}` - Brief description of the API functionality
- `{{base_url}}` - Base URL for the API endpoints
- `{{endpoints}}` - Array of endpoint definitions
- `{{authentication}}` - Authentication requirements
- `{{error_codes}}` - Common error codes and descriptions
- `{{examples}}` - Usage examples and code snippets

## Template Content

```markdown
# {{api_name}} API Documentation

## Overview

{{api_description}}

**Version:** {{api_version}}  
**Base URL:** `{{base_url}}`

## Authentication

{{authentication}}

## Endpoints

{{#each endpoints}}
### {{method}} {{path}}

**Description:** {{description}}

{{#if parameters}}
**Parameters:**
{{#each parameters}}
- `{{name}}` ({{type}}){{#if required}} *required*{{/if}}: {{description}}
{{/each}}
{{/if}}

{{#if requestBody}}
**Request Body:**
```json
{{requestBody}}
```
{{/if}}

**Response:**
```json
{{response}}
```

{{#if example}}
**Example Usage:**
```typescript
{{example}}
```
{{/if}}

{{#if errors}}
**Error Conditions:**
{{#each errors}}
- `{{code}}`: {{description}}
{{/each}}
{{/if}}

---

{{/each}}

## Common Error Codes

{{#each error_codes}}
- `{{code}}`: {{description}}
{{/each}}

## Examples

{{#each examples}}
### {{title}}

{{description}}

```{{language}}
{{code}}
```

{{#if output}}
**Expected Output:**
```{{output_format}}
{{output}}
```
{{/if}}

---

{{/each}}

## Integration Notes

- All endpoints return JSON responses
- Use appropriate HTTP methods for different operations
- Include proper error handling in your implementations
- Rate limiting may apply to certain endpoints

## Support

For questions or issues with this API, please refer to the project documentation or contact the development team.
```

## Usage Instructions

This template is automatically processed by the Auto-Doc-Sync System when API changes are detected. The system will:

1. Extract API definitions from code changes
2. Populate template variables with extracted data
3. Generate formatted documentation
4. Update the appropriate specification files

## Customization

To customize this template:

1. Modify the template content while preserving variable placeholders
2. Add new variables as needed for your specific API documentation requirements
3. Update the template processing logic in the template engine if new variables are added
4. Test the template with sample data to ensure proper rendering