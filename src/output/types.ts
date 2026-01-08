/**
 * Output-specific types
 */

export interface OutputConfig {
  preserveFormatting: boolean;
  backupFiles: boolean;
  validateOutput: boolean;
}

export interface WriteResult {
  success: boolean;
  filePath: string;
  bytesWritten: number;
  errors: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarkdownSection {
  title: string;
  content: string;
  level: number;
  startLine: number;
  endLine: number;
}

export interface FormattingPreservation {
  originalIndentation: string;
  lineEndings: '\n' | '\r\n';
  trailingWhitespace: boolean;
  emptyLines: number[];
}