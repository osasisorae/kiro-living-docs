/**
 * Example usage of the Subagent integration
 */

import { SubagentIntegration } from './integration';
import { SubagentConfigManager } from './config-manager';
import { AnalysisConfig } from '../analysis/types';

async function exampleUsage() {
  try {
    console.log('🚀 Auto-Doc-Sync Subagent Integration Example\n');

    // Initialize subagent configuration if it doesn't exist
    if (!SubagentConfigManager.configExists()) {
      console.log('Initializing Subagent configuration...');
      await SubagentConfigManager.initialize();
      console.log('✅ Configuration initialized\n');
    }

    // Create analysis configuration
    const analysisConfig: AnalysisConfig = {
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['node_modules/**', '**/*.test.ts'],
      maxFileSize: 1024 * 1024, // 1MB
      analysisDepth: 'deep'
    };

    // Initialize subagent integration
    console.log('Initializing Subagent integration...');
    const integration = new SubagentIntegration(analysisConfig);
    console.log('✅ Integration initialized\n');

    // Perform health check
    console.log('Performing health check...');
    const isHealthy = await integration.healthCheck();
    console.log(`Health check: ${isHealthy ? '✅ Healthy' : '❌ Failed'}\n`);

    // Example code changes (simulated git diff)
    const exampleChanges = [
      `diff --git a/src/example.ts b/src/example.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/example.ts
@@ -0,0 +1,15 @@
+/**
+ * Example function for demonstration
+ */
+export function calculateSum(a: number, b: number): number {
+  return a + b;
+}
+
+/**
+ * Example class for demonstration
+ */
+export class Calculator {
+  add(x: number, y: number): number {
+    return x + y;
+  }
+}`
    ];

    // Perform enhanced analysis
    console.log('Performing enhanced analysis...');
    const analysisResults = await integration.performEnhancedAnalysis(exampleChanges);
    
    console.log('📊 Analysis Results:');
    console.log(`- Changed files: ${analysisResults.changedFiles.length}`);
    console.log(`- Extracted APIs: ${analysisResults.extractedAPIs.length}`);
    console.log(`- New features: ${analysisResults.newFeatures.length}`);
    console.log(`- Architectural changes: ${analysisResults.architecturalChanges.length}`);
    console.log(`- Documentation requirements: ${analysisResults.documentationRequirements.length}\n`);

    // Generate documentation
    if (analysisResults.documentationRequirements.length > 0) {
      console.log('Generating documentation...');
      const documentation = await integration.generateDocumentation(
        analysisResults,
        'api-doc',
        'README.md'
      );
      
      console.log('📝 Generated Documentation:');
      console.log(documentation);
      console.log();
    }

    // Process a template example
    console.log('Processing template example...');
    const templateExample = `# {title}

## Overview
{description}

## API Changes
{apiCount} APIs were modified in this update.

## Features
{featureCount} new features were added.`;

    const templateVariables = {
      title: 'Documentation Update',
      description: 'Automated documentation update based on code analysis',
      apiCount: analysisResults.extractedAPIs.length,
      featureCount: analysisResults.newFeatures.length
    };

    const processedTemplate = await integration.processTemplate(
      templateExample,
      templateVariables,
      'update-summary'
    );

    console.log('📄 Processed Template:');
    console.log(processedTemplate);
    console.log();

    // Show subagent configuration
    console.log('🔧 Subagent Configuration:');
    const config = integration.getSubagentConfig();
    console.log(`- Name: ${config.name}`);
    console.log(`- Version: ${config.version}`);
    console.log(`- Model: ${config.configuration.model}`);
    console.log(`- Capabilities: ${config.capabilities.join(', ')}`);

    console.log('\n✅ Example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}

export { exampleUsage };