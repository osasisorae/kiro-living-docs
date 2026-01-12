#!/usr/bin/env node

/**
 * Debug script to isolate the timeout issue
 */

const { AutoDocSyncSystem } = require('./dist/orchestrator.js');
const fs = require('fs').promises;
const path = require('path');

async function debugTimeoutTest() {
  console.log('🔍 Debug: Testing configuration error scenario...\n');
  
  const testDir = 'debug-test-workspace';
  
  try {
    // Clean up any existing test directory
    await fs.rm(testDir, { recursive: true, force: true });
    
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, '.kiro'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    
    // Create invalid JSON config (same as the failing test)
    const configFile = path.join(testDir, '.kiro', 'auto-doc-sync.json');
    await fs.writeFile(configFile, '{ invalid json }');
    console.log('✅ Created invalid JSON config file');
    
    // Create source file
    const sourceFile = path.join(testDir, 'src', 'config-error.ts');
    await fs.writeFile(sourceFile, 'export const CONFIG_ERROR = true;');
    console.log('✅ Created source file');
    
    // Initialize system with invalid config
    console.log('🚀 Initializing system with invalid config...');
    const system = new AutoDocSyncSystem(configFile, testDir);
    
    console.log('⏳ Calling system.initialize()...');
    await system.initialize();
    console.log('✅ System initialized successfully');
    
    console.log('⏳ Calling system.run()...');
    const startTime = Date.now();
    
    // Add timeout to prevent hanging
    const runPromise = system.run({
      triggerType: 'manual',
      targetFiles: [sourceFile],
      reason: 'Debug configuration error test'
    });
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out after 5 seconds')), 5000);
    });
    
    await Promise.race([runPromise, timeoutPromise]);
    
    const endTime = Date.now();
    console.log(`✅ System.run() completed in ${endTime - startTime}ms`);
    
    // Check if log files were created
    const logDir = path.join(testDir, '.kiro', 'development-log');
    try {
      const logFiles = await fs.readdir(logDir);
      console.log(`📝 Found ${logFiles.length} log files`);
    } catch (error) {
      console.log('📝 No log directory found (expected for some scenarios)');
    }
    
    console.log('\n🎉 Debug test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test directory');
    } catch (e) {
      console.warn('⚠️  Failed to clean up test directory:', e.message);
    }
  }
}

debugTimeoutTest().catch(console.error);