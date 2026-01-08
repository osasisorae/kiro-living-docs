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
  const system = new AutoDocSyncSystem();
  
  try {
    await system.initialize();
    
    // Parse command line arguments
    const triggerType = args.find(arg => arg.startsWith('--trigger='))?.split('=')[1] as 'git-hook' | 'manual' || 'manual';
    const configPath = args.find(arg => arg.startsWith('--config='))?.split('=')[1];
    const targetFiles = args.filter(arg => arg.startsWith('--file=')).map(arg => arg.split('=')[1]);
    
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
}