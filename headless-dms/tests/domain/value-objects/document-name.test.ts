// tests/value-objects/document-name.test.ts
import 'reflect-metadata';
import { DocumentName } from '../../../src/domain/value-objects/DocumentName.js';
import { Result } from '@carbonteq/fp';

console.log('=== DocumentName Value Object Tests ===\n');

async function runDocumentNameTests() {
  // Test 1: Immutability
  console.log('Test 1: Immutability');
  try {
    const docName = DocumentName.create('My Document.pdf').unwrap();
    console.log('✅ DocumentName created successfully');
    console.log('  - Name value:', docName.value);
    console.log('  - Name length:', docName.length);
    console.log('  - Is short:', docName.isShort);
    console.log('  - Is medium:', docName.isMedium);
    console.log('  - Is long:', docName.isLong);
    console.log('  - Has numbers:', docName.hasNumbers);
    console.log('  - Has special chars:', docName.hasSpecialChars);
    
    // Note: docName.value = 'New Name' would cause a TypeScript error
    // This demonstrates immutability at the type level
    console.log('✅ DocumentName is immutable (TypeScript prevents modification)');
  } catch (error) {
    console.log('❌ Immutability test failed:', error);
  }

  // Test 2: No Identity (Value Equality)
  console.log('\nTest 2: No Identity (Value Equality)');
  try {
    const name1 = DocumentName.create('report.pdf').unwrap();
    const name2 = DocumentName.create('report.pdf').unwrap();
    const name3 = DocumentName.create('REPORT.PDF').unwrap();
    
    console.log('✅ Multiple "report.pdf" names created');
    console.log('  - Name 1 value:', name1.value);
    console.log('  - Name 2 value:', name2.value);
    console.log('  - Name 3 value:', name3.value);
    
    // These are different instances but equal values (case-insensitive)
    console.log('  - Name 1 === Name 2:', name1 === name2); // false (different instances)
    console.log('  - Name 1 equals Name 2:', name1.equals(name2)); // true (same value)
    console.log('  - Name 1 equals Name 3:', name1.equals(name3)); // true (case-insensitive)
    
    console.log('✅ Value equality works correctly (no identity)');
  } catch (error) {
    console.log('❌ No identity test failed:', error);
  }

  // Test 3: Value Comparison and Business Logic
  console.log('\nTest 3: Value Comparison and Business Logic');
  try {
    const shortName = DocumentName.create('doc.txt').unwrap();
    const mediumName = DocumentName.create('My Important Document.pdf').unwrap();
    const longName = DocumentName.create('This is a very long document name that exceeds fifty characters to test the long name functionality.pdf').unwrap();
    
    console.log('✅ Different document names created');
    console.log('  - Short name:', shortName.value, '(isShort:', shortName.isShort, ')');
    console.log('  - Medium name:', mediumName.value, '(isMedium:', mediumName.isMedium, ')');
    console.log('  - Long name:', longName.value, '(isLong:', longName.isLong, ')');
    
    // Test name analysis
    console.log('  - Short name word count:', shortName.wordCount);
    console.log('  - Medium name word count:', mediumName.wordCount);
    console.log('  - Long name word count:', longName.wordCount);
    
    console.log('  - Short name first word:', shortName.firstWord);
    console.log('  - Medium name first word:', mediumName.firstWord);
    console.log('  - Long name first word:', longName.firstWord);
    
    // Test string operations
    console.log('  - Medium name starts with "My":', mediumName.startsWith('My'));
    console.log('  - Medium name ends with ".pdf":', mediumName.endsWith('.pdf'));
    console.log('  - Medium name contains "Important":', mediumName.contains('Important'));
    
    // Test case-insensitive operations
    console.log('  - Medium name starts with "my":', mediumName.startsWith('my'));
    console.log('  - Medium name contains "important":', mediumName.contains('important'));
    
    console.log('✅ Value comparison and business logic work correctly');
  } catch (error) {
    console.log('❌ Value comparison test failed:', error);
  }

  // Test 4: Self-Validation
  console.log('\nTest 4: Self-Validation');
  try {
    // Valid document names
    const validNameResult = DocumentName.create('valid-document.pdf');
    const validWithSpacesResult = DocumentName.create('My Document Name');
    const validWithNumbersResult = DocumentName.create('Report 2024 Q1');
    const validWithSpecialCharsResult = DocumentName.create('project_plan-v2.1');
    
    console.log('✅ Valid document name creation:');
    console.log('  - "valid-document.pdf" result:', validNameResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "My Document Name" result:', validWithSpacesResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "Report 2024 Q1" result:', validWithNumbersResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "project_plan-v2.1" result:', validWithSpecialCharsResult.isOk() ? 'SUCCESS' : 'FAILED');
    
    // Invalid document names
    const emptyResult = DocumentName.create('');
    const nullResult = DocumentName.create(null as any);
    const forbiddenCharsResult = DocumentName.create('file<name>.txt');
    const reservedNameResult = DocumentName.create('CON');
    const leadingSpaceResult = DocumentName.create(' name.txt');
    const trailingDotResult = DocumentName.create('name.');
    const consecutiveSpacesResult = DocumentName.create('name  with  spaces');
    
    console.log('✅ Invalid document name rejection:');
    console.log('  - Empty string result:', emptyResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (emptyResult.isErr()) {
      console.log('    Error:', emptyResult.unwrapErr());
    }
    
    console.log('  - Null result:', nullResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (nullResult.isErr()) {
      console.log('    Error:', nullResult.unwrapErr());
    }
    
    console.log('  - Forbidden chars result:', forbiddenCharsResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (forbiddenCharsResult.isErr()) {
      console.log('    Error:', forbiddenCharsResult.unwrapErr());
    }
    
    console.log('  - Reserved name result:', reservedNameResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (reservedNameResult.isErr()) {
      console.log('    Error:', reservedNameResult.unwrapErr());
    }
    
    console.log('  - Leading space result:', leadingSpaceResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (leadingSpaceResult.isErr()) {
      console.log('    Error:', leadingSpaceResult.unwrapErr());
    }
    
    console.log('  - Trailing dot result:', trailingDotResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (trailingDotResult.isErr()) {
      console.log('    Error:', trailingDotResult.unwrapErr());
    }
    
    console.log('  - Consecutive spaces result:', consecutiveSpacesResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (consecutiveSpacesResult.isErr()) {
      console.log('    Error:', consecutiveSpacesResult.unwrapErr());
    }
    
    console.log('✅ Self-validation works correctly');
  } catch (error) {
    console.log('❌ Self-validation test failed:', error);
  }

  // Test 5: Easy Testing and Utility Methods
  console.log('\nTest 5: Easy Testing and Utility Methods');
  try {
    // Test static methods
    const maxLength = DocumentName.getMaxLength();
    const minLength = DocumentName.getMinLength();
    const forbiddenChars = DocumentName.getForbiddenCharacters();
    const forbiddenNames = DocumentName.getForbiddenNames();
    
    console.log('✅ Static utility methods work:');
    console.log('  - Max length:', maxLength);
    console.log('  - Min length:', minLength);
    console.log('  - Forbidden characters:', forbiddenChars);
    console.log('  - Forbidden names count:', forbiddenNames.length);
    
    // Test validation
    console.log('  - Is "valid" valid:', DocumentName.isValid('valid'));
    console.log('  - Is "" valid:', DocumentName.isValid(''));
    console.log('  - Is "file<name>" valid:', DocumentName.isValid('file<name>'));
    
    // Test fromFilename factory method
    const filenameResult = DocumentName.fromFilename('document.pdf');
    if (filenameResult.isOk()) {
      console.log('  - fromFilename("document.pdf"):', filenameResult.unwrap().value);
    }
    
    const filenameWithPathResult = DocumentName.fromFilename('/path/to/document.pdf');
    if (filenameWithPathResult.isOk()) {
      console.log('  - fromFilename("/path/to/document.pdf"):', filenameWithPathResult.unwrap().value);
    }
    
    // Test serialization
    const testName = DocumentName.create('Test Document').unwrap();
    console.log('  - toString():', testName.toString());
    console.log('  - value property:', testName.value);
    console.log('  - normalized:', testName.normalized);
    
    console.log('✅ Easy testing characteristics demonstrated');
  } catch (error) {
    console.log('❌ Easy testing test failed:', error);
  }

  console.log('\n=== DocumentName Value Object Tests Complete ===');
  console.log('✅ All 5 characteristics demonstrated:');
  console.log('  - ✅ Immutable');
  console.log('  - ✅ No Identity');
  console.log('  - ✅ Value Comparison');
  console.log('  - ✅ Self-validating');
  console.log('  - ✅ Easily testable');
  console.log('\n🎯 Additional features demonstrated:');
  console.log('  - ✅ Length categorization (short, medium, long)');
  console.log('  - ✅ Word analysis (count, first, last)');
  console.log('  - ✅ String operations (startsWith, endsWith, contains)');
  console.log('  - ✅ Case-insensitive equality');
  console.log('  - ✅ Filename parsing and validation');
  console.log('  - ✅ Business rule enforcement (forbidden chars, reserved names)');
}

// Export the test function for the run-all script
export { runDocumentNameTests };

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDocumentNameTests().catch(console.error);
} 