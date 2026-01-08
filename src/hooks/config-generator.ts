/**
 * Hook configuration generator for common scenarios
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { HookConfig, HookTemplate } from './types.js';

export class HookConfigGenerator {
  /**
   * Generate git post-commit hook configuration
   */
  static generateGitPostCommitConfig(projectPath: string = process.cwd()): HookConfig {
    return {
      name: 'auto-doc-sync-post-commit',
      trigger: 'git-commit',
      enabled: true,
      timeout: 30000,
      command: 'node dist/index.js --trigger=git-hook',
      workingDirectory: projectPath,
      environment: {
        NODE_ENV: 'production',
        AUTO_DOC_SYNC: 'true',
        GIT_HOOK: 'post-commit'
      }
    };
  }

  /**
   * Generate manual trigger hook configuration
   */
  static generateManualTriggerConfig(projectPath: string = process.cwd()): HookConfig {
    return {
      name: 'auto-doc-sync-manual',
      trigger: 'manual',
      enabled: true,
      timeout: 60000,
      command: 'node dist/index.js --trigger=manual',
      workingDirectory: projectPath,
      environment: {
        NODE_ENV: 'production',
        AUTO_DOC_SYNC: 'true',
        MANUAL_TRIGGER: 'true'
      }
    };
  }

  /**
   * Generate Kiro hook configuration file for the IDE
   */
  static async generateKiroHookConfig(
    outputPath: string = '.kiro/hooks',
    projectPath: string = process.cwd()
  ): Promise<void> {
    await fs.mkdir(outputPath, { recursive: true });

    // Generate post-commit hook config
    const postCommitConfig = this.generateGitPostCommitConfig(projectPath);
    const postCommitFile = join(outputPath, 'post-commit.json');
    await fs.writeFile(postCommitFile, JSON.stringify(postCommitConfig, null, 2));

    // Generate manual trigger config
    const manualConfig = this.generateManualTriggerConfig(projectPath);
    const manualFile = join(outputPath, 'manual-trigger.json');
    await fs.writeFile(manualFile, JSON.stringify(manualConfig, null, 2));

    // Generate Kiro IDE hook configuration
    const kiroHookConfig = {
      hooks: [
        {
          name: 'Auto-Doc Sync (Post-Commit)',
          description: 'Automatically sync documentation after git commits',
          trigger: 'git-post-commit',
          command: `node ${join(projectPath, 'dist/index.js')} --trigger=git-hook`,
          enabled: true,
          timeout: 30000
        },
        {
          name: 'Auto-Doc Sync (Manual)',
          description: 'Manually trigger documentation sync',
          trigger: 'manual',
          command: `node ${join(projectPath, 'dist/index.js')} --trigger=manual`,
          enabled: true,
          timeout: 60000
        }
      ]
    };

    const kiroConfigFile = join(outputPath, 'kiro-hooks.json');
    await fs.writeFile(kiroConfigFile, JSON.stringify(kiroHookConfig, null, 2));

    console.log(`Generated hook configurations in ${outputPath}`);
  }

  /**
   * Generate git hook script for post-commit
   */
  static async generateGitHookScript(
    gitHooksPath: string = '.git/hooks',
    projectPath: string = process.cwd()
  ): Promise<void> {
    const hookScript = `#!/bin/sh
# Auto-Doc-Sync post-commit hook
# This hook triggers documentation synchronization after each commit

echo "Running Auto-Doc-Sync..."
cd "${projectPath}"

# Check if the auto-doc-sync system is available
if [ -f "dist/index.js" ]; then
    node dist/index.js --trigger=git-hook
    if [ $? -eq 0 ]; then
        echo "✅ Documentation sync completed successfully"
    else
        echo "❌ Documentation sync failed"
        exit 1
    fi
else
    echo "⚠️  Auto-Doc-Sync not built. Run 'npm run build' first."
    exit 1
fi
`;

    const hookFile = join(gitHooksPath, 'post-commit');
    await fs.writeFile(hookFile, hookScript);
    await fs.chmod(hookFile, 0o755); // Make executable

    console.log(`Generated git post-commit hook at ${hookFile}`);
  }

  /**
   * Generate complete hook setup for a project
   */
  static async setupProjectHooks(projectPath: string = process.cwd()): Promise<void> {
    console.log('Setting up Auto-Doc-Sync hooks...');

    // Generate Kiro hook configurations
    await this.generateKiroHookConfig(join(projectPath, '.kiro/hooks'), projectPath);

    // Generate git hook script
    await this.generateGitHookScript(join(projectPath, '.git/hooks'), projectPath);

    // Create example manual trigger script
    const manualScript = `#!/bin/bash
# Manual trigger script for Auto-Doc-Sync
echo "Manually triggering Auto-Doc-Sync..."
node dist/index.js --trigger=manual "$@"
`;

    const manualScriptFile = join(projectPath, 'trigger-doc-sync.sh');
    await fs.writeFile(manualScriptFile, manualScript);
    await fs.chmod(manualScriptFile, 0o755);

    console.log('✅ Hook setup completed!');
    console.log('Available commands:');
    console.log('  - Git hooks: Automatic on commit');
    console.log('  - Manual: ./trigger-doc-sync.sh');
    console.log('  - CLI: node dist/hooks/cli.js --hook auto-doc-sync-manual');
  }
}