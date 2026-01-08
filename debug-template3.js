// Test different ways of handling async properties
const fc = require('fast-check');

// Test 1: Async property with explicit Promise.resolve
const asyncProperty1 = fc.property(
  fc.record({ value: fc.integer() }),
  async (testData) => {
    console.log('Test 1 - Async with Promise.resolve:', testData);
    return Promise.resolve(true);
  }
);

// Test 2: Async property with await
const asyncProperty2 = fc.property(
  fc.record({ value: fc.integer() }),
  async (testData) => {
    console.log('Test 2 - Async with await:', testData);
    await Promise.resolve(); // Simulate async work
    return true;
  }
);

// Test 3: Non-async property that returns a Promise
const asyncProperty3 = fc.property(
  fc.record({ value: fc.integer() }),
  (testData) => {
    console.log('Test 3 - Non-async returning Promise:', testData);
    return Promise.resolve(true);
  }
);

async function runTests() {
  console.log('=== Test 1: Async with Promise.resolve ===');
  try {
    await fc.assert(asyncProperty1, { numRuns: 2 });
    console.log('PASSED');
  } catch (error) {
    console.error('FAILED:', error.message);
  }

  console.log('\n=== Test 2: Async with await ===');
  try {
    await fc.assert(asyncProperty2, { numRuns: 2 });
    console.log('PASSED');
  } catch (error) {
    console.error('FAILED:', error.message);
  }

  console.log('\n=== Test 3: Non-async returning Promise ===');
  try {
    await fc.assert(asyncProperty3, { numRuns: 2 });
    console.log('PASSED');
  } catch (error) {
    console.error('FAILED:', error.message);
  }
}

runTests();