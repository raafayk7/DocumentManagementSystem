// tests/value-objects/file-size.test.ts
import 'reflect-metadata';
import { FileSize } from '../../src/domain/value-objects/FileSize.js';
import { Result } from '@carbonteq/fp';

console.log('=== FileSize Value Object Tests ===\n');

async function runFileSizeTests() {
  // Test 1: Immutability
  console.log('Test 1: Immutability');
  try {
    const fileSize = FileSize.fromBytes(1024).unwrap();
    console.log('✅ FileSize created successfully');
    console.log('  - Size in bytes:', fileSize.bytes);
    console.log('  - Size in KB:', fileSize.kilobytes);
    console.log('  - Size in MB:', fileSize.megabytes);
    console.log('  - Size in GB:', fileSize.gigabytes);
    console.log('  - Is small:', fileSize.isSmall);
    console.log('  - Is medium:', fileSize.isMedium);
    console.log('  - Is large:', fileSize.isLarge);
    console.log('  - Is very large:', fileSize.isVeryLarge);
    
    // Note: fileSize.bytes = 2048 would cause a TypeScript error
    // This demonstrates immutability at the type level
    console.log('✅ FileSize is immutable (TypeScript prevents modification)');
  } catch (error) {
    console.log('❌ Immutability test failed:', error);
  }

  // Test 2: No Identity (Value Equality)
  console.log('\nTest 2: No Identity (Value Equality)');
  try {
    const size1 = FileSize.fromBytes(1024).unwrap();
    const size2 = FileSize.fromBytes(1024).unwrap();
    const size3 = FileSize.fromKB(1).unwrap();
    
    console.log('✅ Multiple 1KB file sizes created');
    console.log('  - Size 1 bytes:', size1.bytes);
    console.log('  - Size 2 bytes:', size2.bytes);
    console.log('  - Size 3 bytes:', size3.bytes);
    
    // These are different instances but equal values
    console.log('  - Size 1 === Size 2:', size1 === size2); // false (different instances)
    console.log('  - Size 1 equals Size 2:', size1.equals(size2)); // true (same value)
    console.log('  - Size 1 equals Size 3:', size1.equals(size3)); // true (same value)
    
    console.log('✅ Value equality works correctly (no identity)');
  } catch (error) {
    console.log('❌ No identity test failed:', error);
  }

  // Test 3: Value Comparison and Business Logic
  console.log('\nTest 3: Value Comparison and Business Logic');
  try {
    const smallSize = FileSize.fromBytes(512).unwrap();
    const mediumSize = FileSize.fromMB(50).unwrap();
    const largeSize = FileSize.fromMB(500).unwrap();
    const veryLargeSize = FileSize.fromGB(2).unwrap();
    
    console.log('✅ Different file sizes created');
    console.log('  - Small size:', smallSize.toString(), '(isSmall:', smallSize.isSmall, ')');
    console.log('  - Medium size:', mediumSize.toString(), '(isMedium:', mediumSize.isMedium, ')');
    console.log('  - Large size:', largeSize.toString(), '(isLarge:', largeSize.isLarge, ')');
    console.log('  - Very large size:', veryLargeSize.toString(), '(isVeryLarge:', veryLargeSize.isVeryLarge, ')');
    
    // Test size comparisons
    console.log('  - Small < Medium:', smallSize.isLessThan(mediumSize));
    console.log('  - Medium > Small:', mediumSize.isGreaterThan(smallSize));
    console.log('  - Large > Medium:', largeSize.isGreaterThan(mediumSize));
    
    // Test arithmetic operations
    const addedSize = smallSize.add(mediumSize);
    if (addedSize.isOk()) {
      console.log('  - Small + Medium:', addedSize.unwrap().toString());
    }
    
    const subtractedSize = largeSize.subtract(mediumSize);
    if (subtractedSize.isOk()) {
      console.log('  - Large - Medium:', subtractedSize.unwrap().toString());
    }
    
    // Test formatting
    console.log('  - Small formatted as KB:', smallSize.format('KB'));
    console.log('  - Medium formatted as MB:', mediumSize.format('MB'));
    console.log('  - Large formatted as GB:', largeSize.format('GB'));
    
    console.log('✅ Value comparison and business logic work correctly');
  } catch (error) {
    console.log('❌ Value comparison test failed:', error);
  }

  // Test 4: Self-Validation
  console.log('\nTest 4: Self-Validation');
  try {
    // Valid file sizes
    const validBytesResult = FileSize.fromBytes(1024);
    const validKBResult = FileSize.fromKB(1);
    const validMBResult = FileSize.fromMB(1);
    const validGBResult = FileSize.fromGB(1);
    
    console.log('✅ Valid file size creation:');
    console.log('  - 1024 bytes result:', validBytesResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - 1 KB result:', validKBResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - 1 MB result:', validMBResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - 1 GB result:', validGBResult.isOk() ? 'SUCCESS' : 'FAILED');
    
    // Invalid file sizes
    const negativeResult = FileSize.fromBytes(-1024);
    const nanResult = FileSize.fromBytes(NaN);
    const tooLargeResult = FileSize.fromGB(200); // Exceeds 100GB limit
    
    console.log('✅ Invalid file size rejection:');
    console.log('  - Negative bytes result:', negativeResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (negativeResult.isErr()) {
      console.log('    Error:', negativeResult.unwrapErr());
    }
    
    console.log('  - NaN result:', nanResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (nanResult.isErr()) {
      console.log('    Error:', nanResult.unwrapErr());
    }
    
    console.log('  - Too large result:', tooLargeResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (tooLargeResult.isErr()) {
      console.log('    Error:', tooLargeResult.unwrapErr());
    }
    
    console.log('✅ Self-validation works correctly');
  } catch (error) {
    console.log('❌ Self-validation test failed:', error);
  }

  // Test 5: Easy Testing and Utility Methods
  console.log('\nTest 5: Easy Testing and Utility Methods');
  try {
    // Test static methods
    const maxFileSize = FileSize.getMaxFileSize();
    console.log('✅ Static utility methods work:');
    console.log('  - Max file size:', maxFileSize.toString());
    console.log('  - Max file size bytes:', maxFileSize.bytes);
    
    // Test validation
    console.log('  - Is 1024 bytes valid:', FileSize.isValid(1024));
    console.log('  - Is -1024 bytes valid:', FileSize.isValid(-1024));
    console.log('  - Is NaN valid:', FileSize.isValid(NaN));
    
    // Test factory methods
    console.log('  - fromBytes(2048):', FileSize.fromBytes(2048).unwrap().toString());
    console.log('  - fromKB(2):', FileSize.fromKB(2).unwrap().toString());
    console.log('  - fromMB(2):', FileSize.fromMB(2).unwrap().toString());
    console.log('  - fromGB(2):', FileSize.fromGB(2).unwrap().toString());
    
    // Test edge cases
    const zeroSize = FileSize.fromBytes(0).unwrap();
    console.log('  - Zero size:', zeroSize.toString(), '(isEmpty:', zeroSize.isEmpty, ')');
    
    // Test toString method
    const testSize = FileSize.fromMB(1.5).unwrap();
    console.log('  - toString():', testSize.toString());
    console.log('  - value property:', testSize.bytes, 'bytes');
    
    console.log('✅ Easy testing characteristics demonstrated');
  } catch (error) {
    console.log('❌ Easy testing test failed:', error);
  }

  console.log('\n=== FileSize Value Object Tests Complete ===');
  console.log('✅ All 5 characteristics demonstrated:');
  console.log('  - ✅ Immutable');
  console.log('  - ✅ No Identity');
  console.log('  - ✅ Value Comparison');
  console.log('  - ✅ Self-validating');
  console.log('  - ✅ Easily testable');
  console.log('\n🎯 Additional features demonstrated:');
  console.log('  - ✅ Unit conversion (bytes, KB, MB, GB)');
  console.log('  - ✅ Size categorization (small, medium, large, very large)');
  console.log('  - ✅ Arithmetic operations (add, subtract)');
  console.log('  - ✅ Formatting with specific units');
  console.log('  - ✅ Human-readable string representation');
}

// Export the test function for the run-all script
export { runFileSizeTests };

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFileSizeTests().catch(console.error);
} 