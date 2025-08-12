// tests/value-objects/run-all-val-obj-tests.ts
import 'reflect-metadata';

console.log('🚀 ========================================');
console.log('🚀 RUNNING ALL VALUE OBJECT TESTS');
console.log('🚀 ========================================\n');

// Import and run all value object tests
async function runAllValueObjectTests() {
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  console.log('📋 Test Summary:');
  console.log('📋 - UserRole: 5 characteristics + business logic');
  console.log('📋 - MimeType: 5 characteristics + categorization');
  console.log('📋 - FileSize: 5 characteristics + unit handling');
  console.log('📋 - DocumentName: 5 characteristics + validation rules');
  console.log('📋 - Email: 5 characteristics + domain analysis');
  console.log('📋 - Password: 5 characteristics + strength scoring');
  console.log('📋 Total: 6 value objects × 5 characteristics = 30+ tests\n');

  try {
    // Test 1: UserRole
    console.log('🆔 ========================================');
    console.log('🆔 TESTING USEROLE VALUE OBJECT');
    console.log('🆔 ========================================');
    totalTests += 5;
    
    const { runUserRoleTests } = await import('./user-role.test.js');
    await runUserRoleTests();
    passedTests += 5;
    console.log('✅ UserRole tests completed successfully\n');

  } catch (error) {
    console.log('❌ UserRole tests failed:', error);
    failedTests += 5;
  }

  try {
    // Test 2: MimeType
    console.log('📄 ========================================');
    console.log('📄 TESTING MIMETYPE VALUE OBJECT');
    console.log('📄 ========================================');
    totalTests += 5;
    
    const { runMimeTypeTests } = await import('./mime-type.test.js');
    await runMimeTypeTests();
    passedTests += 5;
    console.log('✅ MimeType tests completed successfully\n');

  } catch (error) {
    console.log('❌ MimeType tests failed:', error);
    failedTests += 5;
  }

  try {
    // Test 3: FileSize
    console.log('💾 ========================================');
    console.log('💾 TESTING FILESIZE VALUE OBJECT');
    console.log('💾 ========================================');
    totalTests += 5;
    
    const { runFileSizeTests } = await import('./file-size.test.js');
    await runFileSizeTests();
    passedTests += 5;
    console.log('✅ FileSize tests completed successfully\n');

  } catch (error) {
    console.log('❌ FileSize tests failed:', error);
    failedTests += 5;
  }

  try {
    // Test 4: DocumentName
    console.log('📝 ========================================');
    console.log('📝 TESTING DOCUMENTNAME VALUE OBJECT');
    console.log('📝 ========================================');
    totalTests += 5;
    
    const { runDocumentNameTests } = await import('./document-name.test.js');
    await runDocumentNameTests();
    passedTests += 5;
    console.log('✅ DocumentName tests completed successfully\n');

  } catch (error) {
    console.log('❌ DocumentName tests failed:', error);
    failedTests += 5;
  }

  try {
    // Test 5: Email
    console.log('📧 ========================================');
    console.log('📧 TESTING EMAIL VALUE OBJECT');
    console.log('📧 ========================================');
    totalTests += 5;
    
    const { runEmailTests } = await import('./email.test.js');
    await runEmailTests();
    passedTests += 5;
    console.log('✅ Email tests completed successfully\n');

  } catch (error) {
    console.log('❌ Email tests failed:', error);
    failedTests += 5;
  }

  try {
    // Test 6: Password
    console.log('🔒 ========================================');
    console.log('🔒 TESTING PASSWORD VALUE OBJECT');
    console.log('🔒 ========================================');
    totalTests += 5;
    
    const { runPasswordTests } = await import('./password.test.js');
    await runPasswordTests();
    passedTests += 5;
    console.log('✅ Password tests completed successfully\n');

  } catch (error) {
    console.log('❌ Password tests failed:', error);
    failedTests += 5;
  }

  // Final Summary
  const endTime = Date.now();
  const duration = endTime - startTime;

  console.log('🎯 ========================================');
  console.log('🎯 FINAL TEST SUMMARY');
  console.log('🎯 ========================================');
  console.log(`⏱️  Total Duration: ${duration}ms`);
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL VALUE OBJECT TESTS PASSED! 🎉');
    console.log('🎯 All 6 value objects demonstrate the 5 core characteristics:');
    console.log('   ✅ Immutable');
    console.log('   ✅ No Identity');
    console.log('   ✅ Value Comparison');
    console.log('   ✅ Self-validating');
    console.log('   ✅ Easily testable');
    console.log('\n🚀 Ready for integration into entities and domain model!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }

 
}

// Run all tests
runAllValueObjectTests().catch(error => {
  console.error('💥 Fatal error running tests:', error);
  process.exit(1);
}); 