/**
 * Auto-Doc-Sync System - Main entry point
 */

export * from './types';
export * from './analysis';
export * from './templates';
export * from './output';
export * from './hooks';
export * from './logging';
export * from './subagent';

import { AutoDocSyncSystem } from './orchestrator';

// Export the main system class
export { AutoDocSyncSystem };

// CLI entry point
export async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const triggerType = args.find(arg => arg.startsWith('--trigger='))?.split('=')[1] as 'git-hook' | 'manual' || 'manual';
  const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
  const workspaceRoot = args.find(arg => arg.startsWith('--workspace='))?.split('=')[1];
  const targetFiles = args.filter(arg => arg.startsWith('--file=')).map(arg => arg.split('=')[1]);
  
  const system = new AutoDocSyncSystem(configPath, workspaceRoot);
  
  try {
    await system.initialize();
    
    await system.run({
      triggerType,
      configPath,
      targetFiles: targetFiles.length > 0 ? targetFiles : undefined
    });
  } catch (error) {
    console.error('Auto-Doc-Sync System failed:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}// Test comment Fri Jan 16 23:32:31 WAT 2026
// trigger Fri Jan 16 23:33:05 WAT 2026
// test 1768602844949
// test 1768602894506
// test 1768602941266
// test 1768603002931
// trigger Fri Jan 16 23:36:57 WAT 2026
// trigger Fri Jan 16 23:37:57 WAT 2026
// change1 Fri Jan 16 23:53:50 WAT 2026
// change2 Fri Jan 16 23:53:51 WAT 2026
// change1 Fri Jan 16 23:55:26 WAT 2026
// test change 1768604210974
