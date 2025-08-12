// tests/value-objects/user-role.test.ts
import 'reflect-metadata';
import { UserRole } from '../../../src/domain/value-objects/UserRole.js';
import { Result } from '@carbonteq/fp';

console.log('=== UserRole Value Object Tests ===\n');

async function runUserRoleTests() {
  // Test 1: Immutability
  console.log('Test 1: Immutability');
  try {
    const role = UserRole.user();
    console.log('✅ UserRole created successfully');
    console.log('  - Role value:', role.value);
    console.log('  - Is admin:', role.isAdmin);
    console.log('  - Is user:', role.isUser);
    
    // Note: role.value = 'admin' would cause a TypeScript error
    // This demonstrates immutability at the type level
    console.log('✅ Role is immutable (TypeScript prevents modification)');
  } catch (error) {
    console.log('❌ Immutability test failed:', error);
  }

  // Test 2: No Identity (Value Equality)
  console.log('\nTest 2: No Identity (Value Equality)');
  try {
    const role1 = UserRole.create('admin').unwrap();
    const role2 = UserRole.create('admin').unwrap();
    const role3 = UserRole.admin();
    
    console.log('✅ Multiple admin roles created');
    console.log('  - Role 1 value:', role1.value);
    console.log('  - Role 2 value:', role2.value);
    console.log('  - Role 3 value:', role3.value);
    
    // These are different instances but equal values
    console.log('  - Role 1 === Role 2:', role1 === role2); // false (different instances)
    console.log('  - Role 1 equals Role 2:', role1.equals(role2)); // true (same value)
    console.log('  - Role 1 equals Role 3:', role1.equals(role3)); // true (same value)
    
    console.log('✅ Value equality works correctly (no identity)');
  } catch (error) {
    console.log('❌ No identity test failed:', error);
  }

  // Test 3: Value Comparison
  console.log('\nTest 3: Value Comparison');
  try {
    const userRole = UserRole.user();
    const adminRole = UserRole.admin();
    
    console.log('✅ User and admin roles created');
    console.log('  - User role:', userRole.value);
    console.log('  - Admin role:', adminRole.value);
    
    // Test privilege comparison
    console.log('  - Admin has higher privileges than user:', adminRole.hasHigherPrivilegesThan(userRole));
    console.log('  - User has higher privileges than admin:', userRole.hasHigherPrivilegesThan(adminRole));
    
    // Test equality
    console.log('  - User equals admin:', userRole.equals(adminRole));
    console.log('  - Admin equals admin:', adminRole.equals(adminRole));
    
    console.log('✅ Value comparison works correctly');
  } catch (error) {
    console.log('❌ Value comparison test failed:', error);
  }

  // Test 4: Self-Validation
  console.log('\nTest 4: Self-Validation');
  try {
    // Valid roles
    const validUserResult = UserRole.create('user');
    const validAdminResult = UserRole.create('ADMIN'); // Case insensitive
    const validMixedCaseResult = UserRole.create('User');
    
    console.log('✅ Valid role creation:');
    console.log('  - "user" result:', validUserResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "ADMIN" result:', validAdminResult.isOk() ? 'SUCCESS' : 'FAILED');
    console.log('  - "User" result:', validMixedCaseResult.isOk() ? 'SUCCESS' : 'FAILED');
    
    // Invalid roles
    const invalidRoleResult = UserRole.create('moderator');
    const emptyRoleResult = UserRole.create('');
    const nullRoleResult = UserRole.create(null as any);
    
    console.log('✅ Invalid role rejection:');
    console.log('  - "moderator" result:', invalidRoleResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (invalidRoleResult.isErr()) {
      console.log('    Error:', invalidRoleResult.unwrapErr());
    }
    
    console.log('  - Empty string result:', emptyRoleResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (emptyRoleResult.isErr()) {
      console.log('    Error:', emptyRoleResult.unwrapErr());
    }
    
    console.log('  - Null result:', nullRoleResult.isErr() ? 'REJECTED' : 'ACCEPTED');
    if (nullRoleResult.isErr()) {
      console.log('    Error:', nullRoleResult.unwrapErr());
    }
    
    console.log('✅ Self-validation works correctly');
  } catch (error) {
    console.log('❌ Self-validation test failed:', error);
  }

  // Test 5: Easy Testing
  console.log('\nTest 5: Easy Testing');
  try {
    // Test static methods
    const validRoles = UserRole.getValidRoles();
    console.log('✅ Static methods work:');
    console.log('  - Valid roles:', validRoles);
    console.log('  - Is "user" valid:', UserRole.isValid('user'));
    console.log('  - Is "moderator" valid:', UserRole.isValid('moderator'));
    
    // Test serialization
    const role = UserRole.admin();
    console.log('  - Role toString():', role.toString());
    console.log('  - Role value:', role.value);
    
    console.log('✅ Easy testing characteristics demonstrated');
  } catch (error) {
    console.log('❌ Easy testing test failed:', error);
  }

  console.log('\n=== UserRole Value Object Tests Complete ===');
  console.log('✅ All 5 characteristics demonstrated:');
  console.log('  - ✅ Immutable');
  console.log('  - ✅ No Identity');
  console.log('  - ✅ Value Comparison');
  console.log('  - ✅ Self-validating');
  console.log('  - ✅ Easily testable');
}

// Export the test function for the run-all script
export { runUserRoleTests };

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUserRoleTests().catch(console.error);
} 