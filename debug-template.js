// Quick debug script to test template processing
const { TemplateEngine } = require('./dist/templates/engine.js');

const engine = new TemplateEngine();

const context = {
  variables: {
    title: 'API',
    description: 'Test API',
    apis: [
      {
        name: 'TestAPI',
        method: 'GET',
        path: '/test',
        parameters: [],
        returnType: 'string',
        description: 'A test API'
      }
    ]
  },
  metadata: {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    source: 'test'
  }
};

async function test() {
  try {
    const result = await engine.render('api-doc', context);
    console.log('Template result:');
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();