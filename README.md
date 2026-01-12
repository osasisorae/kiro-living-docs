# Auto-Doc-Sync (Kiro Living Docs)

Auto-Doc-Sync is a small TypeScript CLI that scans your code changes and keeps Kiro project docs in sync. It can:

- Update `.kiro/specs/api.md` with generated API documentation
- Maintain a single `## Features & API` section in your `README.md` (deduplicated)
- Write development logs into `.kiro/development-log/` for traceability

This repo contains the tool itself plus tests.

## Quickstart (run this tool)

```bash
git clone git@github.com:osasisorae/kiro-living-docs.git
cd kiro-living-docs
npm install
npm test
npm run build
```

## Use on your own project

You can run Auto-Doc-Sync against any workspace directory:

```bash
node dist/cli.js --workspace=/absolute/path/to/your/project --trigger=manual
```

If you run it from inside your project, you can omit `--workspace`:

```bash
auto-doc-sync --trigger=manual
```

The CLI supports targeting specific files:

```bash
auto-doc-sync --trigger=manual --file=src/api.ts --file=src/types.ts
```

Run `auto-doc-sync --help` for the full list of options.

## Activation & Setup

Auto-Doc-Sync can run in two modes:

### Manual Mode (Default)
Run the tool manually when you want to sync documentation:
```bash
auto-doc-sync --trigger=manual
```

### Automatic Mode (Recommended)
Set up Auto-Doc-Sync to run automatically on git commits.

#### Step 1: Create Active Configuration
Copy the example configuration and customize it:
```bash
# Copy example to active config
cp .kiro/auto-doc-sync.example.json .kiro/auto-doc-sync.json

# Edit the config to enable automatic features
```

Edit `.kiro/auto-doc-sync.json` and set:
```jsonc
{
  "subagent": {
    "enabled": true,  // Enable AI-enhanced analysis
    "configPath": ".kiro/subagents/doc-analysis-agent.json"
  },
  "hooks": {
    "enabled": true,  // Enable Kiro hooks integration
    "configPath": ".kiro/hooks"
  }
}
```

#### Step 2: Set Up Git Hooks (Optional)
To run Auto-Doc-Sync automatically on every commit:

**Option A: Using Kiro Hooks (Recommended)**
If you're using Kiro IDE, create a hook configuration:
```bash
mkdir -p .kiro/hooks
```

Create `.kiro/hooks/auto-doc-sync-post-commit.json`:
```json
{
  "name": "auto-doc-sync-post-commit",
  "trigger": "git-commit",
  "enabled": true,
  "timeout": 30000,
  "command": "node dist/index.js --trigger=git-hook",
  "workingDirectory": ".",
  "environment": {
    "NODE_ENV": "production",
    "AUTO_DOC_SYNC": "true"
  }
}
```

**Option B: Traditional Git Hooks**
Create `.git/hooks/post-commit`:
```bash
#!/bin/sh
# Auto-Doc-Sync post-commit hook
cd "$(git rev-parse --show-toplevel)"
if [ -f "dist/cli.js" ]; then
  node dist/cli.js --trigger=git-hook
fi
```

Make it executable:
```bash
chmod +x .git/hooks/post-commit
```

#### Step 3: Verify Setup
Test your configuration:
```bash
# Test manual run
auto-doc-sync --trigger=manual

# Check that config files were created
ls -la .kiro/subagents/doc-analysis-agent.json
ls -la .kiro/hooks/
```

#### Step 4: First Automatic Run
Make a commit to test automatic operation:
```bash
git add .
git commit -m "Set up Auto-Doc-Sync"
# Should automatically run and update documentation
```

### Troubleshooting Setup

**Config file not found**: Auto-Doc-Sync will use defaults if no config file exists. Create `.kiro/auto-doc-sync.json` to customize behavior.

**Subagent not working**: Check that `.kiro/subagents/doc-analysis-agent.json` exists. It's created automatically on first run.

**Hooks not triggering**: Verify hook files exist and are executable. Check Kiro IDE hook configuration if using Kiro hooks.

**Permission errors**: Ensure the tool has write access to `.kiro/` directory and target documentation files.

## Configuration

Auto-Doc-Sync loads configuration in this order:

1. `--config=PATH` (if provided)
2. `.kiro/auto-doc-sync.json` (in the workspace)
3. Built-in defaults

Example `.kiro/auto-doc-sync.json`:

```jsonc
{
  // Optional: set a workspace root when running from another directory
  "workspaceRoot": ".",
  "analysis": {
    "includePatterns": ["**/*.ts", "**/*.js"],
    "excludePatterns": ["**/node_modules/**", "**/dist/**"],
    "maxFileSize": 1048576,
    "analysisDepth": "shallow"
  },
  "output": {
    "preserveFormatting": true,
    "backupFiles": true,
    "validateOutput": true
  },
  "logging": {
    "logDirectory": ".kiro/development-log",
    "maxEntriesPerFile": 100,
    "retentionDays": 30,
    "groupingTimeWindow": 5
  },
  "subagent": {
    "enabled": true,  // Enable AI-enhanced analysis (default: true)
    "configPath": ".kiro/subagents/doc-analysis-agent.json"
  },
  "hooks": {
    "enabled": true,  // Enable Kiro hooks integration (default: true)
    "configPath": ".kiro/hooks"
  }
}
```

Notes:

- Relative paths in config (like `logDirectory` or `hooks.configPath`) resolve relative to the workspace root.
- You can also override the workspace root at runtime using `--workspace=PATH`.
- The example config file (`.kiro/auto-doc-sync.example.json`) has subagent and hooks disabled by default for safety. Copy it to `.kiro/auto-doc-sync.json` and enable features as needed.

## Generated files

When it runs, Auto-Doc-Sync writes to/updates:

- `.kiro/specs/api.md` (generated API documentation)
- `.kiro/development-log/*.md` (development logs)
- `README.md` (only the `## Features & API` section)

## Git hook usage

To run it as part of a git hook (or a Kiro hook), call:

```bash
auto-doc-sync --trigger=git-hook
```

## Project structure (tool source)

```
src/
├── analysis/        # Code analysis and change detection
├── hooks/           # Hook integration
├── logging/         # Development log writer
├── output/          # Atomic writes + section updates
├── templates/       # Documentation templates
├── types/           # Core TypeScript types
└── cli.ts           # CLI entrypoint
```

## Contributing

```bash
npm test
npm run build
```

## Features & API

**Features:**

- **utils**: Added formatDate function (Date) → any
- **manual-test**: Added processData function (string) → any
- **orchestrator**: Updated AutoDocSyncSystem class with 1 methods
- **AutoDocSyncSystem**: Main orchestration system that coordinates all components
- **api**: Updated UserService class with 1 methods
- **service**: Updated DataService class with 1 methods
- **comprehensive-api**: Updated UserManagementService class with 1 methods
- **feature**: Updated FeatureService class with 1 methods