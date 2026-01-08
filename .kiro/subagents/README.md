# Kiro Subagent Configuration

This directory contains the configuration for the Auto-Doc-Sync System's documentation analysis agent.

## Overview

The documentation analysis agent is a specialized Kiro Subagent that enhances the Auto-Doc-Sync System's code analysis capabilities. It provides:

- Advanced code analysis using AI-powered parsing
- Intelligent change classification
- Context-aware documentation generation
- Template processing with variable substitution

## Configuration File

The main configuration file is `doc-analysis-agent.json`, which defines:

- **Agent Identity**: Name, version, and description
- **Capabilities**: List of supported analysis functions
- **Model Configuration**: AI model settings (temperature, tokens, timeout)
- **Prompts**: Specialized prompts for different analysis tasks
- **Integration**: Interface definitions for system components
- **Error Handling**: Strategies for graceful degradation
- **Validation**: Input/output validation rules

## Usage

### Initialize Configuration

```bash
npm run subagent init
```

### Validate Configuration

```bash
npm run subagent validate
```

### Test Subagent Connection

```bash
npm run subagent test
```

### View Current Configuration

```bash
npm run subagent config
```

### Update Configuration

```bash
# Update model temperature
npm run subagent update configuration.temperature 0.2

# Update system prompt
npm run subagent update prompts.system "New system prompt"
```

### Run Example

```bash
npm run subagent:example
```

## Integration with Analysis Engine

The Subagent integrates with the Auto-Doc-Sync System through the `SubagentIntegration` class:

```typescript
import { SubagentIntegration } from './src/subagent';

const integration = new SubagentIntegration(analysisConfig);
const results = await integration.performEnhancedAnalysis(changes);
```

## Capabilities

### Code Analysis
- Extract function definitions with parameters and return types
- Identify class definitions with methods and properties
- Parse API endpoints and specifications
- Extract TypeScript interfaces and types

### Change Classification
- Identify new features vs. modifications
- Classify API changes and their impact
- Detect architectural modifications
- Generate documentation requirements

### Documentation Generation
- Apply templates with variable substitution
- Generate API documentation
- Create setup instructions
- Produce architecture notes

### Template Processing
- Variable substitution in templates
- Conditional content handling
- Format preservation
- Validation of processed content

## Error Handling

The Subagent configuration includes comprehensive error handling:

- **Parse Failures**: Graceful degradation to text-based analysis
- **Analysis Errors**: Return partial results with error logging
- **Template Errors**: Fallback to default templates
- **Connection Issues**: Local analysis fallback

## Customization

You can customize the Subagent by modifying:

1. **Prompts**: Adjust the AI prompts for different analysis styles
2. **Model Settings**: Change temperature, token limits, or model type
3. **Capabilities**: Add or remove supported analysis functions
4. **Error Handling**: Modify fallback strategies
5. **Validation Rules**: Adjust input/output validation

## Troubleshooting

### Configuration Issues
- Ensure all required fields are present
- Validate JSON syntax
- Check prompt formatting

### Connection Problems
- Verify Kiro Subagent system is available
- Check network connectivity
- Review timeout settings

### Analysis Failures
- Check input format and syntax
- Review error logs for details
- Test with simpler inputs

## Development

To extend the Subagent functionality:

1. Update the configuration schema in `src/subagent/types.ts`
2. Modify the client interface in `src/subagent/client.ts`
3. Enhance integration logic in `src/subagent/integration.ts`
4. Update configuration validation in `src/subagent/config-manager.ts`

## Support

For issues with the Subagent configuration:

1. Run the validation command to check configuration
2. Test the connection to verify Subagent availability
3. Review error logs for specific failure details
4. Check the example usage for reference implementation