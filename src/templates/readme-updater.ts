/**
 * README section updater for maintaining Features & API sections
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { DocumentationRequirement, FeatureDescription, APIDefinition } from '../types';

export class READMEUpdater {
  private readonly readmePath: string;

  constructor(projectRoot: string = process.cwd()) {
    this.readmePath = path.join(projectRoot, 'README.md');
  }

  /**
   * Update the Features & API section in README.md
   */
  async updateFeaturesAndAPI(
    features: FeatureDescription[],
    apis: APIDefinition[]
  ): Promise<DocumentationRequirement> {
    try {
      const currentContent = await this.readCurrentREADME();
      const newSection = this.generateFeaturesAndAPISection(features, apis);
      const updatedContent = this.replaceFeaturesAndAPISection(currentContent, newSection);

      return {
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content: updatedContent,
        priority: 'medium'
      };
    } catch (error) {
      // If README doesn't exist, create a basic one
      const newContent = this.createBasicREADME(features, apis);
      return {
        type: 'readme-section',
        targetFile: 'README.md',
        section: 'Features & API',
        content: newContent,
        priority: 'medium'
      };
    }
  }

  /**
   * Update specific sections in README.md while preserving structure
   */
  async updateSection(
    sectionName: string,
    newContent: string
  ): Promise<DocumentationRequirement> {
    try {
      const currentContent = await this.readCurrentREADME();
      const updatedContent = this.replaceSection(currentContent, sectionName, newContent);

      return {
        type: 'readme-section',
        targetFile: 'README.md',
        section: sectionName,
        content: updatedContent,
        priority: 'medium'
      };
    } catch (error) {
      throw new Error(`Failed to update README section "${sectionName}": ${error}`);
    }
  }

  private async readCurrentREADME(): Promise<string> {
    return await fs.readFile(this.readmePath, 'utf-8');
  }

  private generateFeaturesAndAPISection(
    features: FeatureDescription[],
    apis: APIDefinition[]
  ): string {
    let section = '## Features & API\n\n';

    // Features subsection
    if (features.length > 0) {
      section += '### Features\n\n';
      
      const categorized = {
        new: features.filter(f => f.category === 'new'),
        enhanced: features.filter(f => f.category === 'enhanced'),
        deprecated: features.filter(f => f.category === 'deprecated')
      };

      if (categorized.new.length > 0) {
        section += '#### New Features\n\n';
        section += categorized.new.map(f => `- **${f.name}**: ${f.description}`).join('\n');
        section += '\n\n';
      }

      if (categorized.enhanced.length > 0) {
        section += '#### Enhanced Features\n\n';
        section += categorized.enhanced.map(f => `- **${f.name}**: ${f.description}`).join('\n');
        section += '\n\n';
      }

      if (categorized.deprecated.length > 0) {
        section += '#### Deprecated Features\n\n';
        section += categorized.deprecated.map(f => `- **${f.name}**: ${f.description}`).join('\n');
        section += '\n\n';
      }
    } else {
      section += '### Features\n\nNo features documented yet.\n\n';
    }

    // API subsection
    if (apis.length > 0) {
      section += '### API\n\n';
      section += apis.map(api => {
        let apiDoc = `#### ${api.name}\n\n`;
        
        if (api.method && api.path) {
          apiDoc += `\`${api.method} ${api.path}\`\n\n`;
        }
        
        if (api.description) {
          apiDoc += `${api.description}\n\n`;
        }

        if (api.parameters.length > 0) {
          apiDoc += '**Parameters:**\n';
          apiDoc += api.parameters.map(p => 
            `- \`${p.name}\` (${p.type})${p.optional ? ' - Optional' : ''}${p.description ? ` - ${p.description}` : ''}`
          ).join('\n');
          apiDoc += '\n\n';
        }

        apiDoc += `**Returns:** ${api.returnType}\n\n`;
        
        return apiDoc;
      }).join('');
    } else {
      section += '### API\n\nNo API endpoints documented yet.\n\n';
    }

    section += `---\n*Last updated: ${new Date().toISOString()}*\n`;

    return section;
  }

  private replaceFeaturesAndAPISection(content: string, newSection: string): string {
    // Look for existing Features & API section
    const sectionRegex = /^## Features & API[\s\S]*?(?=^## |\n*$)/m;
    
    if (sectionRegex.test(content)) {
      return content.replace(sectionRegex, newSection);
    } else {
      // If section doesn't exist, append it before any existing sections or at the end
      const firstSectionMatch = content.match(/^## /m);
      if (firstSectionMatch) {
        const insertIndex = firstSectionMatch.index!;
        return content.slice(0, insertIndex) + newSection + '\n\n' + content.slice(insertIndex);
      } else {
        return content + '\n\n' + newSection;
      }
    }
  }

  private replaceSection(content: string, sectionName: string, newContent: string): string {
    // Create regex to match the section
    const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`^## ${escapedSectionName}[\\s\\S]*?(?=^## |\\n*$)`, 'm');
    
    const fullSection = `## ${sectionName}\n\n${newContent}\n`;
    
    if (sectionRegex.test(content)) {
      return content.replace(sectionRegex, fullSection);
    } else {
      // If section doesn't exist, append it
      const firstSectionMatch = content.match(/^## /m);
      if (firstSectionMatch) {
        const insertIndex = firstSectionMatch.index!;
        return content.slice(0, insertIndex) + fullSection + '\n' + content.slice(insertIndex);
      } else {
        return content + '\n\n' + fullSection;
      }
    }
  }

  private createBasicREADME(features: FeatureDescription[], apis: APIDefinition[]): string {
    const projectName = path.basename(process.cwd());
    
    let content = `# ${projectName}

Project description goes here.

## Installation

\`\`\`bash
npm install
\`\`\`

`;

    content += this.generateFeaturesAndAPISection(features, apis);

    content += `
## Development

\`\`\`bash
npm run dev
\`\`\`

## Testing

\`\`\`bash
npm test
\`\`\`

## Contributing

Please read the contributing guidelines before submitting pull requests.

## License

This project is licensed under the MIT License.
`;

    return content;
  }

  /**
   * Validate that all links and references in the README are still valid
   */
  async validateLinks(content: string): Promise<string[]> {
    const errors: string[] = [];
    
    // Find all markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const [, text, url] = match;
      
      // Check if it's a relative file link
      if (!url.startsWith('http') && !url.startsWith('#')) {
        try {
          const fullPath = path.resolve(path.dirname(this.readmePath), url);
          await fs.access(fullPath);
        } catch {
          errors.push(`Broken link: [${text}](${url})`);
        }
      }
    }
    
    // Find all reference-style links [text]: url
    const refLinkRegex = /^\[([^\]]+)\]:\s*(.+)$/gm;
    while ((match = refLinkRegex.exec(content)) !== null) {
      const [, text, url] = match;
      
      if (!url.startsWith('http') && !url.startsWith('#')) {
        try {
          const fullPath = path.resolve(path.dirname(this.readmePath), url);
          await fs.access(fullPath);
        } catch {
          errors.push(`Broken reference link: [${text}]: ${url}`);
        }
      }
    }
    
    return errors;
  }
}