# API Documentation

Generated: 2026-01-16T22:58:03.185Z

## API Endpoints

### main

CLI entry point for the Auto-Doc-Sync System. Parses command line arguments and initializes the system.

**Method:** `function`

**Returns:** `Promise<void>`

### loadConfig

Load configuration from file or use defaults. Attempts to find configuration file in standard locations if no path is provided.

**Method:** `function`

**Parameters:**
- `configPath` (string) - Optional path to the configuration file.

**Returns:** `SystemConfig`

### loadConfigFromPath

Load configuration from a specific path and validate it. Falls back to default configuration if validation fails.

**Method:** `function`

**Parameters:**
- `configPath` (string) - Path to the configuration file.
- `defaultConfig` (SystemConfig) - Default configuration to fall back on.

**Returns:** `SystemConfig`

### getDefaultConfig

Get default system configuration.

**Method:** `function`

**Returns:** `SystemConfig`

### validateConfig

Validate the configuration object and return validation results including errors and warnings.

**Method:** `function`

**Parameters:**
- `config` (any) - Configuration object to validate.

**Returns:** `ConfigValidationResult`

### mergeConfigs

Merge user configuration with defaults.

**Method:** `function`

**Parameters:**
- `defaultConfig` (SystemConfig) - Default configuration.
- `userConfig` (any) - User-provided configuration.

**Returns:** `SystemConfig`

### saveConfig

Save configuration to a file. Validates configuration before saving.

**Method:** `function`

**Parameters:**
- `config` (SystemConfig) - Configuration to save.
- `configPath` (string) - Path where the configuration should be saved.

**Returns:** `void`

### createExampleConfig

Create an example configuration file with default settings and comments.

**Method:** `function`

**Parameters:**
- `outputPath` (string) - Path where the example configuration should be created.

**Returns:** `void`

### ConfigManager

Manages configuration loading, validation, and saving for the Auto-Doc-Sync System.

**Method:** `class`

**Returns:** `class`

### ConfigManager.loadConfig

ConfigManager method that takes (string) and returns SystemConfig


**Parameters:**
- `configPath?` (string)

**Returns:** `SystemConfig`

## New Features

### AutoDocSyncSystem Initialization

Enhanced initialization process for the Auto-Doc-Sync System, allowing for command line argument parsing for configuration and workspace.


### ConfigManager

Manages configuration loading, validation, and saving for the Auto-Doc-Sync System.

**Category:** enhanced
**Affected Files:** /Users/Macintosh/LearningHub/kld/src/index.ts, /Users/Macintosh/LearningHub/kld/src/config.ts

### config

Updated ConfigManager class with 1 methods

**Category:** enhanced
**Affected Files:** /Users/Macintosh/LearningHub/kld/src/config.ts

## Architectural Changes

### index

**Type:** undefined
**Impact:** medium

Modified the main entry point to enhance command line argument handling.

### ConfigManager

**Type:** undefined
**Impact:** medium

Updated ConfigManager class to improve configuration loading and validation.

### index

**Type:** component-modified
**Impact:** medium

Component modified: index

### config

**Type:** component-modified
**Impact:** medium

Component modified: config

## Changed Files

- `/Users/Macintosh/LearningHub/kld/src/index.ts` (modified)
- `/Users/Macintosh/LearningHub/kld/src/config.ts` (modified)

