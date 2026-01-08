// Test to see if the issue is with fast-check itself
const fc = require('fast-check');

// Simple test that should always pass
const alwaysPassProperty = fc.property(
  fc.record({
    value: fc.integer()
  }),
  (testData) => {
    console.log('Test data:', testData);
    console.log('Returning true');
    return true;
  }
);

console.log('Testing simple property that always returns true...');

try {
  fc.assert(alwaysPassProperty, { numRuns: 5 });
  console.log('Simple property test PASSED');
} catch (error) {
  console.error('Simple property test FAILED:', error.message);
}

// Test with async property
const asyncProperty = fc.property(
  fc.record({
    value: fc.integer()
  }),
  async (testData) => {
    console.log('Async test data:', testData);
    console.log('Returning true from async');
    return true;
  }
);

console.log('\nTesting async property that always returns true...');

async function testAsync() {
  try {
    await fc.assert(asyncProperty, { numRuns: 5 });
    console.log('Async property test PASSED');
  } catch (error) {
    console.error('Async property test FAILED:', error.message);
  }
}

testAsync();