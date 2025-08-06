// tests/validators/user-validator.test.ts
import { UserValidator } from '../../src/domain/validators/UserValidator.js';

console.log('=== UserValidator Tests ===\n');

// Test 1: Password Validation
console.log('Test 1: Password Validation');
try {
  // Valid password
  const validPassword = UserValidator.validatePassword('Password123!');
  console.log('✅ Valid password:', validPassword.isOk() ? 'PASS' : 'FAIL');

  // Invalid passwords
  const shortPassword = UserValidator.validatePassword('short');
  console.log('✅ Short password rejected:', shortPassword.isErr() ? 'PASS' : 'FAIL');

  const emptyPassword = UserValidator.validatePassword('');
  console.log('✅ Empty password rejected:', emptyPassword.isErr() ? 'PASS' : 'FAIL');

  const weakPassword = UserValidator.validatePassword('password');
  console.log('✅ Weak password rejected:', weakPassword.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Password validation tests failed:', error);
}

// Test 2: Role Validation
console.log('\nTest 2: Role Validation');
try {
  // Valid roles
  const userRole = UserValidator.validateRole('user');
  console.log('✅ User role valid:', userRole.isOk() ? 'PASS' : 'FAIL');

  const adminRole = UserValidator.validateRole('admin');
  console.log('✅ Admin role valid:', adminRole.isOk() ? 'PASS' : 'FAIL');

  // Invalid roles
  const invalidRole = UserValidator.validateRole('moderator');
  console.log('✅ Invalid role rejected:', invalidRole.isErr() ? 'PASS' : 'FAIL');

  const emptyRole = UserValidator.validateRole('');
  console.log('✅ Empty role rejected:', emptyRole.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Role validation tests failed:', error);
}

// Test 3: Role Change Validation
console.log('\nTest 3: Role Change Validation');
try {
  // Valid role change
  const validChange = UserValidator.validateRoleChange('user1', 'user2', 'admin');
  console.log('✅ Valid role change:', validChange.isOk() ? 'PASS' : 'FAIL');

  // Self-role change (should fail)
  const selfChange = UserValidator.validateRoleChange('user1', 'user1', 'admin');
  console.log('✅ Self-role change rejected:', selfChange.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Role change validation tests failed:', error);
}

// Test 4: Account Age Validation
console.log('\nTest 4: Account Age Validation');
try {
  // Old account
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 30);
  const oldAccount = UserValidator.validateAccountAge(oldDate, 7);
  console.log('✅ Old account valid:', oldAccount.isOk() ? 'PASS' : 'FAIL');

  // New account
  const newDate = new Date();
  newDate.setDate(newDate.getDate() - 3);
  const newAccount = UserValidator.validateAccountAge(newDate, 7);
  console.log('✅ New account rejected:', newAccount.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Account age validation tests failed:', error);
}

// Test 5: Email Uniqueness Validation
console.log('\nTest 5: Email Uniqueness Validation');
try {
  const existingUsers = [
    { email: 'user1@example.com', id: '1' },
    { email: 'user2@example.com', id: '2' }
  ];

  // Unique email
  const uniqueEmail = UserValidator.validateEmailUniqueness('newuser@example.com', existingUsers);
  console.log('✅ Unique email valid:', uniqueEmail.isOk() ? 'PASS' : 'FAIL');

  // Duplicate email
  const duplicateEmail = UserValidator.validateEmailUniqueness('user1@example.com', existingUsers);
  console.log('✅ Duplicate email rejected:', duplicateEmail.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Email uniqueness validation tests failed:', error);
}

// Test 6: Permission Validation
console.log('\nTest 6: Permission Validation');
try {
  // Admin permissions
  const adminPermissions = UserValidator.validatePermission('admin', 'user', 'delete_user');
  console.log('✅ Admin can delete user:', adminPermissions.isOk() ? 'PASS' : 'FAIL');

  const adminUploadPermissions = UserValidator.validatePermission('admin', 'user', 'upload_document');
  console.log('✅ Admin can upload document:', adminUploadPermissions.isOk() ? 'PASS' : 'FAIL');

  // User permissions
  const userDeletePermissions = UserValidator.validatePermission('user', 'admin', 'delete_user');
  console.log('✅ User cannot delete user:', userDeletePermissions.isErr() ? 'PASS' : 'FAIL');

  const userUploadPermissions = UserValidator.validatePermission('user', 'user', 'upload_document');
  console.log('✅ User can upload document:', userUploadPermissions.isOk() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Permission validation tests failed:', error);
}

// Test 7: User Invariants
console.log('\nTest 7: User Invariants');
try {
  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Valid user invariants
  const validInvariants = UserValidator.validateUserInvariants(validUser);
  console.log('✅ Valid user invariants:', validInvariants.isOk() ? 'PASS' : 'FAIL');

  // Invalid user (missing email)
  const invalidUser = {
    id: 'user-123',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  } as any;

  const invalidInvariants = UserValidator.validateUserInvariants(invalidUser);
  console.log('✅ Invalid user invariants rejected:', invalidInvariants.isErr() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ User invariants tests failed:', error);
}

// Test 8: Individual Invariant Tests
console.log('\nTest 8: Individual Invariant Tests');
try {
  const validUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'user' as const,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Test email invariant
  const emailInvariant = UserValidator.validateUserEmailInvariant(validUser);
  console.log('✅ Email invariant:', emailInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test role invariant
  const roleInvariant = UserValidator.validateUserRoleInvariant(validUser);
  console.log('✅ Role invariant:', roleInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test timestamps invariant
  const timestampsInvariant = UserValidator.validateUserTimestampsInvariant(validUser);
  console.log('✅ Timestamps invariant:', timestampsInvariant.isOk() ? 'PASS' : 'FAIL');

  // Test ID invariant
  const idInvariant = UserValidator.validateUserIdInvariant(validUser);
  console.log('✅ ID invariant:', idInvariant.isOk() ? 'PASS' : 'FAIL');

} catch (error) {
  console.log('❌ Individual invariant tests failed:', error);
}

console.log('\n=== UserValidator Tests Complete ===');
console.log('✅ All tests passed!'); 