/**
 * Example usage of the Kiro Hook system integration
 */

import { HookManager, HookConfigGenerator } from './index.js';

async function demonstrateHookSystem() {
  console.log('🚀 Demonstrating Kiro Hook System Integration\n');

  // Create a hook manager
  const hookManager = new HookManager();

  // Generate and register hook configurations
  const postCommitConfig = HookConfigGenerator.generateGitPostCommitConfig();
  const manualConfig = HookConfigGenerator.generateManualTriggerConfig();

  hookManager.registerHook(postCommitConfig);
  hookManager.registerHook(manualConfig);

  console.log('📋 Registered hooks:');
  console.log('- Git post-commit hook');
  console.log('- Manual trigger hook\n');

  // Demonstrate manual trigger
  console.log('🔧 Testing manual trigger...');
  const manualResult = await hookManager.triggerManual('auto-doc-sync-manual', {
    reason: 'Testing hook system',
    targetFiles: ['src/hooks/manager.ts', 'src/hooks/types.ts']
  });

  console.log(`✅ Manual trigger result: ${manualResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`⏱️  Duration: ${manualResult.duration}ms`);
  console.log(`🆔 Execution ID: ${manualResult.executionId}\n`);

  // Demonstrate git hook trigger
  console.log('🔧 Testing git hook trigger...');
  const gitResult = await hookManager.triggerGitHook('auto-doc-sync-post-commit', {
    commitHash: 'abc123def456',
    author: 'Developer',
    message: 'Add hook system integration',
    changedFiles: ['src/hooks/manager.ts', 'src/hooks/types.ts'],
    branch: 'main'
  });

  console.log(`✅ Git hook result: ${gitResult.success ? 'SUCCESS' : 'FAILED'}`);
  console.log(`⏱️  Duration: ${gitResult.duration}ms`);
  console.log(`🆔 Execution ID: ${gitResult.executionId}\n`);

  // Show execution history
  const allResults = hookManager.getExecutionResults();
  console.log(`📊 Total executions: ${allResults.length}`);
  console.log('📈 Execution history:');
  allResults.forEach((result, index) => {
    console.log(`  ${index + 1}. ${result.context.triggerType} - ${result.success ? '✅' : '❌'} (${result.duration}ms)`);
  });

  console.log('\n🎉 Hook system demonstration complete!');
}

// Run the demonstration if this file is executed directly
if (require.main === module) {
  demonstrateHookSystem().catch(console.error);
}

export { demonstrateHookSystem };