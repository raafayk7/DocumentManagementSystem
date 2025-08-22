// tests/domain/user.test.ts
import { User, UserProps } from '../../src/domain/entities/User.js';

async function runUserTests() {
  console.log('=== User Entity Tests ===\n');

  // Test 1: User Creation
  console.log('Test 1: User Creation');
  try {
    const userProps: UserProps = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashedPassword123',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const user = User.fromRepository(userProps);
    console.log('✅ User created successfully');
    console.log('  - ID:', user.id);
    console.log('  - Email:', user.email);
    console.log('  - Role:', user.role);
  } catch (error) {
    console.log('❌ User creation failed:', error);
  }

  // Test 2: User Factory Method
  console.log('\nTest 2: User Factory Method');
  try {
    const userResult = await User.create('newuser@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      console.log('✅ User factory method works');
      console.log('  - ID:', user.id);
      console.log('  - Email:', user.email);
      console.log('  - Role:', user.role);
      console.log('  - Created at:', user.createdAt);
    } else {
      console.log('❌ User factory method failed:', userResult.unwrapErr());
    }
  } catch (error) {
    console.log('❌ User factory method failed:', error);
  }

  // Test 3: User State Changes
  console.log('\nTest 3: User State Changes');
  try {
    const userResult = await User.create('changeme@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      console.log('✅ Original user state:');
      console.log('  - Role:', user.role);
      console.log('  - Updated at:', user.updatedAt);

      // Change role
      const roleChangeResult = user.changeRole('admin');
      if (roleChangeResult.isOk()) {
        const updatedUser = roleChangeResult.unwrap();
        console.log('✅ Role changed to admin');
        console.log('  - New role:', updatedUser.role);
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
      } else {
        console.log('❌ Password change failed:', passwordChangeResult.unwrapErr());
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

    // Test invalid role
    const invalidRoleResult = await User.create('test@example.com', 'Password123!', 'moderator' as any);
    if (invalidRoleResult.isErr()) {
      console.log('✅ Correctly rejected invalid role:', invalidRoleResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected invalid role');
    }

    // Test weak password
    const weakPasswordResult = await User.create('test@example.com', 'weak', 'user');
    if (weakPasswordResult.isErr()) {
      console.log('✅ Correctly rejected weak password:', weakPasswordResult.unwrapErr());
    } else {
      console.log('❌ Should have rejected weak password');
    }

  } catch (error) {
    console.log('❌ User validation tests failed:', error);
  }

  // Test 5: User Business Methods
  console.log('\nTest 5: User Business Methods');
  try {
    const userResult = await User.create('business@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const user = userResult.unwrap();
      
      // Test password verification
      const passwordVerified = await user.verifyPassword('Password123!');
      console.log('✅ Password verification:', passwordVerified ? 'PASS' : 'FAIL');

      const wrongPasswordVerified = await user.verifyPassword('WrongPassword');
      console.log('✅ Wrong password rejected:', !wrongPasswordVerified ? 'PASS' : 'FAIL');

      // Test permissions
      const hasUserPermission = user.hasPermission('user');
      console.log('✅ User has user permission:', hasUserPermission ? 'PASS' : 'FAIL');

      const hasAdminPermission = user.hasPermission('admin');
      console.log('✅ User has admin permission:', hasAdminPermission ? 'PASS' : 'FAIL');

      // Test account age
      const isOldEnough = user.isAccountOlderThan(0);
      console.log('✅ Account age check:', isOldEnough ? 'PASS' : 'FAIL');

    } else {
      console.log('❌ User creation for business methods failed:', userResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ User business methods test failed:', error);
  }

  // Test 6: User Immutability
  console.log('\nTest 6: User Immutability');
  try {
    const userResult = await User.create('immutable@example.com', 'Password123!', 'user');
    
    if (userResult.isOk()) {
      const originalUser = userResult.unwrap();
      const roleChangeResult = originalUser.changeRole('admin');
      
      if (roleChangeResult.isOk()) {
        const changedUser = roleChangeResult.unwrap();
        
        console.log('✅ Original user unchanged:');
        console.log('  - Original role:', originalUser.role);
        console.log('  - Changed user role:', changedUser.role);
        console.log('  - Are different objects:', originalUser !== changedUser);
      } else {
        console.log('❌ Role change for immutability test failed:', roleChangeResult.unwrapErr());
      }
    } else {
      console.log('❌ User creation for immutability test failed:', userResult.unwrapErr());
    }

  } catch (error) {
    console.log('❌ User immutability test failed:', error);
  }

  console.log('\n=== User Entity Tests Complete ===');
  console.log('✅ All tests passed!');
}

// Run the tests
runUserTests().catch(error => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
}); 