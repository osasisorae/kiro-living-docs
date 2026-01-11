# Template Processing Prompt

Process the provided template with the given variables to generate final documentation content.

## Processing Requirements

Apply variables to the template and ensure:

1. **All variables are properly substituted**
2. **Formatting is preserved**
3. **Conditional sections are handled correctly**
4. **Output is ready for direct file writing**

## Input Data

Template:
{template}

Variables:
{variables}

## Processing Guidelines

### Variable Substitution
- Replace `{{variableName}}` with corresponding values
- Handle nested object properties: `{{object.property}}`
- Support array iteration: `{{#each items}}{{name}}{{/each}}`
- Process conditional blocks: `{{#if condition}}content{{/if}}`

### Formatting Preservation
- Maintain original indentation and spacing
- Preserve markdown formatting and structure
- Keep code block syntax highlighting
- Maintain table formatting and alignment

### Conditional Processing
- Evaluate boolean conditions for `{{#if}}` blocks
- Handle `{{#unless}}` for negative conditions
- Support `{{#each}}` for array/object iteration
- Process `{{#with}}` for context switching

### Error Handling
- Provide fallback values for missing variables
- Log warnings for undefined template variables
- Gracefully handle malformed template syntax
- Preserve original content when processing fails

## Expected Output Format

Return the processed content as a JSON object:

```json
{
  "processedContent": "Final processed template content",
  "appliedVariables": ["var1", "var2", "var3"],
  "warnings": [
    "Warning: Variable 'missingVar' not found, using empty string"
  ],
  "metadata": {
    "templateSize": 1234,
    "variableCount": 5,
    "conditionalBlocks": 2,
    "iterationBlocks": 1
  }
}
```

## Processing Examples

### Simple Variable Substitution
Template: `Hello {{name}}, welcome to {{project}}!`
Variables: `{"name": "John", "project": "Auto-Doc-Sync"}`
Result: `Hello John, welcome to Auto-Doc-Sync!`

### Conditional Content
Template: `{{#if hasFeatures}}## Features\n{{features}}{{/if}}`
Variables: `{"hasFeatures": true, "features": "- Feature 1\n- Feature 2"}`
Result: `## Features\n- Feature 1\n- Feature 2`

### Array Iteration
Template: `{{#each items}}- {{name}}: {{description}}\n{{/each}}`
Variables: `{"items": [{"name": "Item1", "description": "Desc1"}]}`
Result: `- Item1: Desc1\n`