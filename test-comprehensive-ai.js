#!/usr/bin/env node

/**
 * Comprehensive test script to verify OpenAI integration with actual code analysis
 */

const { AutoDocSyncSystem } = require('./dist/orchestrator.js');
const fs = require('fs').promises;

async function testComprehensiveAI() {
  console.log('Testing comprehensive AI integration...\n');
  
  try {
    // Create a test directory with more complex code
    await fs.mkdir('test-ai-comprehensive', { recursive: true });
    
    // Create a TypeScript file with functions, classes, and types
    await fs.writeFile('test-ai-comprehensive/complex.ts', `
/**
 * User authentication service
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export class AuthService {
  private users: Map<string, User> = new Map();

  /**
   * Authenticate user with email and password
   */
  async authenticate(email: string, password: string): Promise<User | null> {
    // Implementation here
    return null;
  }

  /**
   * Register a new user
   */
  async register(userData: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: Math.random().toString(36),
      ...userData
    };
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   */
  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }
}

/**
 * API endpoint handlers
 */
export const authRoutes = {
  'POST /auth/login': async (req: any, res: any) => {
    // Login endpoint
  },
  
  'POST /auth/register': async (req: any, res: any) => {
    // Register endpoint  
  },
  
  'GET /auth/profile': async (req: any, res: any) => {
    // Profile endpoint
  }
};

export type AuthResponse = {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
};
`);

    // Create minimal config
    await fs.writeFile('test-ai-comprehensive/.env', 'OPENAI_API_KEY="' + process.env.OPENAI_API_KEY + '"');
    
    const system = new AutoDocSyncSystem(undefined, 'test-ai-comprehensive');
    await system.initialize();
    
    console.log('Running AI-enhanced analysis on complex code...');
    const result = await system.run({
      triggerType: 'manual',
      targetFiles: ['complex.ts'],
      reason: 'Testing comprehensive AI analysis'
    });
    
    console.log('✅ Comprehensive AI integration test completed successfully!');
    console.log('Analysis result:', result ? 'Success' : 'No changes detected');
    
    // Check if any documentation was generated
    try {
      const logFiles = await fs.readdir('test-ai-comprehensive/.kiro/development-log');
      console.log(`📝 Generated ${logFiles.length} log entries`);
      
      if (logFiles.length > 0) {
        const latestLog = logFiles.sort().pop();
        const logContent = await fs.readFile(`test-ai-comprehensive/.kiro/development-log/${latestLog}`, 'utf-8');
        console.log('\n📋 Latest log entry preview:');
        console.log(logContent.substring(0, 500) + '...');
      }
    } catch (error) {
      console.log('No log files found (expected for no-change scenario)');
    }
    
  } catch (error) {
    console.error('❌ Comprehensive AI integration test failed:', error.message);
    if (error.message.includes('API key')) {
      console.error('Make sure OPENAI_API_KEY is set in your .env file');
    }
  } finally {
    // Clean up
    try {
      await fs.rm('test-ai-comprehensive', { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

testComprehensiveAI().catch(console.error);