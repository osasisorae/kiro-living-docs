# Implementation Plan: CLI Standalone Tool

## Overview

This implementation plan transforms the existing `src/cli.ts` into a full-featured standalone CLI tool with command-based architecture. The plan follows an incremental approach, building core infrastructure first, then implementing each command, and finally integrating the Issue Detection Agent.

## Tasks

- [x] 1. Set up command infrastructure and argument parsing
  - [x] 1.1 Create command router and base interfaces
    - Create `src/commands/types.ts` with `Command`, `CommandOption`, `CommandResult`, `ParsedArgs` interfaces
    - Create `src/commands/router.ts` with command registration and dispatch logic
    - _Requirements: All commands need this foundation_

  - [x] 1.2 Refactor CLI entry point to use command router
    - Update `src/cli.ts` to use new argument parser and command router
    - Support `kiro-docs <command> [options]` syntax
    - Maintain backward compatibility with existing `auto-doc-sync` usage
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

  - [x] 1.3 Write unit tests for argument parsing
    - Test command routing for all supported commands
    - Test option parsing with various flag combinations
    - _Requirements: 1.1-1.6, 2.1-2.6, 3.1-3.6_

- [x] 2. Implement InitCommand
  - [x] 2.1 Create template definitions
    - Create `src/templates/definitions.ts` with minimal, standard, comprehensive templates
    - Define file contents and directory structures for each template type
    - _Requirements: 1.2_

  - [x] 2.2 Implement InitCommand core logic
    - Create `src/commands/init.ts` implementing `Command` interface
    - Implement directory creation, config file generation, template scaffolding
    - Handle `--template`, `--dry-run`, `--force` options
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.3 Write property test for init scaffolding
    - **Property 1: Init creates correct directory structure**
    - **Property 2: Template scaffolding matches definition**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 2.4 Write property test for dry-run behavior
    - **Property 4: Dry-run/preview idempotence**
    - **Validates: Requirements 1.6**

- [x] 3. Implement FileWatcher service
  - [x] 3.1 Create FileWatcher with debouncing
    - Create `src/services/fileWatcher.ts` with chokidar integration
    - Implement debounce logic for rapid file changes
    - Support include/exclude patterns from config
    - _Requirements: 2.1, 2.5_

  - [x] 3.2 Write property test for debounce behavior
    - **Property 6: Debounce coalesces rapid changes**
    - **Validates: Requirements 2.5**

- [x] 4. Implement WatchCommand
  - [x] 4.1 Implement WatchCommand core logic
    - Create `src/commands/watch.ts` implementing `Command` interface
    - Integrate FileWatcher service
    - Handle graceful shutdown on SIGINT/SIGTERM
    - Display status updates and change summaries
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 4.2 Write property test for watch triggers
    - **Property 5: Watch triggers on pattern matches**
    - **Validates: Requirements 2.2**

- [x] 5. Checkpoint - Core infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement GenerateCommand
  - [ ] 6.1 Implement GenerateCommand core logic
    - Create `src/commands/generate.ts` implementing `Command` interface
    - Integrate with existing `AutoDocSyncSystem` orchestrator
    - Handle `--files`, `--type`, `--preview` options
    - Display generation summary
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ] 6.2 Write integration tests for GenerateCommand
    - Test generate with specific file targets
    - Test generate with type filtering (api, readme, architecture)
    - Test preview mode shows output without writing
    - Test generation summary output
    - _Validates: Requirements 3.1, 3.2, 3.3, 3.4_

- [ ] 7. Implement SyncCommand (without Issue Detection)
  - [ ] 7.1 Create SyncEngine service
    - Create `src/services/syncEngine.ts` for diff detection and conflict resolution
    - Implement file comparison and diff summary generation
    - Support conflict detection between manual edits and generated content
    - _Requirements: 4.1, 4.2_

  - [ ] 7.2 Implement SyncCommand core logic
    - Create `src/commands/sync.ts` implementing `Command` interface
    - Integrate SyncEngine service
    - Handle `--force`, `--dry-run` options
    - Display diff summary
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 7.3 Write integration tests for SyncCommand
    - Test sync detects and applies documentation changes
    - Test dry-run shows changes without applying
    - Test force flag overwrites existing content
    - Test diff summary output accuracy
    - _Validates: Requirements 4.1, 4.3, 4.4_

- [ ] 8. Implement ConfigCommand
  - [ ] 8.1 Extend ConfigManager for CLI operations
    - Add `setConfigValue(key, value)` method to `src/config.ts`
    - Add `resetConfig()` method
    - Add formatted display output for `show` subcommand
    - _Requirements: 5.1, 5.2, 5.5_

  - [ ] 8.2 Implement ConfigCommand
    - Create `src/commands/config.ts` implementing `Command` interface
    - Implement `show`, `set`, `validate`, `reset` subcommands
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 8.3 Write integration tests for ConfigCommand
    - Test config show displays all settings
    - Test config set updates values correctly
    - Test config validate reports issues
    - Test config reset restores defaults
    - _Validates: Requirements 5.1, 5.2, 5.3, 5.5_

- [ ] 9. Implement StatusCommand
  - [ ] 9.1 Implement StatusCommand
    - Create `src/commands/status.ts` implementing `Command` interface
    - Gather initialization status, config validity, last sync time
    - Support `--verbose` for additional details
    - Display warnings and suggestions
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 9.2 Write integration tests for StatusCommand
    - Test status shows initialization state
    - Test status shows config validity
    - Test verbose mode shows additional details
    - Test warnings are displayed for issues
    - _Validates: Requirements 6.1, 6.2, 6.4_

- [ ] 10. Checkpoint - All commands implemented
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Implement Issue Detection Agent
  - [ ] 11.1 Create IssueDetectionAgent service
    - Create `src/services/issueDetectionAgent.ts`
    - Implement `analyzeChanges()` with detection heuristics from steering policy
    - Implement `generateMcpPayloads()` for GitHub issue creation
    - Implement `applyPolicy()` for priority filtering and rate limiting
    - _Requirements: 7.2, 7.4, 7.6_

  - [ ] 11.2 Add IssueDetectionConfig to configuration schema
    - Update `src/config.ts` with `issueDetection` config section
    - Add validation for `githubRepo`, `issueLabels`, `issueMinPriority`, `maxIssuesPerSync`
    - _Requirements: 7.6_

  - [ ] 11.3 Integrate Issue Detection into SyncCommand
    - Update `src/commands/sync.ts` to call `triggerIssueDetection()` after sync
    - Handle MCP unavailability gracefully (log warning, continue)
    - _Requirements: 7.1, 7.3, 7.5_

  - [ ] 11.4 Write integration tests for Issue Detection
    - Test issue detection triggers after sync with changes
    - Test issue payload follows required structure
    - Test rate limiting respects maxIssuesPerSync config
    - Test priority filtering respects issueMinPriority config
    - Test graceful handling when MCP is unavailable
    - _Validates: Requirements 7.1, 7.2, 7.4, 7.5, 7.6_

- [ ] 12. Final integration and documentation
  - [ ] 12.1 Update CLI help text and documentation
    - Update help output in `src/cli.ts` with all new commands
    - Update README.md with CLI usage examples
    - _Requirements: All_

  - [ ] 12.2 Add npm bin entry for `kiro-docs`
    - Update `package.json` with `bin` entry for `kiro-docs`
    - Ensure CLI is executable after `npm install`
    - _Requirements: All_

- [ ] 13. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks 1-5 include property tests for core infrastructure validation
- Tasks 6+ use integration tests for end-to-end command validation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Integration tests validate real command behavior with actual file system operations
