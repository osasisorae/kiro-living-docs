# Recommended MCP Servers for Kiro Living Docs Project

## Introduction

The `kiro-living-docs` project aims to create an autonomous documentation synchronization agent. To further enhance its capabilities and fully leverage the Kiro ecosystem, integrating relevant Model Context Protocol (MCP) servers is crucial. MCPs extend Kiro's functionality by providing specialized tools and access to external data sources, allowing the AI agent to perform more sophisticated tasks related to code analysis, documentation generation, and knowledge management.

This report outlines recommended MCP servers that would significantly benefit the `kiro-living-docs` project, along with their potential integration points and benefits.

## Recommended MCP Servers

Based on the project's objectives and the functionalities offered by various MCP servers, the following are recommended:

### 1. GitMCP (GitHub Repository Integration)

*   **Description:** GitMCP is a remote MCP server designed to connect to any GitHub repository, providing up-to-date documentation and repository content on the fly [1].
*   **Benefits for `kiro-living-docs`:**
    *   **Real-time Code Context:** Allows the documentation agent to access the latest code, commit history, and project structure directly from the GitHub repository. This is fundamental for 
generating accurate and current living documentation.
    *   **Automated Updates:** Can be integrated with Kiro hooks (e.g., `post-commit-doc-sync.json`) to automatically pull changes from the repository, triggering documentation updates.
    *   **Enhanced Code Analysis:** Provides the agent with direct access to the codebase for deeper analysis, enabling more precise documentation generation.
*   **Integration Points:**
    *   **Kiro Hooks:** Trigger GitMCP actions (e.g., fetching repository updates) via `post-commit` or `pre-push` hooks.
    *   **Subagents:** The `doc-analysis-agent` can query GitMCP for code context to inform its analysis and documentation generation.

### 2. Code Documentation Generation MCP Server

*   **Description:** This MCP server automatically analyzes repository structure and generates comprehensive documentation for code projects [2].
*   **Benefits for `kiro-living-docs`:**
    *   **Automated Documentation Generation:** Directly supports the core goal of the `kiro-living-docs` project by providing tools for generating documentation from code.
    *   **Structured Output:** Can produce documentation in various formats, which can then be integrated into the living documentation system.
    *   **Reduced Manual Effort:** Automates a significant portion of the documentation process, freeing up developers.
*   **Integration Points:**
    *   **Subagents:** The `doc-analysis-agent` can invoke this MCP server to generate initial documentation drafts or update existing ones based on code changes.
    *   **Kiro Specs:** The output from this MCP can be used to fulfill requirements defined in Kiro specs related to documentation content.

### 3. Context7 MCP Server (Up-to-date Code Documentation)

*   **Description:** Context7 MCP pulls up-to-date, version-specific documentation and code examples directly from the source and places them into the prompt [3].
*   **Benefits for `kiro-living-docs`:**
    *   **Contextual Documentation:** Provides the agent with highly relevant and current documentation snippets, improving the quality and accuracy of generated content.
    *   **Version-Specific Information:** Ensures that the documentation generated or updated is relevant to the specific version of the codebase being analyzed.
    *   **Code Examples:** Offers code examples that can be incorporated into the living documentation, making it more practical and useful.
*   **Integration Points:**
    *   **Subagents:** The `doc-analysis-agent` can query Context7 for contextual information and code examples during its analysis and generation phases.
    *   **Steering Files:** Information from Context7 can be used to enrich steering files, providing Kiro with more detailed knowledge about specific libraries or frameworks.

### 4. Filesystem MCP Server

*   **Description:** Provides secure file operations with configurable access controls [4].
*   **Benefits for `kiro-living-docs`:**
    *   **Managed File Access:** Allows the agent to securely read, write, and manage documentation files within the project's file system.
    *   **Version Control Integration:** Can be used in conjunction with GitMCP to ensure that documentation changes are properly tracked and synchronized.
    *   **Output Management:** Facilitates the saving and organization of generated documentation within the project structure.
*   **Integration Points:**
    *   **Kiro Hooks:** Hooks can trigger file operations (e.g., writing generated documentation to a specific path) using the Filesystem MCP.
    *   **Subagents:** The `doc-analysis-agent` can use this MCP to read source code files and write generated documentation files.

### 5. Memory Bank MCP (or similar knowledge graph-based memory system)

*   **Description:** Organizes project knowledge hierarchically, helping AI better understand the project's context [5].
*   **Benefits for `kiro-living-docs`:**
    *   **Persistent Knowledge:** Stores and retrieves structured knowledge about the project, including architectural decisions, design patterns, and historical context.
    *   **Improved Contextual Understanding:** Enhances the agent's ability to understand complex project nuances, leading to more intelligent documentation generation.
    *   **Reduced Redundancy:** Prevents the agent from 
re-generating information it already knows or has processed.
*   **Integration Points:**
    *   **Subagents:** The `doc-analysis-agent` can store and retrieve project knowledge from the Memory Bank MCP to inform its documentation generation process.
    *   **Steering Files:** Information from steering files can be ingested into the Memory Bank to create a richer knowledge graph.

## Conclusion

Integrating these MCP servers would significantly elevate the capabilities of the `kiro-living-docs` project. By providing the autonomous documentation agent with direct access to Git repositories, specialized code analysis tools, contextual documentation, secure file operations, and a persistent knowledge base, the project can achieve a higher level of automation, accuracy, and intelligence in generating and synchronizing living documentation. While the project currently has MCP disabled, enabling and configuring these servers would be a crucial next step for developing a robust and comprehensive living documentation system.

## References

[1] GitMCP. (n.d.). *GitMCP - an instant MCP server for *any* GitHub repo*. Retrieved from https://www.reddit.com/r/mcp/comments/1k5cndl/gitmcp_an_instant_mcp_server_for_any_github_repo/
[2] AWS Labs. (n.d.). *Code Documentation Generation MCP Server*. Retrieved from https://awslabs.github.io/mcp/servers/code-doc-gen-mcp-server
[3] Upstash. (n.d.). *Context7 MCP Server -- Up-to-date code documentation for ...*. Retrieved from https://github.com/upstash/context7
[4] modelcontextprotocol/servers. (n.d.). *Filesystem*. Retrieved from https://github.com/modelcontextprotocol/servers#filesystem
[5] Reddit. (n.d.). *Must-Have MCP Servers for Coding and Beyond : r/ClaudeAI*. Retrieved from https://www.reddit.com/r/ClaudeAI/comments/1k0f3vs/musthave_mcp_servers_for_coding_and_beyond/
