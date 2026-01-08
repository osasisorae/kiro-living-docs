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