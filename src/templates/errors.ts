/**
 * Error types and handling for the template system
 */

export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly templateName?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TemplateError';
  }
}

export class TemplateNotFoundError extends TemplateError {
  constructor(templateName: string) {
    super(`Template not found: ${templateName}`, templateName);
    this.name = 'TemplateNotFoundError';
  }
}

export class TemplateRenderError extends TemplateError {
  constructor(
    templateName: string,
    message: string,
    cause?: Error
  ) {
    super(`Failed to render template '${templateName}': ${message}`, templateName, cause);
    this.name = 'TemplateRenderError';
  }
}

export class TemplateValidationError extends TemplateError {
  constructor(
    templateName: string,
    validationErrors: string[]
  ) {
    super(
      `Template validation failed for '${templateName}': ${validationErrors.join(', ')}`,
      templateName
    );
    this.name = 'TemplateValidationError';
  }
}

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly filePath?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ParseError';
  }
}

export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'create',
    public readonly filePath?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly analysisType: 'ast' | 'diff' | 'context' | 'classification',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  canRecover(error: Error): boolean;
  recover(error: Error): Promise<any> | any;
}

export class DefaultTemplateRecovery implements ErrorRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error instanceof TemplateNotFoundError || error instanceof TemplateRenderError;
  }

  recover(error: Error): string {
    if (error instanceof TemplateNotFoundError) {
      return this.createDefaultTemplate(error.templateName || 'unknown');
    }
    if (error instanceof TemplateRenderError) {
      return this.createFallbackContent(error.templateName || 'unknown');
    }
    throw error;
  }

  private createDefaultTemplate(templateName: string): string {
    const timestamp = new Date().toISOString();
    return `# ${templateName}

This documentation was generated using a default template because the requested template was not found.

## Content

Please customize this template to match your project's needs.

---
*Generated on ${timestamp} using default template fallback*`;
  }

  private createFallbackContent(templateName: string): string {
    const timestamp = new Date().toISOString();
    return `# ${templateName}

An error occurred while rendering the template. This is fallback content.

---
*Generated on ${timestamp} using error recovery*`;
  }
}

export class ParseErrorRecovery implements ErrorRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error instanceof ParseError;
  }

  recover(error: Error): any {
    if (error instanceof ParseError) {
      // Return minimal valid structure for continued processing
      return {
        extractedFunctions: [],
        extractedClasses: [],
        extractedAPIs: [],
        newFeatures: [],
        architecturalChanges: []
      };
    }
    throw error;
  }
}

export class FileOperationRecovery implements ErrorRecoveryStrategy {
  canRecover(error: Error): boolean {
    return error instanceof FileOperationError;
  }

  async recover(error: Error): Promise<any> {
    if (error instanceof FileOperationError) {
      switch (error.operation) {
        case 'read':
          // Return empty content for read failures
          return '';
        case 'write':
          // Log the error and continue without writing
          console.warn(`Failed to write file ${error.filePath}: ${error.message}`);
          return true;
        case 'create':
          // Try to create parent directories
          if (error.filePath) {
            const path = await import('path');
            const fs = await import('fs/promises');
            try {
              await fs.mkdir(path.dirname(error.filePath), { recursive: true });
              return true;
            } catch {
              // If directory creation fails, continue without creating
              return false;
            }
          }
          return false;
        default:
          throw error;
      }
    }
    throw error;
  }
}

/**
 * Centralized error handler with recovery strategies
 */
export class ErrorHandler {
  private recoveryStrategies: ErrorRecoveryStrategy[] = [
    new DefaultTemplateRecovery(),
    new ParseErrorRecovery(),
    new FileOperationRecovery()
  ];

  async handleError<T>(error: Error, defaultValue?: T): Promise<T> {
    // Try recovery strategies
    for (const strategy of this.recoveryStrategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          return recovered as T;
        } catch (recoveryError) {
          // If recovery fails, continue to next strategy
          continue;
        }
      }
    }

    // If no recovery strategy worked, return default value or rethrow
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw error;
  }

  addRecoveryStrategy(strategy: ErrorRecoveryStrategy): void {
    this.recoveryStrategies.push(strategy);
  }
}