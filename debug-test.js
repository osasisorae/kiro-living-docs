// Debug test to understand the issue
const { TemplateEngine } = require('./dist/templates/engine.js');
const { DocumentationGenerators } = require('./dist/templates/generators.js');

async function runTest() {
  const templateEngine = new TemplateEngine();
  const generators = new DocumentationGenerators(templateEngine);

  // Test all template names from the test
  const templateNames = ['missing-api-doc', 'missing-setup', 'missing-architecture', 'custom-template'];
  
  for (const templateName of templateNames) {
    console.log(`\n=== Testing template: ${templateName} ===`);
    
    const template = templateEngine.getTemplate(templateName);
    console.log('Template exists:', !!template);
    
    if (template) {
      console.log('Template type:', template.type);
      console.log('Template name:', template.name);
    }
  }
  
  // Also check built-in templates
  console.log('\n=== Built-in templates ===');
  const builtInNames = ['api-doc', 'setup-instructions', 'architecture-notes'];
  for (const templateName of builtInNames) {
    const template = templateEngine.getTemplate(templateName);
    console.log(`${templateName}: ${!!template}`);
  }
}

runTest();