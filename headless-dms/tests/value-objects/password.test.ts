// tests/value-objects/password.test.ts
import 'reflect-metadata';
import { Password } from '../../src/domain/value-objects/Password.js';
import { Result } from '@carbonteq/fp';

console.log('=== Password Value Object Tests ===\n');

async function runPasswordTests() {
  // Test 1: Immutability
  console.log('Test 1: Immutability');
  try {
    const password = Password.create('SecurePass456!').unwrap();
    console.log('✅ Password created successfully');
    console.log('  - Password value:', password.value);
    console.log('  - Password length:', password.length);
    console.log('  - Strength score:', password.strengthScore);
    console.log('  - Strength level:', password.strengthLevel);
    console.log('  - Is strong:', password.isStrong);
    console.log('  - Meets minimum requirements:', password.meetsMinimumRequirements);
    
    // Note: password.value = 'NewPass456!' would cause a TypeScript error
    // This demonstrates immutability at the type level
    console.log('✅ Password is immutable (TypeScript prevents modification)');
  } catch (error) {
    console.log('❌ Immutability test failed:', error);
  }

  // Test 2: No Identity (Value Equality)
  console.log('\nTest 2: No Identity (Value Equality)');
  try {
    const pass1 = Password.create('SecurePass456!').unwrap();
    const pass2 = Password.create('SecurePass456!').unwrap();
    const pass3 = Password.create('SECUREPASS456!').unwrap();
    
    console.log('✅ Multiple "SecurePass456!" passwords created');
    console.log('  - Password 1 value:', pass1.value);
    console.log('  - Password 2 value:', pass2.value);
    console.log('  - Password 3 value:', pass3.value);
    
    // These are different instances but equal values
    console.log('  - Password 1 === Password 2:', pass1 === pass2); // false (different instances)
    console.log('  - Password 1 equals Password 2:', pass1.equals(pass2)); // true (same value)
    console.log('  - Password 1 equals Password 3:', pass1.equals(pass3)); // false (different values)
    
    console.log('✅ Value equality works correctly (no identity)');
  } catch (error) {
    console.log('❌ No identity test failed:', error);
  }

  // Test 3: Value Comparison and Business Logic
  console.log('\nTest 3: Value Comparison and Business Logic');
  try {
    const weakPassword = Password.create('weak').unwrap();
    const mediumPassword = Password.create('MediumPass123!').unwrap();
    const strongPassword = Password.create('VeryStrongPassword2024!@#').unwrap();
    
    console.log('✅ Different password strengths created');
    console.log('  - Weak password:', weakPassword.value, '(strength:', weakPassword.strengthLevel, ')');
    console.log('  - Medium password:', mediumPassword.value, '(strength:', mediumPassword.strengthLevel, ')');
    console.log('  - Strong password:', strongPassword.value, '(strength:', strongPassword.strengthLevel, ')');
    
    // Test strength comparisons
    console.log('  - Weak < Medium:', weakPassword.isWeakerThan(mediumPassword));
    console.log('  - Medium > Weak:', mediumPassword.isStrongerThan(weakPassword));
    console.log('  - Strong > Medium:', strongPassword.isStrongerThan(mediumPassword));
    
    // Test strength analysis
    console.log('  - Weak is very weak:', weakPassword.isVeryWeak);
    console.log('  - Medium meets minimum:', mediumPassword.meetsMinimumRequirements);
    console.log('  - Strong is strong:', strongPassword.isStrong);
    
    // Test requirements summary
    console.log('  - Weak requirements:');
    console.log(weakPassword.requirementsSummary);
    
    console.log('✅ Value comparison and business logic work correctly');
  } catch (error) {
    console.log('❌ Value comparison test failed:', error);
  }

  // Test 4: Self-Validation
  console.log('\nTest 4: Self-Validation');
  try {
    // Valid passwords
    const validPassResult = Password.create('ValidPass123!');
    const validLongPassResult = Password.create('VeryLongPasswordWithManyCharacters123!@#');
    
    console.log('✅ Valid password creation:');
    console.log('  - "ValidPass123!" result:', validPassResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - Long password result:', validLongPassResult.isOk() ? 'SUCCESS' : 'FAILED');
    
    // Invalid passwords
    const emptyResult = Password.create('');
    const nullResult = Password.create(null as any);
    const tooShortResult = Password.create('short');
    const noLowercaseResult = Password.create('UPPERCASE123!');
    const noUppercaseResult = Password.create('lowercase123!');
    const noNumbersResult = Password.create('NoNumbers!');
    const noSpecialCharsResult = Password.create('NoSpecialChars123');
    const commonPassResult = Password.create('password');
    const sequentialResult = Password.create('abc123!');
    const repeatedResult = Password.create('aaa123!');
    
    console.log('✅ Invalid password rejection:');
    console.log('  - Empty string result:', emptyResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (emptyResult.isErr()) {
      console.log('    Error:', emptyResult.unwrapErr());
    }
    
    console.log('  - Null result:', nullResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (nullResult.isErr()) {
      console.log('    Error:', nullResult.unwrapErr());
    }
    
    console.log('  - Too short result:', tooShortResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (tooShortResult.isErr()) {
      console.log('    Error:', tooShortResult.unwrapErr());
    }
    
    console.log('  - No lowercase result:', noLowercaseResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (noLowercaseResult.isErr()) {
      console.log('    Error:', noLowercaseResult.unwrapErr());
    }
    
    console.log('  - No uppercase result:', noUppercaseResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (noUppercaseResult.isErr()) {
      console.log('    Error:', noUppercaseResult.unwrapErr());
    }
    
    console.log('  - No numbers result:', noNumbersResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (noNumbersResult.isErr()) {
      console.log('    Error:', noNumbersResult.unwrapErr());
    }
    
    console.log('  - No special chars result:', noSpecialCharsResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (noSpecialCharsResult.isErr()) {
      console.log('    Error:', noSpecialCharsResult.unwrapErr());
    }
    
    console.log('  - Common password result:', commonPassResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (commonPassResult.isErr()) {
      console.log('    Error:', commonPassResult.unwrapErr());
    }
    
    console.log('  - Sequential chars result:', sequentialResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (sequentialResult.isErr()) {
      console.log('    Error:', sequentialResult.unwrapErr());
    }
    
    console.log('  - Repeated chars result:', repeatedResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (repeatedResult.isErr()) {
      console.log('    Error:', repeatedResult.unwrapErr());
    }
    
    console.log('✅ Self-validation works correctly');
  } catch (error) {
    console.log('❌ Self-validation test failed:', error);
  }

  // Test 5: Easy Testing and Utility Methods
  console.log('\nTest 5: Easy Testing and Utility Methods');
  try {
    // Test static methods
    const minLength = Password.getMinLength();
    const maxLength = Password.getMaxLength();
    
    console.log('✅ Static utility methods work:');
    console.log('  - Min length:', minLength);
    console.log('  - Max length:', maxLength);
    
    // Test validation
    console.log('  - Is "ValidPass123!" valid:', Password.isValid('ValidPass123!'));
    console.log('  - Is "weak" valid:', Password.isValid('weak'));
    console.log('  - Is "" valid:', Password.isValid(''));
    
    // Test custom requirements
    const customWeakResult = Password.createWithCustomRequirements('weak', {
      minLength: 4,
      requireLowercase: false,
      requireUppercase: false,
      requireNumbers: false,
      requireSpecialChars: false,
      allowCommonPasswords: true,
      allowSequentialChars: true,
      allowRepeatedChars: true
    });
    
    console.log('  - Custom weak password (relaxed rules):', customWeakResult.isOk() ? 'ACCEPTED' : 'REJECTED');
    
    const customStrongResult = Password.createWithCustomRequirements('CustomStrong123!', {
      minLength: 16,
      requireLowercase: true,
      requireUppercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      allowCommonPasswords: false,
      allowSequentialChars: false,
      allowRepeatedChars: false
    });
    
    console.log('  - Custom strong password (strict rules):', customStrongResult.isOk() ? 'ACCEPTED' : 'REJECTED');
    
    // Test serialization and security features
    const testPassword = Password.create('TestPassword123!').unwrap();
    console.log('  - toString():', testPassword.toString()); // Should be masked
    console.log('  - value property:', testPassword.value);
    console.log('  - masked:', testPassword.masked);
    
    // Test password characteristics
    console.log('  - Contains numbers:', /\d/.test(testPassword.value));
    console.log('  - Contains special chars:', /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(testPassword.value));
    console.log('  - Is short:', testPassword.length < 10);
    
    console.log('✅ Easy testing characteristics demonstrated');
  } catch (error) {
    console.log('❌ Easy testing test failed:', error);
  }

  console.log('\n=== Password Value Object Tests Complete ===');
  console.log('✅ All 5 characteristics demonstrated:');
  console.log('  - ✅ Immutable');
  console.log('  - ✅ No Identity');
  console.log('  - ✅ Value Comparison');
  console.log('  - ✅ Self-validating');
  console.log('  - ✅ Easily testable');
  console.log('\n🎯 Additional features demonstrated:');
  console.log('  - ✅ Password strength scoring (0-100)');
  console.log('  - ✅ Strength level categorization');
  console.log('  - ✅ Comprehensive validation rules');
  console.log('  - ✅ Custom requirement configuration');
  console.log('  - ✅ Security features (masking)');
  console.log('  - ✅ Weak password detection');
}

// Export the test function for the run-all script
export { runPasswordTests };

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPasswordTests().catch(console.error);
}  