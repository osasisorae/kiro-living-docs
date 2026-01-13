# Auto-Doc-Sync

![Build Status](https://img.shields.io/badge/build-passing-brightgreen) ![Version](https://img.shields.io/badge/version-1.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## Autonomous Documentation Synchronization System for Kiro Projects

Auto-Doc-Sync is an innovative system designed to automate the synchronization of documentation across Kiro projects. It ensures that your documentation is always up-to-date with the latest code changes, saving time and reducing errors.

## Overview

Auto-Doc-Sync addresses the common problem of outdated or inconsistent documentation in software projects. It is ideal for developers and project managers who need to maintain accurate documentation without the hassle of manual updates. By automating this process, Auto-Doc-Sync enhances productivity and ensures that all team members have access to the latest information.

### Key Benefits
- **Efficiency**: Automates the documentation update process, reducing manual effort.
- **Accuracy**: Ensures documentation reflects the latest code changes.
- **Collaboration**: Facilitates better communication among team members by providing up-to-date information.

## Features

- **UsageTracker**: A comprehensive system for tracking usage metrics, monitoring costs, and optimizing resource allocation.
- **UsageCLI**: Command-line interface for easy interaction with the usage tracking system, enabling quick setup and monitoring.
- **Git Context Integration**: Seamlessly integrates with Git to retrieve context information, enhancing the documentation process.

## Installation

### Prerequisites
- Node.js v14 or higher
- npm (Node Package Manager)

### Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/auto-doc-sync.git
   ```
2. Navigate to the project directory:
   ```bash
   cd auto-doc-sync
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

### Verification
Run the following command to ensure everything is set up correctly:
```bash
npm run test
```

## Quick Start

To start using Auto-Doc-Sync, follow these simple steps:

1. Initialize a new session:
   ```javascript
   const tracker = new UsageTracker();
   tracker.startSession('session-123');
   ```
2. Track an operation:
   ```javascript
   const operationId = tracker.startOperation('analysis');
   // Perform operation...
   tracker.endOperation(operationId, 'analysis', 100);
   ```
3. End the session and persist metrics:
   ```javascript
   tracker.endSession().then(metrics => console.log(metrics));
   ```

## Configuration

Auto-Doc-Sync can be configured via a configuration file located at `config/usage-config.json`.

### Key Options
- **enabled**: Enable or disable the tracking system.
- **costLimitPerSession**: Set a cost limit for each session.
- **costWarningThreshold**: Set a threshold for cost warnings.

### Example Configuration
```json
{
  "enabled": true,
  "costLimitPerSession": 100,
  "costWarningThreshold": 80
}
```

## API Reference

### UsageTracker

- **startSession(sessionId: string): Promise<void>**
  - Start tracking a new session.

- **startOperation(operationType: string, operationId?: string): string**
  - Begin tracking an operation.

- **endOperation(operationId: string, operationType: string, tokens?: number): void**
  - Complete tracking of an operation.

- **trackAnalysisRun(filesProcessed: number): void**
  - Record the completion of an analysis run.

- **checkCostThresholds(): UsageAlert | null**
  - Check if the current session exceeds cost thresholds.

- **endSession(): Promise<UsageMetrics | null>**
  - End the current session and save metrics.

- **getUsageSummary(days: number): Promise<UsageSummary>**
  - Retrieve a summary of usage over a specified period.

## Examples

### Example 1: Basic Usage Tracking
```javascript
const tracker = new UsageTracker();
tracker.startSession('session-001');
const opId = tracker.startOperation('analysis');
// Perform some analysis...
tracker.endOperation(opId, 'analysis', 150);
tracker.endSession().then(metrics => console.log(metrics));
```

### Example 2: Cost Monitoring
```javascript
const tracker = new UsageTracker({ costLimitPerSession: 50 });
tracker.startSession('session-002');
// Perform operations...
const alert = tracker.checkCostThresholds();
if (alert) {
  console.warn(alert.message);
}
tracker.endSession();
```

## Development

### Contributing
We welcome contributions! Please fork the repository and submit a pull request.

### Running Tests
To run tests, use:
```bash
npm test
```

### Development Setup
1. Ensure all dependencies are installed:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

Special thanks to all contributors and the open-source community for their support and collaboration.