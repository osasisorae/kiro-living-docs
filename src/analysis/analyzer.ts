/**
 * Enhanced analyzer implementation with comprehensive error handling and graceful degradation
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
import { 
  ParseError, 
  FileOperationError, 
  AnalysisError, 
  ErrorHandler 
} from '../templates/errors';

export class CodeAnalyzer {
  private errorHandler: ErrorHandler = new ErrorHandler();
  private pathResolver: (relativePath: string) => string;

  constructor(private config: AnalysisConfig, pathResolver?: (relativePath: string) => string) {
    this.pathResolver = pathResolver || ((relativePath: string) => relativePath);
  }

  async analyze(changes: string[]): Promise<ChangeAnalysis> {
    try {
      const timestamp = new Date().toISOString();
      const diffEntries = await this.parseDiffWithErrorHandling(changes);
      const changedFiles = await this.analyzeChangedFilesWithErrorHandling(diffEntries);
      const extractedAPIs = await this.extractAPIsWithErrorHandling(changedFiles);
      const newFeatures = await this.identifyNewFeaturesWithErrorHandling(changedFiles);
      const architecturalChanges = await this.identifyArchitecturalChangesWithErrorHandling(changedFiles);
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
    } catch (error) {
      // Graceful degradation - return minimal analysis if complete analysis fails
      const fallbackAnalysis = await this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), this.createFallbackAnalysis());
      return fallbackAnalysis;
    }
  }

  private createFallbackAnalysis(): ChangeAnalysis {
    return {
      timestamp: new Date().toISOString(),
      triggerType: 'manual',
      changedFiles: [],
      extractedAPIs: [],
      newFeatures: [],
      architecturalChanges: [],
      documentationRequirements: [{
        type: 'dev-log',
        targetFile: this.pathResolver('.kiro/development-log/analysis-error.md'),
        content: 'Analysis failed - manual review required',
        priority: 'high'
      }]
    };
  }

  /**
   * Parse diff output into structured entries with error handling
   */
  private async parseDiffWithErrorHandling(changes: string[]): Promise<DiffEntry[]> {
    try {
      return this.parseDiff(changes);
    } catch (error) {
      const parseError = new ParseError(
        'Failed to parse diff output',
        undefined,
        error instanceof Error ? error : undefined
      );
      
      // Try to recover with simplified parsing
      const recovered = await this.errorHandler.handleError(parseError, []);
      return recovered;
    }
  }

  /**
   * Parse diff output into structured entries
   */
  private parseDiff(changes: string[]): DiffEntry[] {
    const entries: DiffEntry[] = [];
    
    for (const change of changes) {
      try {
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
      } catch (error) {
        // Skip malformed diff entries but continue processing others
        console.warn(`Failed to parse diff entry: ${error}`);
        continue;
      }
    }

    return entries;
  }

  /**
   * Analyze changed files to extract functions and classes with error handling
   */
  private async analyzeChangedFilesWithErrorHandling(diffEntries: DiffEntry[]): Promise<ChangedFile[]> {
    try {
      return await this.analyzeChangedFiles(diffEntries);
    } catch (error) {
      const analysisError = new AnalysisError(
        'Failed to analyze changed files',
        'ast',
        error instanceof Error ? error : undefined
      );
      
      // Return minimal file information without detailed analysis
      const fallbackFiles = diffEntries.map(entry => ({
        path: entry.path,
        changeType: entry.changeType,
        diffContent: entry.diffContent,
        extractedFunctions: [],
        extractedClasses: []
      }));
      
      return await this.errorHandler.handleError(analysisError, fallbackFiles);
    }
  }

  /**
   * Analyze changed files to extract functions and classes
   */
  private async analyzeChangedFiles(diffEntries: DiffEntry[]): Promise<ChangedFile[]> {
    const changedFiles: ChangedFile[] = [];

    for (const entry of diffEntries) {
      try {
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

        const fileContent = await this.getFileContentWithErrorHandling(entry.path);
        const extractedFunctions = await this.extractFunctionsWithErrorHandling(fileContent, entry.path);
        const extractedClasses = await this.extractClassesWithErrorHandling(fileContent, entry.path);

        changedFiles.push({
          path: entry.path,
          changeType: entry.changeType,
          diffContent: entry.diffContent,
          extractedFunctions,
          extractedClasses
        });
      } catch (error) {
        // If individual file analysis fails, include it with empty extractions
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
   * Extract function definitions from TypeScript/JavaScript code using regex with error handling
   */
  private async extractFunctionsWithErrorHandling(code: string, filePath: string): Promise<FunctionDefinition[]> {
    try {
      return this.extractFunctions(code);
    } catch (error) {
      const parseError = new ParseError(
        'Failed to extract functions',
        filePath,
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(parseError, []);
    }
  }

  /**
   * Extract class definitions from TypeScript/JavaScript code using regex with error handling
   */
  private async extractClassesWithErrorHandling(code: string, filePath: string): Promise<ClassDefinition[]> {
    try {
      return this.extractClasses(code);
    } catch (error) {
      const parseError = new ParseError(
        'Failed to extract classes',
        filePath,
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(parseError, []);
    }
  }

  /**
   * Get file content with error handling
   */
  private async getFileContentWithErrorHandling(filePath: string): Promise<string> {
    try {
      return await this.getFileContent(filePath);
    } catch (error) {
      const fileError = new FileOperationError(
        'Failed to read file',
        'read',
        filePath,
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(fileError, '');
    }
  }

  /**
   * Extract APIs with error handling
   */
  private async extractAPIsWithErrorHandling(changedFiles: ChangedFile[]): Promise<APIDefinition[]> {
    try {
      return this.extractAPIs(changedFiles);
    } catch (error) {
      const analysisError = new AnalysisError(
        'Failed to extract APIs',
        'classification',
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(analysisError, []);
    }
  }

  /**
   * Identify new features with error handling
   */
  private async identifyNewFeaturesWithErrorHandling(changedFiles: ChangedFile[]): Promise<FeatureDescription[]> {
    try {
      return this.identifyNewFeatures(changedFiles);
    } catch (error) {
      const analysisError = new AnalysisError(
        'Failed to identify new features',
        'classification',
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(analysisError, []);
    }
  }

  /**
   * Identify architectural changes with error handling
   */
  private async identifyArchitecturalChangesWithErrorHandling(changedFiles: ChangedFile[]): Promise<ArchitecturalChange[]> {
    try {
      return this.identifyArchitecturalChanges(changedFiles);
    } catch (error) {
      const analysisError = new AnalysisError(
        'Failed to identify architectural changes',
        'classification',
        error instanceof Error ? error : undefined
      );
      
      return await this.errorHandler.handleError(analysisError, []);
    }
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
          // Generate meaningful description if documentation is missing
          let description = func.documentation;
          if (!description || description.trim().length === 0) {
            const paramTypes = func.parameters.map(p => p.type).join(', ');
            description = `Function that takes (${paramTypes}) and returns ${func.returnType}`;
          }
          
          apis.push({
            name: func.name,
            parameters: func.parameters,
            returnType: func.returnType,
            description
          });
        }
      }

      // Look for class methods that might be APIs
      for (const cls of file.extractedClasses) {
        if (cls.isExported) {
          for (const method of cls.methods) {
            // Generate meaningful description if documentation is missing
            let description = method.documentation;
            if (!description || description.trim().length === 0) {
              const paramTypes = method.parameters.map(p => p.type).join(', ');
              description = `${cls.name} method that takes (${paramTypes}) and returns ${method.returnType}`;
            }
            
            apis.push({
              name: `${cls.name}.${method.name}`,
              parameters: method.parameters,
              returnType: method.returnType,
              description
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
        const fileType = this.getFileType(file.path);
        
        // Generate meaningful description based on file content
        let description = `New ${fileType} component`;
        
        if (file.extractedFunctions.length > 0 || file.extractedClasses.length > 0) {
          const functions = file.extractedFunctions.filter(f => f.isExported);
          const classes = file.extractedClasses.filter(c => c.isExported);
          
          if (classes.length > 0) {
            description = `New ${classes[0].name} class with ${classes[0].methods.length} methods`;
          } else if (functions.length > 0) {
            const mainFunction = functions[0];
            description = `New ${mainFunction.name} function (${mainFunction.parameters.map(p => p.type).join(', ')}) → ${mainFunction.returnType}`;
          }
        }
        
        features.push({
          name: featureName,
          description,
          affectedFiles: [file.path],
          category: 'new'
        });
      } else if (file.changeType === 'modified') {
        // Look for new exported functions/classes in modified files
        const newExportedFunctions = file.extractedFunctions.filter(f => f.isExported);
        const newExportedClasses = file.extractedClasses.filter(c => c.isExported);
        
        // Only create feature entries for meaningful changes
        if (newExportedFunctions.length > 0 || newExportedClasses.length > 0) {
          const fileName = path.basename(file.path, path.extname(file.path));
          let description = '';
          
          if (newExportedClasses.length > 0) {
            const mainClass = newExportedClasses[0];
            description = `Updated ${mainClass.name} class with ${mainClass.methods.length} methods`;
          } else if (newExportedFunctions.length > 0) {
            const mainFunction = newExportedFunctions[0];
            description = `Added ${mainFunction.name} function (${mainFunction.parameters.map(p => p.type).join(', ')}) → ${mainFunction.returnType}`;
          }
          
          // Only add if we have a meaningful description
          if (description && !description.includes('Enhanced functionality')) {
            features.push({
              name: fileName,
              description,
              affectedFiles: [file.path],
              category: 'enhanced'
            });
          }
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
        targetFile: this.pathResolver('.kiro/specs/api.md'),
        content: `Updated API documentation for ${apis.length} APIs`,
        priority: 'high'
      });
    }

    // README updates for new features - only if we have meaningful content
    const meaningfulFeatures = features.filter(f => 
      f.name && f.description && 
      !f.description.toLowerCase().includes('enhanced functionality') &&
      !f.description.toLowerCase().includes('updated') &&
      !f.description.toLowerCase().includes('with 0 methods') &&
      f.description.length > 20
    );
    
    const meaningfulAPIs = apis.filter(api => 
      api.name && api.description && 
      !api.description.toLowerCase().includes('api endpoint') &&
      !api.description.toLowerCase().includes('updated') &&
      !api.description.toLowerCase().includes('with 0 methods') &&
      api.description.length > 10
    );
    
    if (meaningfulFeatures.length > 0 || meaningfulAPIs.length > 0) {
      requirements.push({
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content: `Updated features section with ${meaningfulFeatures.length} features and ${meaningfulAPIs.length} APIs`,
        priority: 'medium'
      });
    }

    // Development log entry - always create one when analysis runs
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `analysis-${timestamp}.md`;
    
    requirements.push({
      type: 'dev-log',
      targetFile: this.pathResolver(`.kiro/development-log/${filename}`),
      content: `Development log entry for analysis results`,
      priority: 'low'
    });

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