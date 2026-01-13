# Auto-Doc-Sync

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Automatic documentation synchronization powered by OpenAI. Analyzes your code and generates/updates documentation.

## What It Does

Auto-Doc-Sync analyzes your TypeScript/JavaScript code using AST parsing, sends it to OpenAI's GPT-4o for intelligent analysis, and generates:

- **API Documentation** → `.kiro/specs/api.md`
- **Development Logs** → `.kiro/development-log/`
- **README Updates** → `README.md`

## Requirements

- Node.js 18+
- OpenAI API key

## Setup

```bash
# Clone and install
git clone https://github.com/osasisorae/kiro-living-docs.git
cd kiro-living-docs
npm install
npm run build

# Set your OpenAI API key
export OPENAI_API_KEY="your-key-here"
# Or create a .env file with: OPENAI_API_KEY=your-key-here
```

## Usage

### CLI Commands

```bash
# Analyze all changed files
npx auto-doc-sync

# Analyze specific files
npx auto-doc-sync src/api.ts src/types.ts

# With a reason (logged in dev log)
npx auto-doc-sync --reason="Updated API endpoints"

# View usage/cost statistics
npx auto-doc-sync usage summary
npx auto-doc-sync usage projections
```

### Git Hooks

Auto-sync documentation on commits:

```bash
npx auto-doc-sync hooks install   # Install post-commit and pre-push hooks
npx auto-doc-sync hooks check     # Check hook status
npx auto-doc-sync hooks uninstall # Remove hooks
```

### Kiro IDE Integration

The `.kiro/hooks/` directory contains Kiro hook configurations that work with Kiro's built-in agent:

| Hook | Trigger | What It Does |
|------|---------|--------------|
| `doc-sync-on-save` | File save in `src/**/*.ts` | Prompts Kiro agent to check if docs need updating |
| `new-file-boilerplate` | New `.ts` file created | Prompts Kiro agent to add JSDoc comments |
| `manual-full-sync` | Manual trigger | Prompts Kiro agent to do full doc sync |

These hooks use Kiro's `agent-prompt` action type, meaning they instruct Kiro's AI agent what to do rather than running shell commands.

## Configuration

Create `.kiro/auto-doc-sync.json`:

```json
{
  "analysis": {
    "includePatterns": ["**/*.ts", "**/*.js"],
    "excludePatterns": ["**/node_modules/**", "**/*.test.*"],
    "maxFileSize": 1048576
  },
  "output": {
    "preserveFormatting": true,
    "backupFiles": true
  },
  "subagent": {
    "enabled": true
  }
}
```

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   CLI / Hook    │────▶│   Orchestrator   │────▶│  Code Analyzer  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ Template Engine  │     │ OpenAI (GPT-4o) │
                        └──────────────────┘     └─────────────────┘
                                │                        │
                                ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │   File Writer    │     │ Structured JSON │
                        └──────────────────┘     └─────────────────┘
```

**Key Components:**
- `src/orchestrator.ts` - Main coordination logic
- `src/analysis/` - AST parsing and code analysis
- `src/subagent/` - OpenAI client with structured outputs
- `src/templates/` - Documentation template engine
- `src/output/` - File writing with backup support
- `src/usage/` - Cost tracking and metrics

## Cost

The system uses OpenAI's GPT-4o model. Typical costs:

| Operation | Tokens | Cost |
|-----------|--------|------|
| Single file analysis | ~10-30k | $0.20-0.50 |
| Multi-file sync | ~50-100k | $1.00-2.00 |

Use `npx auto-doc-sync usage summary` to track your spending.

## Development

```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm test             # Run tests
npm run test:watch   # Watch mode
```

## Project Structure

```
src/
├── analysis/       # Code analysis and AST parsing
├── hooks/          # Git hook installation
├── logging/        # Development log generation
├── output/         # File writing utilities
├── subagent/       # OpenAI integration
├── templates/      # Documentation templates
├── usage/          # Cost tracking
├── cli.ts          # CLI entry point
├── config.ts       # Configuration management
├── orchestrator.ts # Main orchestration
└── index.ts        # Package entry point

.kiro/
├── hooks/          # Kiro IDE hook configurations
├── prompts/        # OpenAI prompt templates
├── specs/          # Generated API documentation
├── subagents/      # Subagent configuration
└── development-log/ # Generated change logs
```

## Known Limitations

- README generation overwrites rather than intelligently merging
- API docs may have duplicate entries for class methods
- Requires OpenAI API key (no offline mode)
- Cost can add up with frequent use

## License

MIT
