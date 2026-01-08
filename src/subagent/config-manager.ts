/**
 * Configuration Manager for Subagent setup and management
 */

import * as fs from 'fs';
import * as path from 'path';
import { SubagentConfig } from './types';

export class SubagentConfigManager {
  private static readonly DEFAULT_CONFIG_PATH = '.kiro/subagents/doc-analysis-agent.json';
  private static readonly SUBAGENTS_DIR = '.kiro/subagents';

  /**
   * Initialize subagent configuration directory and files
   */
  static async initialize(projectPath: string = process.cwd()): Promise<void> {
    const subagentsDir = path.join(projectPath, this.SUBAGENTS_DIR);
    const configPath = path.join(projectPath, this.DEFAULT_CONFIG_PATH);

    // Create subagents directory if it doesn't exist
    if (!fs.existsSync(subagentsDir)) {
      fs.mkdirSync(subagentsDir, { recursive: true });
    }

    // Create default configuration if it doesn't exist
    if (!fs.existsSync(configPath)) {
      const defaultConfig = this.createDefaultConfig();
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
    }
  }

  /**
   * Load subagent configuration
   */
  static loadConfig(configPath?: string): SubagentConfig {
    const fullPath = configPath || this.DEFAULT_CONFIG_PATH;
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Subagent configuration not found at ${fullPath}`);
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse subagent configuration: ${error}`);
    }
  }

  /**
   * Save subagent configuration
   */
  static saveConfig(config: SubagentConfig, configPath?: string): void {
    const fullPath = configPath || this.DEFAULT_CONFIG_PATH;
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    try {
      fs.writeFileSync(fullPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save subagent configuration: ${error}`);
    }
  }

  /**
   * Validate subagent configuration
   */
  static validateConfig(config: SubagentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'capabilities', 'configuration', 'prompts'];
    for (const field of requiredFields) {
      if (!(field in config)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check configuration structure
    if (config.configuration) {
      const requiredConfigFields = ['model', 'temperature', 'maxTokens', 'timeout'];
      for (const field of requiredConfigFields) {
        if (!(field in config.configuration)) {
          errors.push(`Missing required configuration field: ${field}`);
        }
      }
    }

    // Check prompts structure
    if (config.prompts) {
      const requiredPrompts = ['system', 'codeAnalysis', 'changeClassification', 'documentationGeneration', 'templateProcessing'];
      for (const prompt of requiredPrompts) {
        if (!(prompt in config.prompts)) {
          errors.push(`Missing required prompt: ${prompt}`);
        }
      }
    }

    // Check capabilities
    if (config.capabilities && !Array.isArray(config.capabilities)) {
      errors.push('Capabilities must be an array');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create default subagent configuration
   */
  private static createDefaultConfig(): SubagentConfig {
    return {
      name: "doc-analysis-agent",
      version: "1.0.0",
      description: "Specialized AI agent for code analysis and documentation generation in the Auto-Doc-Sync System",
      capabilities: [
        "code-analysis",
        "ast-parsing",
        "diff-analysis", 
        "documentation-generation",
        "template-processing",
        "change-classification"
      ],
      configuration: {
        model: "gpt-4",
        temperature: 0.1,
        maxTokens: 4000,
        timeout: 30000
      },
      prompts: {
        system: "You are a specialized documentation analysis agent for the Auto-Doc-Sync System. Your role is to analyze code changes and generate structured documentation requirements. You have expertise in:\n\n1. Code Analysis: Parse TypeScript/JavaScript code to extract functions, classes, and API definitions\n2. Change Classification: Identify new features, API modifications, and architectural changes\n3. Documentation Generation: Create structured documentation requirements based on code analysis\n4. Template Processing: Apply documentation templates consistently\n\nYou work with the following data structures:\n- ChangeAnalysis: Complete analysis results with timestamps and change classifications\n- ChangedFile: Individual file changes with extracted code elements\n- DocumentationRequirement: Structured requirements for documentation updates\n- APIDefinition: Extracted API information including parameters and return types\n\nAlways provide structured, actionable output that can be processed by the Auto-Doc-Sync System.",
        codeAnalysis: "Analyze the following code changes and extract:\n1. Function definitions with parameters and return types\n2. Class definitions with methods and properties\n3. API endpoints and their specifications\n4. Exported interfaces and types\n\nCode changes:\n{changes}\n\nProvide the analysis in the following JSON structure:\n{\n  \"extractedFunctions\": [...],\n  \"extractedClasses\": [...],\n  \"extractedAPIs\": [...],\n  \"extractedTypes\": [...]\n}",
        changeClassification: "Classify the following code changes and identify:\n1. New features (completely new functionality)\n2. API modifications (changes to existing APIs)\n3. Architectural changes (structural modifications)\n4. Documentation impact (what docs need updating)\n\nChanged files:\n{changedFiles}\n\nProvide the classification in the following JSON structure:\n{\n  \"newFeatures\": [...],\n  \"apiModifications\": [...],\n  \"architecturalChanges\": [...],\n  \"documentationRequirements\": [...]\n}",
        documentationGeneration: "Generate documentation content based on the following analysis:\n\nAnalysis Results:\n{analysisResults}\n\nTemplate Type: {templateType}\n\nGenerate documentation content that:\n1. Follows the specified template format\n2. Includes all relevant technical details\n3. Maintains consistency with existing documentation\n4. Provides clear, actionable information\n\nReturn the generated content as structured text ready for file output.",
        templateProcessing: "Process the following template with the provided variables:\n\nTemplate:\n{template}\n\nVariables:\n{variables}\n\nApply the variables to the template and return the processed content. Ensure:\n1. All variables are properly substituted\n2. Formatting is preserved\n3. Any conditional sections are handled correctly\n4. The output is ready for direct file writing"
      }
    };
  }

  /**
   * Update specific configuration fields
   */
  static updateConfig(updates: Partial<SubagentConfig>, configPath?: string): void {
    const currentConfig = this.loadConfig(configPath);
    const updatedConfig = { ...currentConfig, ...updates };
    
    const validation = this.validateConfig(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }

    this.saveConfig(updatedConfig, configPath);
  }

  /**
   * Get configuration file path
   */
  static getConfigPath(projectPath?: string): string {
    return projectPath 
      ? path.join(projectPath, this.DEFAULT_CONFIG_PATH)
      : this.DEFAULT_CONFIG_PATH;
  }

  /**
   * Check if subagent configuration exists
   */
  static configExists(configPath?: string): boolean {
    const fullPath = configPath || this.DEFAULT_CONFIG_PATH;
    return fs.existsSync(fullPath);
  }
}