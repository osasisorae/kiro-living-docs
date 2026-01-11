#!/usr/bin/env node

/**
 * Test script to verify OpenAI integration is working
 */

const { AutoDocSyncSystem } = require('./dist/orchestrator.js');

async function testAIIntegration() {
  console.log('Testing OpenAI integration...\n');
  
  try {
    // Create a simple test file
    const fs = require('fs').promises;
    await fs.mkdir('test-ai', { recursive: true });
    await fs.writeFile('test-ai/simple.ts', `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export class Calculator {
  add(a: number, b: number): number {
    return a + b;
  }
}
`);

    // Create minimal config
    await fs.writeFile('test-ai/.env', 'OPENAI_API_KEY="' + process.env.OPENAI_API_KEY + '"');
    
    const system = new AutoDocSyncSystem(undefined, 'test-ai');
    await system.initialize();
    
    console.log('Running AI-enhanced analysis...');
    await system.run({
      triggerType: 'manual',
      targetFiles: ['simple.ts'],
      reason: 'Testing AI integration'
    });
    
    console.log('✅ AI integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ AI integration test failed:', error.message);
    if (error.message.includes('API key')) {
      console.error('Make sure OPENAI_API_KEY is set in your .env file');
    }
  } finally {
    // Clean up
    const fs = require('fs').promises;
    try {
      await fs.rm('test-ai', { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testAIIntegration().catch(console.error);