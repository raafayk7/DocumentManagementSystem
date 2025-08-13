// tests/run-all-tests.js
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Running All Tests...\n');

const tests = [
  'domain/user.test.ts',
  'domain/document.test.ts',
  'validators/user-validator.test.ts',
  'validators/document-validator.test.ts',
  'repositories/user-repository.test.ts',
  'repositories/document-repository.test.ts',
  'services/user-service.test.ts',
  'services/document-service.test.ts',
  'framework-independence/domain-services.test.js',
  'framework-independence/use-cases-with-mocks.test.js'
]

let passedTests = 0;
let totalTests = tests.length;

async function runTest(testFile) {
  return new Promise((resolve) => {
    console.log(`\n📋 Running: ${testFile}`);
    console.log('─'.repeat(50));

    const testPath = join(__dirname, testFile);
    const child = spawn('npx', ['tsx', testPath], {
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${testFile} - PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${testFile} - FAILED (exit code: ${code})`);
      }
      resolve();
    });

    child.on('error', (error) => {
      console.log(`❌ ${testFile} - ERROR: ${error.message}`);
      resolve();
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting test suite...\n');

  for (const test of tests) {
    await runTest(test);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('💥 Some tests failed!');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 