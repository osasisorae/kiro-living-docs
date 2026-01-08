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