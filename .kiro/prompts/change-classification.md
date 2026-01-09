# Change Classification Prompt

Classify the following code changes and identify their impact on documentation requirements.

## Classification Categories

Analyze and categorize changes into:

1. **New Features** - Completely new functionality added
2. **API Modifications** - Changes to existing APIs, function signatures, or interfaces
3. **Architectural Changes** - Structural modifications to the codebase
4. **Documentation Impact** - What documentation needs updating

## Input Data

Changed files:
{changedFiles}

## Expected Output Format

Provide the classification in the following JSON structure:

```json
{
  "newFeatures": [
    {
      "name": "Feature Name",
      "description": "Detailed description of the new feature",
      "affectedFiles": ["src/file1.ts", "src/file2.ts"],
      "apiSurface": ["newFunction", "NewClass"],
      "documentationNeeded": ["API docs", "README update", "Examples"]
    }
  ],
  "apiModifications": [
    {
      "name": "Modified API",
      "type": "breaking|non-breaking|enhancement",
      "description": "Description of the API change",
      "before": "Previous API signature",
      "after": "New API signature",
      "migrationRequired": true,
      "affectedFiles": ["src/api.ts"]
    }
  ],
  "architecturalChanges": [
    {
      "component": "Component Name",
      "type": "refactor|new-pattern|dependency-change",
      "description": "Description of architectural change",
      "impact": "high|medium|low",
      "affectedModules": ["module1", "module2"],
      "documentationNeeded": ["Architecture docs", "Setup instructions"]
    }
  ],
  "documentationRequirements": [
    {
      "type": "api-spec|readme-section|setup-guide|architecture-notes",
      "targetFile": "path/to/documentation/file",
      "section": "specific section if applicable",
      "priority": "high|medium|low",
      "description": "What needs to be documented",
      "suggestedContent": "Brief outline of content needed"
    }
  ]
}
```

## Classification Guidelines

- **New Features**: Look for entirely new classes, modules, or major functionality
- **API Changes**: Focus on public interface modifications, parameter changes, return type changes
- **Architecture**: Identify structural changes, new patterns, dependency updates
- **Breaking vs Non-breaking**: Determine if changes require user code modifications
- **Priority**: High for breaking changes, medium for new features, low for internal refactors