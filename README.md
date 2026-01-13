# Auto-Doc-Sync

Autonomous Documentation Synchronization System for Kiro Projects

Auto-Doc-Sync automatically keeps your documentation in sync with your code. When you save files, create new modules, or make changes, the system analyzes your code and updates documentation accordingly.

## How It Works

Auto-Doc-Sync uses Kiro hooks to monitor your development workflow:

1. **On File Save** - When you save source files, it checks if documentation needs updating
2. **On File Create** - When you create new TypeScript files, it adds JSDoc boilerplate
3. **Manual Trigger** - Run a full documentation sync on demand
4. **CLI Integration** - Run from command line or git hooks

The system analyzes your code using AST parsing, identifies APIs, functions, and classes, then generates or updates documentation in `.kiro/specs/` and `README.md`.

## Installation

```bash
git clone https://github.com/yourusername/auto-doc-sync.git
cd auto-doc-sync
npm install
npm run build
```

## Usage

### Automatic (via Kiro Hooks)

The hooks in `.kiro/hooks/` are automatically active in Kiro:

- **doc-sync-on-save** - Triggers on `src/**/*.{ts,tsx,js,jsx}` file saves
- **new-file-boilerplate** - Triggers when new `.ts` files are created
- **manual-full-sync** - Click play in Agent Hooks panel for full sync

### Command Line

```bash
# Run documentation sync manually
npx auto-doc-sync

# Sync specific files
npx auto-doc-sync src/api.ts src/types.ts

# With a reason (for logging)
npx auto-doc-sync --reason="Updated API endpoints"

# View usage statistics
npx auto-doc-sync usage summary
npx auto-doc-sync usage projections
```

### Git Hooks

Install git hooks to auto-sync on commits:

```bash
npx auto-doc-sync hooks install
npx auto-doc-sync hooks check
npx auto-doc-sync hooks uninstall
```

## Configuration

Create `.kiro/auto-doc-sync.json`:

```json
{
  "analysis": {
    "includePatterns": ["**/*.ts", "**/*.js"],
    "excludePatterns": ["**/node_modules/**", "**/*.test.*"],
    "maxFileSize": 1048576,
    "analysisDepth": "deep"
  },
  "output": {
    "preserveFormatting": true,
    "backupFiles": true
  },
  "subagent": {
    "enabled": true
  },
  "hooks": {
    "enabled": true,
    "configPath": ".kiro/hooks"
  }
}
```

## Project Structure

```
.kiro/
├── hooks/              # Kiro hook configurations
├── specs/              # Generated API documentation
├── development-log/    # Change logs
└── subagents/          # AI agent configurations

src/
├── analysis/           # Code analysis and AST parsing
├── templates/          # Documentation templates
├── hooks/              # Hook utilities
├── logging/            # Development logging
├── output/             # File writing
├── subagent/           # AI integration
└── usage/              # Usage tracking
```

## Documentation Output

The system generates:

- **`.kiro/specs/api.md`** - API documentation with functions, parameters, return types
- **`README.md`** - Updated with new features and APIs
- **`.kiro/development-log/`** - Timestamped change logs

## Development

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm test             # Run tests
npm run test:watch   # Watch mode
```

## License

MIT
