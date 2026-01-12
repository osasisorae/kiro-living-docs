# DevelopmentLogger API Documentation

## Overview
The `DevelopmentLogger` class has been enhanced to include integration with Git context. This allows the logger to retrieve information such as the current commit hash, author, branch, and more. This document outlines the new methods added to the `DevelopmentLogger` class and provides usage examples.

## Methods

### `getBranch`

**Description**: Retrieves the current Git branch name.

**Returns**: `string | undefined`
- The name of the current branch, or `undefined` if not in a Git repository.

**Example**:
```typescript
const logger = new DevelopmentLogger(config);
const branch = logger.getBranch();
console.log(`Current branch: ${branch}`);
```

### `getLatestCommitMessage`

**Description**: Retrieves the latest commit message.

**Returns**: `string | undefined`
- The latest commit message, or `undefined` if not in a Git repository.

**Example**:
```typescript
const commitMessage = logger.getLatestCommitMessage();
console.log(`Latest commit message: ${commitMessage}`);
```

### `getStagedFiles`

**Description**: Retrieves a list of staged files.

**Returns**: `string[]`
- An array of file paths that are staged for commit.

**Example**:
```typescript
const stagedFiles = logger.getStagedFiles();
console.log('Staged files:', stagedFiles);
```

### `getModifiedFiles`

**Description**: Retrieves a list of modified but unstaged files.

**Returns**: `string[]`
- An array of file paths that have been modified but not staged.

**Example**:
```typescript
const modifiedFiles = logger.getModifiedFiles();
console.log('Modified files:', modifiedFiles);
```

### `isGitRepository`

**Description**: Checks if the current directory is within a Git repository.

**Returns**: `boolean`
- `true` if inside a Git repository, `false` otherwise.

**Example**:
```typescript
const isRepo = logger.isGitRepository();
console.log(`Is inside a Git repository: ${isRepo}`);
```

## Usage
To utilize these new methods, ensure that the `DevelopmentLogger` is properly instantiated with the necessary configuration. These methods are particularly useful for development environments where Git context is relevant for logging and debugging purposes.

## Integration Guide
1. **Instantiate the Logger**: Ensure you have a valid `LogConfig` to initialize the `DevelopmentLogger`.
2. **Use Git Methods**: Call the methods as needed to retrieve Git context information.
3. **Handle Undefined Values**: Be prepared to handle `undefined` values, especially in environments where Git is not available.

## Error Handling
- **Git Not Installed**: Methods will return `undefined` if Git is not installed or if the current directory is not a Git repository.
- **Command Timeout**: Commands are executed with a timeout of 5000ms. If a command takes longer, it will fail gracefully.

## Conclusion
The integration of Git context into the `DevelopmentLogger` enhances its functionality by providing additional context for logging. This is particularly useful in development workflows where understanding the current state of the repository is crucial.