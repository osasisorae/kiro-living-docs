# Technical Implementation Specification: GitHub Issue Detection Agent

**Project:** Kiro Auto-Doc-Sync CLI Enhancement
**Feature:** Automated GitHub Issue Detection and Creation (Requirement 7)
**Author:** Manus AI
**Date:** January 16, 2026

## 1. Overview

This document specifies the technical implementation details for integrating automated issue detection and creation into the `kiro-docs sync` workflow. The primary mechanism will be an extension of the existing subagent architecture, leveraging the **GitHub Model Context Protocol (MCP)** server to create issues based on AI analysis of code changes.

The goal is to provide a seamless, automated process where the AI agent identifies potential bugs, documentation gaps, or necessary refactoring during the documentation synchronization process and logs them directly as GitHub issues for the development team to address.

## 2. Architectural Changes

The implementation requires extending the existing `SubagentClient` and defining a new structured output for the AI model.

### 2.1. New Subagent Task Type

A new task type, `issue-detection`, will be added to the `SubagentRequest` and handled by the `SubagentClient`.

| Component | Change | Purpose |
| :--- | :--- | :--- |
| `types.ts` | Add `IssueDetectionRequest` and `IssueDetectionResponse` interfaces. | Define the input (e.g., list of changed files, diffs) and the structured output (list of issues). |
| `client.ts` | Add `detectIssues(request: IssueDetectionRequest)` method. | Implement the logic to call the OpenAI API with the new prompt and schema. |
| `client.ts` | Add `IssueDetectionSchema` (Zod). | Define the required JSON structure for the AI's output. |

### 2.2. IssueDetection Zod Schema

The AI model must return a structured list of issues. This structure will directly map to the payload required by the GitHub MCP server's `issues_create` tool.

```typescript
const IssueDetectionSchema = z.object({
  issues: z.array(z.object({
    title: z.string().max(256).describe("A concise, descriptive title for the GitHub issue."),
    body: z.string().describe("A detailed description of the issue, including its location (file/line) and the reason for its creation (e.g., potential bug, missing docstring, refactoring need)."),
    labels: z.array(z.string()).optional().describe("A list of GitHub labels to apply, such as 'bug', 'documentation', or 'refactor'.")
  })).describe("A list of issues identified by the agent that should be created on GitHub.")
});
```

## 3. GitHub MCP Integration

The GitHub MCP server will be the exclusive mechanism for creating issues.

### 3.1. MCP Server Configuration

The user must configure the GitHub MCP server in Kiro. This is typically done in the workspace-level configuration file (`.kiro/settings/mcp.json`).

```json
{
  "mcpServers": {
    "github-repo-mcp": {
      "url": "https://api.github.com/mcp", // Example endpoint
      "headers": {
        "Authorization": "Bearer ${GITHUB_PAT}"
      },
      "autoApprove": ["issues_create"]
    }
  }
}
```

The `GITHUB_PAT` environment variable must be set with a Personal Access Token that has the `repo` scope enabled. The `autoApprove` list should include `issues_create` to prevent excessive user prompts.

### 3.2. Agent-to-MCP Workflow

The `kiro-docs sync` command will orchestrate the following steps:

1.  **Detect Changes**: Identify files modified since the last sync.
2.  **Trigger Agent**: Call `SubagentClient.detectIssues()` with the file diffs and project context.
3.  **Receive Structured Output**: Get the `IssueDetectionResponse` (list of issues).
4.  **Trigger MCP Tool**: For each issue in the response, the CLI will trigger a Kiro agent prompt that specifically invokes the GitHub MCP server's `issues_create` tool.

**Example Agent Prompt (triggered by CLI):**

> "Using the `github-repo-mcp` server, please create a new GitHub issue with the title: 'Missing docstring in `src/subagent/client.ts`' and the body: 'The `sendRequest` method is missing a JSDoc block, violating our documentation standards. Please add a detailed docstring.' Apply the label 'documentation'."

This delegates the final, sensitive action of issue creation to the Kiro agent, which will use the configured GitHub MCP tool.

## 4. Configuration and Hook Implementation

### 4.1. CLI Configuration (`.kiro/auto-doc-sync.json`)

The configuration file must be extended to allow users to tune the issue detection process.

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `githubRepo` | String | `null` | The GitHub repository name (e.g., `osasisorae/kiro-living-docs`). Required for issue creation. |
| `issueLabels` | Array<String> | `["ai-detected"]` | Default labels to apply to all AI-created issues. |
| `issueMinPriority` | Enum | `medium` | Minimum priority level for issues to be created (e.g., `low`, `medium`, `high`). |
| `issueAgentModel` | String | `gpt-4.1-nano` | The specific OpenAI model to use for the issue detection task. |

### 4.2. Kiro Hook for Triggering

The `kiro-docs sync` command will be modified to conditionally trigger the issue detection process. Since the CLI itself will handle the agent call and subsequent MCP tool invocation, a simple hook is not strictly necessary for the *creation* step, but a hook can be used to notify the user or log the activity.

**Proposed CLI Logic Flow:**

```mermaid
graph TD
    A[kiro-docs sync] --> B{Changes Detected?};
    B -- Yes --> C[Call SubagentClient.detectIssues()];
    C --> D{IssueDetectionResponse};
    D --> E{Iterate over Issues};
    E --> F[Trigger Kiro Agent to use issues_create MCP Tool];
    F --> G[Log Success/Failure];
    B -- No --> H[Exit];
    G --> H;
```

## 5. Implementation Steps

1.  **Update `types.ts`**: Define new request/response interfaces.
2.  **Update `client.ts`**: Implement `IssueDetectionSchema` and the `detectIssues` method.
3.  **Update CLI Logic**: Modify the `sync` command to call `detectIssues` and then orchestrate the MCP tool calls based on the response.
4.  **Configuration**: Implement logic to read new configuration properties from `.kiro/auto-doc-sync.json`.

This structured approach ensures that the new feature is robust, configurable, and leverages the secure, structured communication provided by the Model Context Protocol.

***

## References

*   [1] GitHub Model Context Protocol Server Documentation. *Details on available tools, including `issues_create`.*
*   [2] Kiro Documentation: Model Context Protocol (MCP). *Guide on configuring MCP servers in the Kiro IDE.*
*   [3] Zod Documentation. *Schema validation library used for structured AI outputs.*
