/**
 * Analysis-specific types
 */

export interface AnalysisConfig {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  analysisDepth: 'shallow' | 'deep';
}

export interface AnalysisResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  analysisTime: number;
}

export interface DiffEntry {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  diffContent: string;
}

export interface KiroContext {
  specs: string[];
  steeringFiles: string[];
  hooks: string[];
}