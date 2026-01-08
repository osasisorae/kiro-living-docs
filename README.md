# Auto-Doc-Sync System

Autonomous Documentation Synchronization System for Kiro projects.

## Project Structure

```
src/
├── types/           # Core TypeScript interfaces and types
├── analysis/        # Code analysis and change detection
├── templates/       # Documentation template management
├── output/          # File writing and formatting
├── hooks/           # Kiro Hooks integration
└── index.ts         # Main entry point
```

## Core Interfaces

- **ChangeAnalysis**: Main analysis result structure
- **ChangedFile**: Represents a file that has been modified
- **DocumentationRequirement**: Specifies what documentation needs updating
- **Template**: Defines reusable documentation templates

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build project
npm run build

# Development mode
npm run dev
```

## Testing

The project uses property-based testing with fast-check to ensure correctness across all possible inputs. Each property test runs a minimum of 100 iterations to verify system behavior.