// Minimal reproduction of the failing test
const { TemplateEngine } = require('./dist/templates/engine.js');

async function testProperty(testData) {
  const templateEngine = new TemplateEngine();
  const { templateName, apis, customContent, fallbackData } = testData;

  console.log('=== Test Input ===');
  console.log('templateName:', templateName);
  console.log('apis:', apis);
  console.log('customContent:', customContent);
  console.log('fallbackData:', fallbackData);

  try {
    // PROPERTY: System should handle missing templates gracefully, even with empty data
    const missingTemplate = templateEngine.getTemplate(templateName);
    console.log('Missing template:', !!missingTemplate);
    
    if (!missingTemplate) {
      const context = {
        variables: { apis, ...fallbackData },
        metadata: {
          generatedAt: new Date().toISOString(),
          version: '1.0.0',
          source: 'test'
        }
      };

      const result = await templateEngine.renderWithFallback(templateName, context, fallbackData);
      
      // PROPERTY: System should always produce valid string output
      console.log('typeof result === "string":', typeof result === 'string');
      console.log('result.length > 0:', result.length > 0);
      
      // PROPERTY: Default templates should contain basic structure even with empty arrays
      console.log('result.includes("#"):', result.includes('#'));
      
      const timestampRegex = /Generated on \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/;
      console.log('timestamp regex test:', timestampRegex.test(result));
      
      // PROPERTY: System should handle empty arrays gracefully
      if (apis.length === 0) {
        console.log('APIs array is empty, checking graceful handling...');
        console.log('!result.includes("undefined"):', !result.includes('undefined'));
        console.log('!result.includes("null"):', !result.includes('null'));
        console.log('result.trim() !== "":', result.trim() !== '');
      }
    }

    // PROPERTY: System should allow template customization with any valid content
    const normalizedCustomContent = customContent.trim();
    console.log('normalizedCustomContent:', normalizedCustomContent);
    
    if (normalizedCustomContent.length === 0) {
      console.log('ERROR: Custom content is empty after trim!');
      return false;
    }
    
    const customization = {
      name: templateName,
      content: normalizedCustomContent,
      variables: { title: fallbackData.title },
      metadata: { customized: true }
    };

    console.log('About to customize template...');
    templateEngine.customizeTemplate(customization);
    console.log('Customization successful');
    
    const retrievedCustom = templateEngine.getCustomTemplate(templateName);
    console.log('retrievedCustom defined:', !!retrievedCustom);
    console.log('name matches:', retrievedCustom?.name === templateName);
    console.log('content matches:', retrievedCustom?.content === normalizedCustomContent);

    console.log('=== Test Result: PASS ===');
    return true;
  } catch (error) {
    console.error('=== Test Result: ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Test with the failing case
const failingCase = {
  templateName: "missing-api-doc",
  apis: [],
  customContent: "!",
  fallbackData: { title: "!", description: "!" }
};

testProperty(failingCase).then(result => {
  console.log('\nFinal result:', result);
});