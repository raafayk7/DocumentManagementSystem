// src/domain/entities/tests/user.entity.test.ts
import 'reflect-metadata';
import { User } from '../../../src/domain/entities/User.js';
import { Email } from '../../../src/domain/value-objects/Email.js';
import { UserRole } from '../../../src/domain/value-objects/UserRole.js';

async function runUserEntityTests() {
  console.log('=== User Entity Tests (Value Object Based) ===\n');
  console.log('🔍 Debug: Starting User Entity Tests...');
  console.log('🔍 Debug: Import statements should have worked...');

  // Test 1: User Creation with Factory Method
  console.log('Test 1: User Creation with Factory Method');
  try {
    const userResult = await User.create('test@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      console.log('✅ User factory method works');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email.value);
      console.log('  - Role:', user.role.value);
      console.log('  - Created at:', user.createdAt);
      console.log('  - Password hash length:', user.passwordHash.length);
    } else {
      console.log('❌ User factory method failed:', userResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ User factory method failed:', error);
  }

  // Test 2: User Creation from Repository Data
  console.log('\nTest 2: User Creation from Repository Data');
  try {
    const userResult = User.fromRepository({
      id: 'user-123',
      email: 'repo@example.com',
      passwordHash: 'hashedPassword123',
      role: 'admin',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    });

    if (userResult.isOk()) {
      const user = userResult.unwrap();
      console.log('✅ User from repository works');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email.value);
      console.log('  - Role:', user.role.value);
      console.log('  - Is Admin:', user.role.isAdmin);
      console.log('  - Is User:', user.role.isUser);
    } else {
      console.log('❌ User from repository failed:', userResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ User from repository failed:', error);
  }

  // Test 3: User State Changes
  console.log('\nTest 3: User State Changes');
  try {
    const userResult = await User.create('changeme@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      console.log('✅ Original user state:');
      console.log('  - Role:', user.role.value);
      console.log('  - Updated at:', user.updatedAt);

      // Change role
      const roleChangeResult = user.changeRole('admin');
      if (roleChangeResult.isOk()) {
        const updatedUser = roleChangeResult.unwrap();
        console.log('✅ Role changed to admin');
        console.log('  - New role:', updatedUser.role.value);
        console.log('  - Is Admin:', updatedUser.role.isAdmin);
        console.log('  - Updated at changed:', updatedUser.updatedAt !== user.updatedAt);
      } else {
        console.log('❌ Role change failed:', roleChangeResult.unwrapErr());
      }

      // Change password
      const passwordChangeResult = await user.changePassword('NewPassword123!');
      if (passwordChangeResult.isOk()) {
        const passwordChangedUser = passwordChangeResult.unwrap();
        console.log('✅ Password changed');
        console.log('  - Password updated:', passwordChangedUser.passwordHash !== user.passwordHash);
        console.log('  - Updated at changed:', passwordChangedUser.updatedAt !== user.updatedAt);
      } else {
        console.log('❌ Password change failed:', passwordChangeResult.unwrapErr());
      }

      // Change email
      const emailChangeResult = user.changeEmail('newemail@example.com');
      if (emailChangeResult.isOk()) {
        const emailChangedUser = emailChangeResult.unwrap();
        console.log('✅ Email changed');
        console.log('  - New email:', emailChangedUser.email.value);
        console.log('  - Updated at changed:', emailChangedUser.updatedAt !== user.updatedAt);
      } else {
        console.log('❌ Email change failed:', emailChangeResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for state changes failed:', userResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ User state changes failed:', error);
  }

  // Test 4: User Validation
  console.log('\nTest 4: User Validation');
  try {
    // Test invalid email
    const invalidEmailResult = await User.create('invalid-email', 'Password123!', 'user');
    if (invalidEmailResult.isErr()) {
      console.log('✅ Correctly rejected invalid email:', invalidEmailResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid email');
    }

    // Test invalid password
    const invalidPasswordResult = await User.create('test@example.com', 'weak', 'user');
    if (invalidPasswordResult.isErr()) {
      console.log('✅ Correctly rejected weak password:', invalidPasswordResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected weak password');
    }

    // Test invalid role
    const invalidRoleResult = await User.create('test@example.com', 'Password123!', 'moderator' as any);
    if (invalidRoleResult.isErr()) {
      console.log('✅ Correctly rejected invalid role:', invalidRoleResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid role');
    }

  } catch (error) {
    console.log('❌ User validation tests failed:', error);
  }

  // Test 5: User Business Methods
  console.log('\nTest 5: User Business Methods');
  try {
    const userResult = await User.create('business@example.com', 'Password123!', 'admin');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();

      // Test password verification
      const isPasswordValid = await user.verifyPassword('Password123!');
      console.log('✅ Password verification (correct):', isPasswordValid);
      
      const isPasswordInvalid = await user.verifyPassword('WrongPassword');
      console.log('✅ Password verification (incorrect):', isPasswordInvalid);

      // Test permissions
      console.log('✅ Has user permission:', user.hasPermission('user'));
      console.log('✅ Has admin permission:', user.hasPermission('admin'));

      // Test account age
      console.log('✅ Account age check (older than 0 days):', user.isAccountOlderThan(0));
      console.log('✅ Account age check (older than 365 days):', user.isAccountOlderThan(365));

      // Test role properties
      console.log('✅ Role is admin:', user.role.isAdmin);
      console.log('✅ Role is user:', user.role.isUser);
      console.log('✅ Role has higher privileges than user:', user.role.hasHigherPrivilegesThan(UserRole.user()));

    } else {
      console.log('❌ User creation for business methods failed:', userResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ User business methods failed:', error);
  }

  // Test 6: Repository Conversion
  console.log('\nTest 6: Repository Conversion');
  try {
    const userResult = await User.create('repo@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      const repoData = user.toRepository();
      
      console.log('✅ Repository conversion works');
      console.log('  - ID type:', typeof repoData.id);
      console.log('  - Email type:', typeof repoData.email);
      console.log('  - Role type:', typeof repoData.role);
      console.log('  - Email value:', repoData.email);
      console.log('  - Role value:', repoData.role);
      
      // Verify we can recreate from repository data
      const recreatedUser = User.fromRepository(repoData);
      if (recreatedUser.isOk()) {
        console.log('✅ Recreation from repository data works');
        console.log('  - Recreated email:', recreatedUser.unwrap().email.value);
        console.log('  - Recreated role:', recreatedUser.unwrap().role.value);
      } else {
        console.log('❌ Recreation from repository data failed:', recreatedUser.unwrapErr());
      }
    } else {
      console.log('❌ User creation for repository conversion failed:', userResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ Repository conversion failed:', error);
  }

  console.log('\n=== User Entity Tests Complete ===');
}

export { runUserEntityTests }; 


// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUserEntityTests().catch(console.error);
}
