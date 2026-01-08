/**
 * Core analyzer implementation for code analysis and change detection
 */

import * as fs from 'fs';
import * as path from 'path';
import { 
  ChangeAnalysis, 
  ChangedFile, 
  FunctionDefinition, 
  ClassDefinition, 
  APIDefinition, 
  FeatureDescription, 
  ArchitecturalChange,
  DocumentationRequirement 
} from '../types';
import { AnalysisConfig, AnalysisResult, DiffEntry, KiroContext } from './types';

export class CodeAnalyzer {
  constructor(private config: AnalysisConfig) {}

  async analyze(changes: string[]): Promise<ChangeAnalysis> {
    const timestamp = new Date().toISOString();
    const diffEntries = this.parseDiff(changes);
    const changedFiles = await this.analyzeChangedFiles(diffEntries);
    const extractedAPIs = this.extractAPIs(changedFiles);
    const newFeatures = this.identifyNewFeatures(changedFiles);
    const architecturalChanges = this.identifyArchitecturalChanges(changedFiles);
    const documentationRequirements = this.generateDocumentationRequirements(
      extractedAPIs, 
      newFeatures, 
      architecturalChanges
    );

    return {
      timestamp,
      triggerType: 'manual',
      changedFiles,
      extractedAPIs,
      newFeatures,
      architecturalChanges,
      documentationRequirements
    };
  }

  /**
   * Parse diff output into structured entries
   */
  private parseDiff(changes: string[]): DiffEntry[] {
    const entries: DiffEntry[] = [];
    
    for (const change of changes) {
      const lines = change.split('\n');
      let currentFile = '';
      let changeType: 'added' | 'modified' | 'deleted' = 'modified';
      let diffContent = '';

      for (const line of lines) {
        if (line.startsWith('diff --git')) {
          // Extract file path from git diff header
          const match = line.match(/diff --git a\/(.+) b\/(.+)/);
          if (match) {
            currentFile = match[2];
          }
        } else if (line.startsWith('new file mode')) {
          changeType = 'added';
        } else if (line.startsWith('deleted file mode')) {
          changeType = 'deleted';
        } else if (line.startsWith('+++') || line.startsWith('---')) {
          // Skip file headers
          continue;
        } else if (line.startsWith('@@')) {
          // Include hunk headers in diff content
          diffContent += line + '\n';
        } else if (line.startsWith('+') || line.startsWith('-') || line.startsWith(' ')) {
          diffContent += line + '\n';
        }
      }

      if (currentFile) {
        entries.push({
          path: currentFile,
          changeType,
          diffContent: diffContent.trim()
        });
      }
    }

    return entries;
  }

  /**
   * Analyze changed files to extract functions and classes
   */
  private async analyzeChangedFiles(diffEntries: DiffEntry[]): Promise<ChangedFile[]> {
    const changedFiles: ChangedFile[] = [];

    for (const entry of diffEntries) {
      if (entry.changeType === 'deleted') {
        changedFiles.push({
          path: entry.path,
          changeType: entry.changeType,
          diffContent: entry.diffContent,
          extractedFunctions: [],
          extractedClasses: []
        });
        continue;
      }

      // Only analyze TypeScript/JavaScript files
      if (!this.isAnalyzableFile(entry.path)) {
        changedFiles.push({
          path: entry.path,
          changeType: entry.changeType,
          diffContent: entry.diffContent,
          extractedFunctions: [],
          extractedClasses: []
        });
        continue;
      }

      try {
        const fileContent = await this.getFileContent(entry.path);
        const extractedFunctions = this.extractFunctions(fileContent);
        const extractedClasses = this.extractClasses(fileContent);

        changedFiles.push({
          path: entry.path,
          changeType: entry.changeType,
          diffContent: entry.diffContent,
          extractedFunctions,
          extractedClasses
        });
      } catch (error) {
        // If file can't be read, still include it with empty extractions
        changedFiles.push({
          path: entry.path,
          changeType: entry.changeType,
          diffContent: entry.diffContent,
          extractedFunctions: [],
          extractedClasses: []
        });
      }
    }

    return changedFiles;
  }

