/**
 * InitCommand - Initialize auto-doc in a repository
 * Implements Requirement 1: Initialize Auto-Doc in Any Repository
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Command, CommandResult, ParsedArgs, ExitCodes } from './types';
import { 
  TemplateType, 
  TemplateDefinition, 
  getTemplate, 
  isValidTemplateType,
  getAllTemplates 
} from '../templates';

export interface InitOptions {
  template: TemplateType;
  dryRun: boolean;
  force: boolean;
  workspace: string;
}

export interface InitResult {
  createdFiles: string[];
  createdDirectories: string[];
  skippedFiles: string[];
  configPath: string;
}

/**
 * InitCommand handles project initialization and scaffolding
 */
export class InitCommand implements Command {
  name = 'init';
  description = 'Initialize auto-doc in a repository';
  options = [
    { name: 'template', alias: 't', description: 'Template type (minimal, standard, comprehensive)', type: 'string' as const, default: 'standard' },
    { name: 'dry-run', description: 'Show what would be created without making changes', type: 'boolean' as const },
    { name: 'force', alias: 'f', description: 'Overwrite existing configuration', type: 'boolean' as const },
    { name: 'workspace', alias: 'w', description: 'Workspace root directory', type: 'string' as const },
  ];

  async execute(args: ParsedArgs): Promise<CommandResult> {
    try {
      const options = this.parseOptions(args);
      
      // Validate template type
      if (!isValidTemplateType(options.template)) {
        const validTypes = getAllTemplates().map(t => t.type).join(', ');
        return {
          success: false,
          message: `Invalid template type: ${options.template}. Valid types: ${validTypes}`,
          exitCode: ExitCodes.VALIDATION_ERROR,
        };
      }

      const template = getTemplate(options.template);
      
      // Check if .kiro directory already exists
      const kiroDir = path.join(options.workspace, '.kiro');
      const exists = fs.existsSync(kiroDir);
      
      if (exists && !options.force && !options.dryRun) {
        const shouldOverwrite = await this.promptForOverwrite();
        if (!shouldOverwrite) {
          console.log('❌ Initialization cancelled.');
          return { success: false, exitCode: ExitCodes.GENERAL_ERROR };
        }
      }

      // Perform initialization
      const result = await this.scaffold(template, options);
      
      // Display summary
      this.displaySummary(result, options);
      
      return {
        success: true,
        data: result,
        exitCode: ExitCodes.SUCCESS,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      // Check for permission errors
      if (message.includes('EACCES') || message.includes('permission')) {
        console.error('❌ Permission denied. Try running with elevated privileges or check directory permissions.');
        console.error('   Remediation: Ensure you have write access to the current directory.');
        return { success: false, exitCode: ExitCodes.FILE_SYSTEM_ERROR };
      }
      
      return {
        success: false,
        message: `Initialization failed: ${message}`,
        exitCode: ExitCodes.GENERAL_ERROR,
      };
    }
  }

  /**
   * Parse command options from arguments
   */
  private parseOptions(args: ParsedArgs): InitOptions {
    return {
      template: (args.options.template || args.options.t || 'standard') as TemplateType,
      dryRun: Boolean(args.options['dry-run']),
      force: Boolean(args.options.force || args.options.f),
      workspace: args.options.workspace || args.options.w || process.cwd(),
    };
  }

  /**
   * Prompt user for confirmation before overwriting
   */
  private async promptForOverwrite(): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question('⚠️  .kiro directory already exists. Overwrite? (y/N) ', (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Scaffold the directory structure and files
   */
  private async scaffold(template: TemplateDefinition, options: InitOptions): Promise<InitResult> {
    const result: InitResult = {
      createdFiles: [],
      createdDirectories: [],
      skippedFiles: [],
      configPath: path.join(options.workspace, '.kiro', 'auto-doc-sync.json'),
    };

    if (options.dryRun) {
      console.log('\n📋 Dry run - showing what would be created:\n');
    }

    // Create directories
    for (const dir of template.directories) {
      const fullPath = path.join(options.workspace, dir);
      
      if (options.dryRun) {
        console.log(`  📁 Would create directory: ${dir}`);
        result.createdDirectories.push(dir);
      } else {
        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath, { recursive: true });
          result.createdDirectories.push(dir);
        }
      }
    }

    // Create files
    for (const file of template.files) {
      const fullPath = path.join(options.workspace, file.path);
      const exists = fs.existsSync(fullPath);
      
      if (options.dryRun) {
        if (exists && !file.overwritable && !options.force) {
          console.log(`  ⏭️  Would skip (exists): ${file.path}`);
          result.skippedFiles.push(file.path);
        } else {
          console.log(`  📄 Would create file: ${file.path}`);
          result.createdFiles.push(file.path);
        }
      } else {
        if (exists && !file.overwritable && !options.force) {
          result.skippedFiles.push(file.path);
        } else {
          // Ensure parent directory exists
          const parentDir = path.dirname(fullPath);
          if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
          }
          
          fs.writeFileSync(fullPath, file.content, 'utf-8');
          result.createdFiles.push(file.path);
        }
      }
    }

    return result;
  }

  /**
   * Display initialization summary
   */
  private displaySummary(result: InitResult, options: InitOptions): void {
    console.log('');
    
    if (options.dryRun) {
      console.log('📋 Dry run complete. No changes were made.\n');
      return;
    }

    console.log('✅ Auto-doc initialized successfully!\n');
    
    if (result.createdDirectories.length > 0) {
      console.log('📁 Created directories:');
      for (const dir of result.createdDirectories) {
        console.log(`   ${dir}`);
      }
      console.log('');
    }

    if (result.createdFiles.length > 0) {
      console.log('📄 Created files:');
      for (const file of result.createdFiles) {
        console.log(`   ${file}`);
      }
      console.log('');
    }

    if (result.skippedFiles.length > 0) {
      console.log('⏭️  Skipped files (already exist):');
      for (const file of result.skippedFiles) {
        console.log(`   ${file}`);
      }
      console.log('');
    }

    console.log('📝 Next steps:');
    console.log('   1. Review the configuration in .kiro/auto-doc-sync.json');
    console.log('   2. Customize steering files in .kiro/steering/');
    console.log('   3. Run `kiro-docs generate` to generate documentation');
    console.log('   4. Run `kiro-docs watch` to enable automatic updates');
    console.log('');
  }
}
