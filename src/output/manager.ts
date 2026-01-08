/**
 * Output manager implementation with formatting preservation
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentationRequirement } from '../types';
import { OutputConfig, WriteResult, ValidationResult, MarkdownSection, FormattingPreservation } from './types';

export class OutputManager {
  constructor(private config: OutputConfig) {}

  async writeDocumentation(requirements: DocumentationRequirement[]): Promise<WriteResult[]> {
    const results: WriteResult[] = [];
    
    for (const requirement of requirements) {
      try {
        const result = await this.writeDocumentationFile(requirement);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filePath: requirement.targetFile,
          bytesWritten: 0,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }
    
    return results;
  }

  private async writeDocumentationFile(requirement: DocumentationRequirement): Promise<WriteResult> {
    const filePath = requirement.targetFile;
    
    // Create backup if configured
    if (this.config.backupFiles && await this.fileExists(filePath)) {
      await this.createBackup(filePath);
    }

    let content: string;
    let bytesWritten: number;

    if (requirement.section && await this.fileExists(filePath)) {
      // Update specific section while preserving formatting
      content = await this.updateSection(filePath, requirement.section, requirement.content);
    } else {
      // Write entire file
      content = requirement.content;
    }

    // Validate content if configured
    if (this.config.validateOutput) {
      const validation = await this.validateContent(content, filePath);
      if (!validation.isValid) {
        return {
          success: false,
          filePath,
          bytesWritten: 0,
          errors: validation.errors
        };
      }
    }

    // Atomic write operation
    await this.atomicWrite(filePath, content);
    bytesWritten = Buffer.byteLength(content, 'utf8');

    return {
      success: true,
      filePath,
      bytesWritten,
      errors: []
    };
  }

  private async updateSection(filePath: string, sectionName: string, newContent: string): Promise<string> {
    const originalContent = await fs.readFile(filePath, 'utf8');
    const formatting = this.analyzeFormatting(originalContent);
    
    // Skip update if there's no meaningful content to add
    if (!newContent.trim()) {
      return originalContent;
    }
    
    const sections = this.parseMarkdownSections(originalContent);
    
    // Handle special case for "Features & API" section with deduplication
    if (sectionName.toLowerCase().includes('features') && sectionName.toLowerCase().includes('api')) {
      return this.updateFeaturesAPISection(originalContent, newContent, formatting);
    }
    
    const sectionIndex = sections.findIndex(s => 
      s.title.toLowerCase().includes(sectionName.toLowerCase())
    );

    if (sectionIndex === -1) {
      // Section doesn't exist, append it
      return this.appendSection(originalContent, sectionName, newContent, formatting);
    } else {
      // Replace existing section while preserving formatting
      return this.replaceSection(originalContent, sections[sectionIndex], newContent, formatting);
    }
  }

  private updateFeaturesAPISection(originalContent: string, newContent: string, formatting: FormattingPreservation): string {
    const allSections = this.findHierarchicalSectionsByTitle(originalContent, (title) => {
      const normalized = title.toLowerCase();
      return normalized.includes('features') && normalized.includes('api');
    });

    if (allSections.length === 0) {
      return this.appendSection(originalContent, 'Features & API', newContent, formatting);
    }

    const primarySection = allSections[0];
    const duplicateSections = allSections.slice(1);

    const existingCombinedContent = allSections
      .map((section) => this.extractSectionContent(originalContent, section))
      .join('\n');

    const mergedContent = this.mergeFeatureAPIContent(existingCombinedContent, newContent);

    if (duplicateSections.length === 0) {
      return this.replaceSection(originalContent, primarySection, mergedContent, formatting);
    }

    return this.replaceAndRemoveSections(originalContent, primarySection, duplicateSections, mergedContent, formatting);
  }

  private findHierarchicalSectionsByTitle(
    content: string,
    titleMatches: (title: string) => boolean
  ): MarkdownSection[] {
    const lines = content.split(/\r?\n/);
    const headers: Array<{ lineIndex: number; level: number; title: string }> = [];

    for (let index = 0; index < lines.length; index++) {
      const match = lines[index].match(/^(#{1,6})\s+(.+)$/);
      if (!match) {
        continue;
      }
      headers.push({ lineIndex: index, level: match[1].length, title: match[2] });
    }

    const sections: MarkdownSection[] = [];

    for (let index = 0; index < headers.length; index++) {
      const header = headers[index];
      if (!titleMatches(header.title)) {
        continue;
      }

      let endLine = lines.length - 1;
      for (let nextIndex = index + 1; nextIndex < headers.length; nextIndex++) {
        const nextHeader = headers[nextIndex];
        if (nextHeader.level <= header.level) {
          endLine = nextHeader.lineIndex - 1;
          break;
        }
      }

      sections.push({
        title: header.title,
        content: '',
        level: header.level,
        startLine: header.lineIndex,
        endLine,
      });
    }

    return sections.sort((a, b) => a.startLine - b.startLine);
  }

  private replaceAndRemoveSections(
    originalContent: string,
    primarySection: MarkdownSection,
    sectionsToRemove: MarkdownSection[],
    newContent: string,
    formatting: FormattingPreservation
  ): string {
    const lines = originalContent.split(/\r?\n/);
    const rangesToRemove = sectionsToRemove
      .map((s) => ({ start: s.startLine, end: s.endLine }))
      .sort((a, b) => a.start - b.start);

    const newLines: string[] = [];
    let removeIndex = 0;
    let currentRemove = rangesToRemove[removeIndex];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      if (lineIndex === primarySection.startLine) {
        const sectionHeader = `${'#'.repeat(primarySection.level)} ${primarySection.title}`;
        newLines.push(sectionHeader, '', ...newContent.split(/\r?\n/));
        lineIndex = primarySection.endLine;
        continue;
      }

      if (currentRemove && lineIndex === currentRemove.start) {
        lineIndex = currentRemove.end;
        removeIndex++;
        currentRemove = rangesToRemove[removeIndex];
        continue;
      }

      newLines.push(lines[lineIndex]);
    }

    return newLines.join(formatting.lineEndings);
  }

  private mergeFeatureAPIContent(existingContent: string, newContent: string): string {
    // Parse existing features and APIs
    const existingFeatures = this.parseFeatureEntries(existingContent);
    const existingAPIs = this.parseAPIEntries(existingContent);
    
    // Parse new features and APIs
    const newFeatures = this.parseFeatureEntries(newContent);
    const newAPIs = this.parseAPIEntries(newContent);
    
    // Merge and deduplicate
    const allFeatures = this.deduplicateFeatures([...existingFeatures, ...newFeatures]);
    const allAPIs = this.deduplicateAPIs([...existingAPIs, ...newAPIs]);
    
    // Generate merged content
    let mergedContent = '';
    
    if (allFeatures.length > 0) {
      mergedContent += '**Features:**\n\n';
      for (const feature of allFeatures) {
        mergedContent += `- **${feature.name}**: ${feature.description}\n`;
      }
      mergedContent += '\n';
    }
    
    if (allAPIs.length > 0) {
      mergedContent += '**API:**\n\n';
      for (const api of allAPIs) {
        mergedContent += `- **${api.signature}**: ${api.description}\n`;
      }
      mergedContent += '\n';
    }
    
    return mergedContent.trim();
  }

  private parseFeatureEntries(content: string): Array<{name: string, description: string}> {
    const features: Array<{name: string, description: string}> = [];
    const lines = content.split(/\r?\n/);
    let inFeaturesSection = false;
    
    for (const line of lines) {
      if (line.includes('**Features:**') || line.includes('### Features')) {
        inFeaturesSection = true;
        continue;
      }
      
      if (line.includes('**API:**') || line.includes('### API')) {
        inFeaturesSection = false;
        continue;
      }
      
      if (inFeaturesSection && line.trim().startsWith('- **')) {
        const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
        if (match) {
          features.push({
            name: match[1].trim(),
            description: match[2].trim()
          });
        }
      }
    }
    
    return features;
  }

  private parseAPIEntries(content: string): Array<{signature: string, description: string}> {
    const apis: Array<{signature: string, description: string}> = [];
    const lines = content.split(/\r?\n/);
    let inAPISection = false;
    
    for (const line of lines) {
      if (line.includes('**API:**') || line.includes('### API')) {
        inAPISection = true;
        continue;
      }
      
      if (line.includes('**Features:**') || line.includes('### Features')) {
        inAPISection = false;
        continue;
      }
      
      if (inAPISection && line.trim().startsWith('- **')) {
        const match = line.match(/- \*\*([^*]+)\*\*:\s*(.+)/);
        if (match) {
          apis.push({
            signature: match[1].trim(),
            description: match[2].trim()
          });
        }
      }
    }
    
    return apis;
  }

  private deduplicateFeatures(features: Array<{name: string, description: string}>): Array<{name: string, description: string}> {
    const seen = new Set<string>();
    return features.filter(feature => {
      const key = feature.name.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private deduplicateAPIs(apis: Array<{signature: string, description: string}>): Array<{signature: string, description: string}> {
    const seen = new Set<string>();
    return apis.filter(api => {
      const key = api.signature.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private extractSectionContent(content: string, section: MarkdownSection): string {
    const lines = content.split(/\r?\n/);
    return lines.slice(section.startLine + 1, section.endLine + 1).join('\n');
  }

  private removeSection(originalContent: string, section: MarkdownSection, formatting: FormattingPreservation): string {
    const lines = originalContent.split(/\r?\n/);
    const beforeSection = lines.slice(0, section.startLine);
    const afterSection = lines.slice(section.endLine + 1);
    
    return [...beforeSection, ...afterSection].join(formatting.lineEndings);
  }

  private analyzeFormatting(content: string): FormattingPreservation {
    const lines = content.split(/\r?\n/);
    const lineEndings = content.includes('\r\n') ? '\r\n' : '\n';
    
    // Analyze indentation from first non-empty line
    let originalIndentation = '';
    for (const line of lines) {
      if (line.trim()) {
        const match = line.match(/^(\s*)/);
        if (match) {
          originalIndentation = match[1];
          break;
        }
      }
    }

    // Find empty lines
    const emptyLines: number[] = [];
    lines.forEach((line, index) => {
      if (line.trim() === '') {
        emptyLines.push(index);
      }
    });

    return {
      originalIndentation,
      lineEndings,
      trailingWhitespace: lines.some(line => line !== line.trimEnd()),
      emptyLines
    };
  }

  private parseMarkdownSections(content: string): MarkdownSection[] {
    const lines = content.split(/\r?\n/);
    const sections: MarkdownSection[] = [];
    let currentSection: MarkdownSection | null = null;

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headerMatch) {
        // Close previous section
        if (currentSection) {
          currentSection.endLine = index - 1;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          title: headerMatch[2],
          content: '',
          level: headerMatch[1].length,
          startLine: index,
          endLine: index,
        };
      } else if (currentSection) {
        currentSection.content += line + '\n';
      }
    }

    // Close last section
    if (currentSection) {
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection);
    }

    return sections;
  }

  private appendSection(originalContent: string, sectionName: string, newContent: string, formatting: FormattingPreservation): string {
    const separator = formatting.lineEndings;
    return originalContent + separator + separator + `## ${sectionName}` + separator + separator + newContent;
  }

  private replaceSection(originalContent: string, section: MarkdownSection, newContent: string, formatting: FormattingPreservation): string {
    const lines = originalContent.split(/\r?\n/);
    const beforeSection = lines.slice(0, section.startLine);
    const afterSection = lines.slice(section.endLine + 1);
    
    const sectionHeader = `${'#'.repeat(section.level)} ${section.title}`;
    const updatedSection = [sectionHeader, '', newContent];
    
    return [...beforeSection, ...updatedSection, ...afterSection].join(formatting.lineEndings);
  }

  private async validateContent(content: string, filePath: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic markdown validation
    if (filePath.endsWith('.md')) {
      // Check for broken links
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2];
        if (linkUrl.startsWith('./') || linkUrl.startsWith('../')) {
          // Relative link - check if file exists
          const linkPath = path.resolve(path.dirname(filePath), linkUrl);
          if (!await this.fileExists(linkPath)) {
            warnings.push(`Potentially broken relative link: ${linkUrl}`);
          }
        }
      }

      // Check for proper heading hierarchy
      const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
      let previousLevel = 0;
      for (const heading of headings) {
        const level = heading.match(/^(#{1,6})/)?.[1].length || 0;
        if (level > previousLevel + 1) {
          warnings.push(`Heading level jump detected: ${heading.trim()}`);
        }
        previousLevel = level;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write to temporary file
      await fs.writeFile(tempPath, content, 'utf8');
      
      // Atomic rename
      await fs.rename(tempPath, filePath);
    } catch (error) {
      // Clean up temp file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  private async createBackup(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
