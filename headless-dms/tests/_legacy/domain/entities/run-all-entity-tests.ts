// tests/domain/entities/run-all-entity-tests.ts
import 'reflect-metadata';

console.log('🚀 ========================================');
console.log('🚀 RUNNING ALL ENTITY TESTS');
console.log('🚀 ========================================\n');

// Import and run all entity tests
async function runAllEntityTests() {
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  console.log('📋 Test Summary:');
  console.log('📋 - User Entity: Factory methods, state changes, validation, business methods');
  console.log('📋 - Document Entity: Factory methods, file operations, tag management, metadata');
  console.log('📋 Total: 2 entities with comprehensive test coverage\n');

  try {
    // Test 1: User Entity
    console.log('👤 ========================================');
    console.log('👤 TESTING USER ENTITY');
    console.log('👤 ========================================');
    totalTests += 6;
    
    const { runUserEntityTests } = await import('./user.entity.test.js');
    await runUserEntityTests();
    passedTests += 6;
    console.log('✅ User Entity tests completed successfully\n');

  } catch (error) {
    console.log('❌ User Entity tests failed:', error);
    failedTests += 6;
  }

  try {
    // Test 2: Document Entity
    console.log('📄 ========================================');
    console.log('📄 TESTING DOCUMENT ENTITY');
    console.log('📄 ========================================');
    totalTests += 9;
    
    const { runDocumentEntityTests } = await import('./document.entity.test.js');
    await runDocumentEntityTests();
    passedTests += 9;
    console.log('✅ Document Entity tests completed successfully\n');

  } catch (error) {
    console.log('❌ Document Entity tests failed:', error);
    failedTests += 9;
  }

  // Test Summary
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('=' .repeat(60));
  console.log('📊 ENTITY TESTS SUMMARY');
  console.log('=' .repeat(60));
  console.log(`⏱️  Total Duration: ${duration}ms`);
  console.log(`📝 Total Test Suites: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

  if (failedTests > 0) {
    console.log('\n🔴 Some entity tests failed. Please review the errors above.');
    console.log('💡 This may indicate issues with the refactored value object-based entities.');
    process.exit(1);
  } else {
    console.log('\n🎉 All entity tests passed successfully!');
    console.log('✨ Your value object-based entities are working correctly.');
    console.log('🚀 Ready to proceed with Phase 3 refactoring!');
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllEntityTests().catch((error) => {
    console.error('💥 Fatal error running entity tests:', error);
    process.exit(1);
  });
}

export { runAllEntityTests }; 