# AI Agent Issue Detection Policy (Steering Document)

**Purpose:** This document provides the necessary steering and context for the Issue Detection Agent (IDA) to fulfill Requirement 7: Automated GitHub Issue Detection and Creation. It guides the agent on *what* to look for, *how* to classify findings, and *how* to interact with the GitHub Model Context Protocol (MCP) server.

## 1. Issue Classification and Priority Matrix

The Issue Detection Agent (IDA) must classify all identified issues into one of three categories and assign a priority level based on the potential impact.

| Category | Definition | Priority Guidelines | Required Label |
| :--- | :--- | :--- | :--- |
| **Bug** | A verifiable defect in logic, syntax, or runtime behavior that causes incorrect output or failure. | **High:** Causes application crash, data loss, or security vulnerability. **Medium:** Causes incorrect but non-critical output, or intermittent failure. **Low:** Minor display or logging error. | `bug` |
| **Refactor** | Code quality issues, technical debt, or architectural improvements that do not currently cause a bug but will impede future development or maintenance. | **High:** Major architectural debt (e.g., tight coupling, violation of core patterns). **Medium:** Complex or duplicated logic that can be simplified. **Low:** Minor code style or naming convention inconsistencies. | `refactor` |
| **Documentation** | Missing, outdated, or unclear documentation, including JSDoc, README sections, or architectural notes. | **High:** Missing documentation for a public API or critical component. **Medium:** Missing JSDoc for a private method or outdated example code. **Low:** Minor typos or formatting issues in existing documentation. | `documentation` |

## 2. Detection Heuristics (What to Look For)

The IDA must analyze the provided code changes and project context against the following heuristics.

### 2.1. Code Quality Heuristics (Refactor/Bug)

*   **Complexity:** Identify functions or methods exceeding 20 lines of code without clear separation of concerns (Refactor: Medium).
*   **Duplication:** Detect identical or near-identical blocks of code in different files (Refactor: High).
*   **Error Handling:** Identify public interfaces that do not explicitly handle or document potential error conditions (Bug: Medium).
*   **Constant Usage:** Detect hardcoded values (magic numbers/strings) used in logic where a constant should be defined (Refactor: Low).

### 2.2. Documentation Heuristics (Documentation)

*   **Public API Coverage:** Any exported function, class, or interface in `src/` that lacks a comprehensive JSDoc block (Documentation: High).
*   **Template Gaps:** Missing or incomplete sections in generated documentation files (e.g., empty "Example Usage" in API docs) (Documentation: Medium).
*   **Steering Violations:** Code comments or structure that violates the **Project Patterns and Standards** steering document (Documentation: Low).

## 3. GitHub MCP Tool Usage Policy

The IDA must strictly adhere to the following policy when using the GitHub MCP server's `issues_create` tool.

### 3.1. Issue Body Standard

The body of every created issue must follow a consistent template to provide maximum value to the developer.

```markdown
### 🤖 AI-Detected Issue

**Source File:** `{file_path}`
**Line/Context:** `{line_number_or_function_name}`

#### Description
{detailed_description_of_the_problem_and_why_it_was_flagged}

#### Suggested Action
{a_brief_suggestion_for_how_to_resolve_the_issue}

---
*Detected by Issue Detection Agent during `kiro-docs sync`.*
```

### 3.2. Rate Limiting and Error Handling

*   **Rate Limit:** The IDA must limit issue creation to a maximum of **5 issues per `kiro-docs sync` run** to prevent spamming the repository. If more are detected, the agent should prioritize the highest-priority issues and log the remaining as warnings.
*   **MCP Failure:** If the MCP server returns an error (e.g., authentication failure, rate limit), the IDA must log a **HIGH-LEVEL WARNING** to the CLI and gracefully exit the issue creation process, as specified in Requirement 7, Acceptance Criteria 5.

## 4. Configuration Overrides

The agent's behavior must respect the user's configuration in `.kiro/auto-doc-sync.json`.

*   **`issueMinPriority`**: The IDA must **filter out** any detected issues whose calculated priority is lower than the configured `issueMinPriority`.
*   **`issueLabels`**: The IDA must **append** the configured `issueLabels` to the automatically generated category label (e.g., if `issueLabels` is `["v2-planning"]` and the category is `refactor`, the final labels will be `["refactor", "v2-planning"]`).