  /**
   * Extract function definitions from TypeScript/JavaScript code using regex
   */
  private extractFunctions(code: string): FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];
    
    // Regex patterns for different function types
    const patterns = [
      // function declarations: function name() {}
      /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
      // arrow functions: const name = () => {}
      /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      // method definitions: methodName() {}
      /(\w+)\s*\([^)]*\)\s*\{/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        const name = match[1];
        const params = match[2] || '';
        const isExported = match[0].includes('export');
        
        // Skip if already found (avoid duplicates)
        if (functions.some(f => f.name === name)) continue;
        
        functions.push({
          name,
          parameters: this.parseParameters(params),
          returnType: 'any',
          isExported,
          documentation: this.extractDocumentationForFunction(code, name)
        });
      }
    }

    return functions;
  }

  /**
   * Extract class definitions from TypeScript/JavaScript code using regex
   */
  private extractClasses(code: string): ClassDefinition[] {
    const classes: ClassDefinition[] = [];
    const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{([^}]*)\}/g;
    
    let match;
    while ((match = classRegex.exec(code)) !== null) {
      const className = match[1];
      const classBody = match[2];
      const isExported = match[0].includes('export');
      
      // Extract methods from class body
      const methods = this.extractMethodsFromClassBody(classBody);
      
      classes.push({
        name: className,
        methods,
        properties: [], // Property extraction would be more complex
        isExported,
        documentation: this.extractDocumentationForClass(code, className)
      });
    }

    return classes;
  }

  /**
   * Extract methods from class body
   */
  private extractMethodsFromClassBody(classBody: string): FunctionDefinition[] {
    const methods: FunctionDefinition[] = [];
    const methodRegex = /(\w+)\s*\(([^)]*)\)\s*\{/g;
    
    let match;
    while ((match = methodRegex.exec(classBody)) !== null) {
      const methodName = match[1];
      const params = match[2];
      
      // Skip constructor
      if (methodName === 'constructor') continue;
      
      methods.push({
        name: methodName,
        parameters: this.parseParameters(params),
        returnType: 'any',
        isExported: false, // Methods are part of classes
        documentation: undefined
      });
    }

    return methods;
  }

  /**
   * Parse parameter string into parameter objects
   */
  private parseParameters(paramString: string): any[] {
    if (!paramString.trim()) return [];
    
    return paramString.split(',').map(param => {
      const trimmed = param.trim();
      const [name, type] = trimmed.split(':').map(s => s.trim());
      
      return {
        name: name || 'unknown',
        type: type || 'any',
        optional: name?.includes('?') || false,
        description: undefined
      };
    });
  }

  /**
   * Extract API definitions from changed files
   */
  private extractAPIs(changedFiles: ChangedFile[]): APIDefinition[] {
    const apis: APIDefinition[] = [];

    for (const file of changedFiles) {
      // Look for exported functions that might be APIs
      for (const func of file.extractedFunctions) {
        if (func.isExported) {
          apis.push({
            name: func.name,
            parameters: func.parameters,
            returnType: func.returnType,
            description: func.documentation
          });
        }
      }

      // Look for class methods that might be APIs
      for (const cls of file.extractedClasses) {
        if (cls.isExported) {
          for (const method of cls.methods) {
            apis.push({
              name: `${cls.name}.${method.name}`,
              parameters: method.parameters,
              returnType: method.returnType,
              description: method.documentation
            });
          }
        }
      }
    }

    return apis;
  }

  /**
   * Identify new features from changed files
   */
  private identifyNewFeatures(changedFiles: ChangedFile[]): FeatureDescription[] {
    const features: FeatureDescription[] = [];

    for (const file of changedFiles) {
      if (file.changeType === 'added') {
        // New files likely represent new features
        const featureName = path.basename(file.path, path.extname(file.path));
        features.push({
          name: featureName,
          description: `New ${this.getFileType(file.path)} component`,
          affectedFiles: [file.path],
          category: 'new'
        });
      } else if (file.changeType === 'modified') {
        // Look for new exported functions/classes in modified files
        const newExports = file.extractedFunctions.filter(f => f.isExported).length +
                          file.extractedClasses.filter(c => c.isExported).length;
        
        if (newExports > 0) {
          features.push({
            name: `Enhanced ${path.basename(file.path, path.extname(file.path))}`,
            description: `Enhanced functionality with ${newExports} new exports`,
            affectedFiles: [file.path],
            category: 'enhanced'
          });
        }
      }
    }

    return features;
  }

  /**
   * Identify architectural changes from changed files
   */
  private identifyArchitecturalChanges(changedFiles: ChangedFile[]): ArchitecturalChange[] {
    const changes: ArchitecturalChange[] = [];

    for (const file of changedFiles) {
      const component = this.getComponentName(file.path);
      
      if (file.changeType === 'added') {
        changes.push({
          type: 'component-added',
          component,
          description: `New component added: ${component}`,
          impact: this.assessImpact(file)
        });
      } else if (file.changeType === 'deleted') {
        changes.push({
          type: 'component-removed',
          component,
          description: `Component removed: ${component}`,
          impact: 'high'
        });
      } else if (file.changeType === 'modified') {
        // Check if this is a significant modification
        const hasSignificantChanges = file.extractedFunctions.length > 0 || 
                                     file.extractedClasses.length > 0;
        
        if (hasSignificantChanges) {
          changes.push({
            type: 'component-modified',
            component,
            description: `Component modified: ${component}`,
            impact: this.assessImpact(file)
          });
        }
      }
    }

    return changes;
  }

  /**
   * Generate documentation requirements based on analysis
   */
  private generateDocumentationRequirements(
    apis: APIDefinition[],
    features: FeatureDescription[],
    changes: ArchitecturalChange[]
  ): DocumentationRequirement[] {
    const requirements: DocumentationRequirement[] = [];

    // API documentation requirements
    if (apis.length > 0) {
      requirements.push({
        type: 'api-spec',
        targetFile: '.kiro/specs/api.md',
        content: `Updated API documentation for ${apis.length} APIs`,
        priority: 'high'
      });
    }

    // README updates for new features
    if (features.length > 0) {
      requirements.push({
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content: `Updated features section with ${features.length} changes`,
        priority: 'medium'
      });
    }

    // Development log entry
    if (apis.length > 0 || features.length > 0 || changes.length > 0) {
      requirements.push({
        type: 'dev-log',
        targetFile: '.kiro/development-log/',
        content: `Development log entry for analysis results`,
        priority: 'low'
      });
    }

    return requirements;
  }

  // Helper methods
  private isAnalyzableFile(filePath: string): boolean {
    const ext = path.extname(filePath);
    return ['.ts', '.js', '.tsx', '.jsx'].includes(ext);
  }

  private async getFileContent(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf-8');
  }

  private extractDocumentationForFunction(code: string, functionName: string): string | undefined {
    // Look for JSDoc comments before function
    const functionRegex = new RegExp(`/\\*\\*[\\s\\S]*?\\*/\\s*(?:export\\s+)?(?:async\\s+)?function\\s+${functionName}`, 'g');
    const match = functionRegex.exec(code);
    if (match) {
      const docMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);
      return docMatch ? docMatch[1].trim() : undefined;
    }
    return undefined;
  }

  private extractDocumentationForClass(code: string, className: string): string | undefined {
    // Look for JSDoc comments before class
    const classRegex = new RegExp(`/\\*\\*[\\s\\S]*?\\*/\\s*(?:export\\s+)?class\\s+${className}`, 'g');
    const match = classRegex.exec(code);
    if (match) {
      const docMatch = match[0].match(/\/\*\*([\s\S]*?)\*\//);
      return docMatch ? docMatch[1].trim() : undefined;
    }
    return undefined;
  }

  private getFileType(filePath: string): string {
    const ext = path.extname(filePath);
    switch (ext) {
      case '.ts': return 'TypeScript';
      case '.js': return 'JavaScript';
      case '.tsx': return 'React TypeScript';
      case '.jsx': return 'React JavaScript';
      default: return 'code';
    }
  }

  private getComponentName(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  private assessImpact(file: ChangedFile): 'low' | 'medium' | 'high' {
    const exportCount = file.extractedFunctions.filter(f => f.isExported).length +
                       file.extractedClasses.filter(c => c.isExported).length;
    
    if (exportCount === 0) return 'low';
    if (exportCount <= 2) return 'medium';
    return 'high';
  }

  /**
   * Extract project context from .kiro/ files
   */
  async extractKiroContext(): Promise<KiroContext> {
    const context: KiroContext = {
      specs: [],
      steeringFiles: [],
      hooks: []
    };

    try {
      // Look for .kiro directory
      const kiroPath = '.kiro';
      if (fs.existsSync(kiroPath)) {
        // Extract specs
        const specsPath = path.join(kiroPath, 'specs');
        if (fs.existsSync(specsPath)) {
          const specDirs = fs.readdirSync(specsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          
          context.specs = specDirs;
        }

        // Extract steering files
        const steeringPath = path.join(kiroPath, 'steering');
        if (fs.existsSync(steeringPath)) {
          const steeringFiles = fs.readdirSync(steeringPath)
            .filter(file => file.endsWith('.md'));
          
          context.steeringFiles = steeringFiles;
        }
      }
    } catch (error) {
      // If context extraction fails, return empty context
    }

    return context;
  }
}