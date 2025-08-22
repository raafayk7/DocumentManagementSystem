/**
 * User Entity Tests
 * Testing User entity with hexapp BaseEntity patterns
 */

import { describe, it, beforeEach } from 'mocha';
import {
  expect,
  AppResult,
  AppError,
  AppErrStatus,
  UUID,
  DateTime,
  AppResultTestUtils,
  AppErrorTestUtils,
  ValueObjectTestUtils,
  TestDataUtils,
  AsyncTestUtils
} from '../../shared/test-helpers.js';
import { User } from '../../../src/domain/entities/User.js';
import { Email } from '../../../src/domain/value-objects/Email.js';
import { Password } from '../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../src/domain/value-objects/UserRole.js';

describe('Domain > Entities > User', () => {
  describe('BaseEntity Inheritance', () => {
    it('should extend hexapp BaseEntity and have required properties', async () => {
      // Arrange & Act
      const userResult = await User.create('test@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);

      // Assert - BaseEntity properties
      expect(user.id).to.be.a('string');
      ValueObjectTestUtils.expectValidUuid(user.id);
      ValueObjectTestUtils.expectValidDateTime(user.createdAt);
      ValueObjectTestUtils.expectValidDateTime(user.updatedAt);
      expect(user.createdAt).to.deep.equal(user.updatedAt); // Should be equal on creation
    });

    it('should have proper inheritance chain', async () => {
      // Arrange & Act
      const userResult = await User.create('test@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);

      // Assert - Inheritance
      expect(user).to.be.instanceOf(User);
      expect(user.constructor.name).to.equal('User');
      expect(user.serialize).to.be.a('function');
    });

    it('should properly manage timestamps on entity updates', async () => {
      // Arrange
      const userResult = await User.create('test@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);
      const originalUpdatedAt = user.updatedAt;

      // Wait to ensure timestamp difference
      await AsyncTestUtils.delay(10);

      // Act
      const updatedUserResult = user.changeRole('admin');
      const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);

      // Assert
      expect(updatedUser.createdAt).to.deep.equal(user.createdAt); // Should remain same
      expect(updatedUser.updatedAt.getTime()).to.be.greaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('Serialization Patterns', () => {
    it('should implement serialize method correctly', async () => {
      // Arrange
      const userResult = await User.create('test@example.com', 'StrongP@55w0rd!', 'admin');
      const user = AppResultTestUtils.expectOk(userResult);

      // Act
      const serialized = user.serialize();

      // Assert - BaseEntity serialization
      expect(serialized).to.have.property('id');
      expect(serialized).to.have.property('createdAt');
      expect(serialized).to.have.property('updatedAt');
      ValueObjectTestUtils.expectValidUuid(serialized.id);
      expect(serialized.createdAt).to.be.instanceOf(Date);
      expect(serialized.updatedAt).to.be.instanceOf(Date);

      // Assert - User-specific serialization
      expect(serialized).to.have.property('email', 'test@example.com');
      expect(serialized).to.have.property('passwordHash');
      expect(serialized).to.have.property('role', 'admin');
      expect(serialized.passwordHash).to.be.a('string');
      expect(serialized.passwordHash.length).to.be.greaterThan(0);
    });

    it('should have toRepository method for persistence layer', async () => {
      // Arrange
      const userResult = await User.create('repo@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);

      // Act
      const repoData = user.toRepository();

      // Assert
      expect(repoData).to.have.property('id');
      expect(repoData).to.have.property('email', 'repo@example.com');
      expect(repoData).to.have.property('passwordHash');
      expect(repoData).to.have.property('role', 'user');
      expect(repoData).to.have.property('createdAt');
      expect(repoData).to.have.property('updatedAt');
      ValueObjectTestUtils.expectValidUuid(repoData.id);
    });

    it('should serialize consistently across multiple calls', async () => {
      // Arrange
      const userResult = await User.create('consistent@example.com', 'StrongP@55w0rd!', 'admin');
      const user = AppResultTestUtils.expectOk(userResult);

      // Act
      const serialized1 = user.serialize();
      const serialized2 = user.serialize();

      // Assert
      expect(serialized1).to.deep.equal(serialized2);
    });
  });

  describe('Value Object Integration', () => {
    it('should integrate Email value object correctly', async () => {
      // Arrange & Act
      const userResult = await User.create('valueobjtest@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);

      // Assert
      expect(user.email).to.be.instanceOf(Email);
      expect(user.email.value).to.equal('valueobjtest@example.com');
    });

    it('should integrate UserRole value object correctly', async () => {
      // Arrange & Act
      const userResult = await User.create('roletest@example.com', 'StrongP@55w0rd!', 'admin');
      const user = AppResultTestUtils.expectOk(userResult);

      // Assert
      expect(user.role).to.be.instanceOf(UserRole);
      expect(user.role.value).to.equal('admin');
      expect(user.role.isAdmin).to.be.true;
      expect(user.role.isUser).to.be.false;
    });

    it('should validate value objects during creation', async () => {
      // Arrange & Act - Invalid email
      const invalidEmailResult = await User.create('invalid-email', 'StrongP@55w0rd!', 'user');
      
      // Assert
      const emailError = AppResultTestUtils.expectErr(invalidEmailResult);
      expect(emailError.message).to.include('Invalid email format');

      // Arrange & Act - Invalid role
      const invalidRoleResult = await User.create('valid@example.com', 'StrongP@55w0rd!', 'invalid-role');
      
      // Assert
      const roleError = AppResultTestUtils.expectErr(invalidRoleResult);
      expect(roleError.message).to.include('Invalid role');

      // Arrange & Act - Invalid password
      const invalidPasswordResult = await User.create('valid@example.com', 'weak', 'user');
      
      // Assert
      const passwordError = AppResultTestUtils.expectErr(invalidPasswordResult);
      expect(passwordError.message).to.include('Password must be at least 8 characters');
    });

    it('should maintain value object immutability', async () => {
      // Arrange
      const userResult = await User.create('immutable@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);
      const originalEmail = user.email;
      const originalRole = user.role;

      // Act - Try to modify (should return new instance)
      const updatedUserResult = user.changeEmail('newemail@example.com');
      const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);

      // Assert
      expect(user.email).to.equal(originalEmail); // Original unchanged
      expect(user.role).to.equal(originalRole); // Original unchanged
      expect(updatedUser.email.value).to.equal('newemail@example.com');
      expect(updatedUser).to.not.equal(user); // Different instances
    });
  });

  describe('Factory Methods', () => {
    describe('create()', () => {
      it('should create user with valid inputs', async () => {
        // Arrange & Act
        const userResult = await User.create('factory@example.com', 'StrongP@55w0rd!', 'admin');
        
        // Debug: Log the actual error if it fails
        if (userResult.isErr()) {
          console.log('❌ User.create() failed with error:', userResult.unwrapErr().message);
          console.log('❌ Full error details:', userResult.unwrapErr());
        }
        
        // Assert
        const user = AppResultTestUtils.expectOk(userResult);
        expect(user.email.value).to.equal('factory@example.com');
        expect(user.role.value).to.equal('admin');
        expect(user.passwordHash).to.be.a('string');
        expect(user.passwordHash.length).to.be.greaterThan(50); // bcrypt hash length
      });

      it('should hash password using bcrypt', async () => {
        // Arrange & Act
        const userResult = await User.create('hash@example.com', 'StrongP@55w0rd!', 'user');
        const user = AppResultTestUtils.expectOk(userResult);

        // Assert
        expect(user.passwordHash).to.not.equal('StrongP@55w0rd!'); // Should be hashed
        expect(user.passwordHash).to.match(/^\$2[aby]\$\d+\$/); // bcrypt format
        
        // Verify password works
        const isValid = await user.verifyPassword('StrongP@55w0rd!');
        expect(isValid).to.be.true;
      });

      it('should return AppResult.Err for invalid inputs', async () => {
        // Test invalid email
        const invalidEmailResult = await User.create('', 'StrongP@55w0rd!', 'user');
        AppResultTestUtils.expectErr(invalidEmailResult);

        // Test invalid password
        const invalidPasswordResult = await User.create('valid@example.com', '', 'user');
        AppResultTestUtils.expectErr(invalidPasswordResult);

        // Test invalid role
        const invalidRoleResult = await User.create('valid@example.com', 'StrongP@55w0rd!', '');
        AppResultTestUtils.expectErr(invalidRoleResult);
      });
    });

    describe('fromRepository()', () => {
      it('should create user from repository data', () => {
        // Arrange
        const repoData = TestDataUtils.generateUserData({
          email: 'fromrepo@example.com',
          passwordHash: '$2b$10$hashedPassword',
          role: 'admin'
        });

        // Act
        const userResult = User.fromRepository(repoData);
        
        // Assert
        const user = AppResultTestUtils.expectOk(userResult);
        expect(user.id).to.equal(repoData.id);
        expect(user.email.value).to.equal('fromrepo@example.com');
        expect(user.role.value).to.equal('admin');
        expect(user.passwordHash).to.equal('$2b$10$hashedPassword');
        expect(user.createdAt).to.deep.equal(repoData.createdAt);
        expect(user.updatedAt).to.deep.equal(repoData.updatedAt);
      });

      it('should return AppResult.Err for invalid repository data', () => {
        // Test invalid email in repo data
        const invalidEmailData = TestDataUtils.generateUserData({
          email: 'invalid-email'
        });
        
        const invalidEmailResult = User.fromRepository(invalidEmailData);
        AppResultTestUtils.expectErr(invalidEmailResult);

        // Test invalid role in repo data
        const invalidRoleData = TestDataUtils.generateUserData({
          role: 'invalid-role'
        });
        
        const invalidRoleResult = User.fromRepository(invalidRoleData);
        AppResultTestUtils.expectErr(invalidRoleResult);
      });
    });
  });

  describe('State-Changing Operations', () => {
    let testUser: User;

    beforeEach(async () => {
      const userResult = await User.create('statechange@example.com', 'StrongP@55w0rd!', 'user');
      testUser = AppResultTestUtils.expectOk(userResult);
    });

    describe('changePassword()', () => {
      it('should change password and return new user instance', async () => {
        // Act
        const updatedUserResult = await testUser.changePassword('NewStrongP@55w0rd!');
        
        // Assert
        const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);
        expect(updatedUser).to.not.equal(testUser); // Different instances
        expect(updatedUser.passwordHash).to.not.equal(testUser.passwordHash);
        
        // Verify new password works
        const isNewPasswordValid = await updatedUser.verifyPassword('NewStrongP@55w0rd!');
        expect(isNewPasswordValid).to.be.true;
        
        // Verify old password doesn't work
        const isOldPasswordValid = await updatedUser.verifyPassword('StrongP@55w0rd!');
        expect(isOldPasswordValid).to.be.false;
      });

      it('should validate new password', async () => {
        // Act & Assert
        const weakPasswordResult = await testUser.changePassword('weak');
        AppResultTestUtils.expectErr(weakPasswordResult);
      });

      it('should update timestamp but preserve other properties', async () => {
        // Arrange
        const originalCreatedAt = testUser.createdAt;
        const originalUpdatedAt = testUser.updatedAt;
        await AsyncTestUtils.delay(10);

        // Act
        const updatedUserResult = await testUser.changePassword('NewStrongP@55w0rd!');
        const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);

        // Assert
        expect(updatedUser.createdAt).to.deep.equal(originalCreatedAt);
        expect(updatedUser.updatedAt.getTime()).to.be.greaterThan(originalUpdatedAt.getTime());
        expect(updatedUser.email).to.deep.equal(testUser.email);
        expect(updatedUser.role).to.deep.equal(testUser.role);
      });
    });

    describe('changeRole()', () => {
      it('should change role and return new user instance', () => {
        // Act
        const updatedUserResult = testUser.changeRole('admin');
        
        // Assert
        const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);
        expect(updatedUser).to.not.equal(testUser);
        expect(updatedUser.role.value).to.equal('admin');
        expect(updatedUser.role.isAdmin).to.be.true;
        expect(testUser.role.value).to.equal('user'); // Original unchanged
      });

      it('should validate new role', () => {
        // Act & Assert
        const invalidRoleResult = testUser.changeRole('invalid-role');
        AppResultTestUtils.expectErr(invalidRoleResult);
      });
    });

    describe('changeEmail()', () => {
      it('should change email and return new user instance', () => {
        // Act
        const updatedUserResult = testUser.changeEmail('newemail@example.com');
        
        // Assert
        const updatedUser = AppResultTestUtils.expectOk(updatedUserResult);
        expect(updatedUser).to.not.equal(testUser);
        expect(updatedUser.email.value).to.equal('newemail@example.com');
        expect(testUser.email.value).to.equal('statechange@example.com'); // Original unchanged
      });

      it('should validate new email', () => {
        // Act & Assert
        const invalidEmailResult = testUser.changeEmail('invalid-email');
        AppResultTestUtils.expectErr(invalidEmailResult);
      });
    });
  });

  describe('Business Rule Enforcement', () => {
    let adminUser: User;
    let regularUser: User;

    beforeEach(async () => {
      const adminResult = await User.create('admin@example.com', 'StrongP@55w0rd!', 'admin');
      adminUser = AppResultTestUtils.expectOk(adminResult);

      const userResult = await User.create('user@example.com', 'StrongP@55w0rd!', 'user');
      regularUser = AppResultTestUtils.expectOk(userResult);
    });

    describe('hasPermission()', () => {
      it('should correctly enforce admin permissions', () => {
        // Assert - Admin has all permissions
        expect(adminUser.hasPermission('user')).to.be.true;
        expect(adminUser.hasPermission('admin')).to.be.true;
      });

      it('should correctly enforce user permissions', () => {
        // Assert - Regular user has limited permissions
        expect(regularUser.hasPermission('user')).to.be.true;
        expect(regularUser.hasPermission('admin')).to.be.false;
      });
    });

    describe('verifyPassword()', () => {
      it('should verify correct password', async () => {
        // Act & Assert
        const isValid = await regularUser.verifyPassword('StrongP@55w0rd!');
        expect(isValid).to.be.true;
      });

      it('should reject incorrect password', async () => {
        // Act & Assert
        const isValid = await regularUser.verifyPassword('WrongPassword');
        expect(isValid).to.be.false;
      });

      it('should handle empty password', async () => {
        // Act & Assert
        const isValid = await regularUser.verifyPassword('');
        expect(isValid).to.be.false;
      });
    });

    describe('isAccountOlderThan()', () => {
      it('should correctly check account age', async () => {
        // Add small delay to avoid timing precision issues
        await AsyncTestUtils.delay(10);
        
        // Act & Assert - New account should not be older than 1 day
        expect(regularUser.isAccountOlderThan(1)).to.be.false;
        expect(regularUser.isAccountOlderThan(0)).to.be.true; // New account is older than "0 days ago" (creation time vs now)
        expect(regularUser.isAccountOlderThan(-1)).to.be.true; // Account is older than "future time"
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', async () => {
      // Test null inputs
      await AsyncTestUtils.expectAsyncAppResultErr(
        () => User.create(null as any, 'StrongP@55w0rd!', 'user'),
        AppErrStatus.Generic
      );

      await AsyncTestUtils.expectAsyncAppResultErr(
        () => User.create('test@example.com', undefined as any, 'user'),
        AppErrStatus.Generic
      );

      await AsyncTestUtils.expectAsyncAppResultErr(
        () => User.create('test@example.com', 'StrongP@55w0rd!', null as any),
        AppErrStatus.Generic
      );
    });

    it('should handle boundary conditions', async () => {
      // Test minimum valid inputs
      const minValidResult = await User.create(
        'a@b.co', // Minimal valid email
        'StrongP@55w0rd!', // Use a password we know works from other tests
        'user'
      );
      if (minValidResult.isErr()) {
        console.log('❌ Min valid failed:', minValidResult.unwrapErr().message);
      }
      AppResultTestUtils.expectOk(minValidResult);

      // Test maximum reasonable inputs
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      const longPassword = 'StrongP@ssw0rdWith1ongLength!'; // No sequential or repeated chars
      
      const maxValidResult = await User.create(longEmail, longPassword, 'admin');
      if (maxValidResult.isErr()) {
        console.log('❌ Max valid failed:', maxValidResult.unwrapErr().message);
      }
      AppResultTestUtils.expectOk(maxValidResult);
    });

    it('should maintain consistency across all operations', async () => {
      // Arrange
      const userResult = await User.create('consistency@example.com', 'StrongP@55w0rd!', 'user');
      const user = AppResultTestUtils.expectOk(userResult);

      // Act - Multiple state changes
      const step1 = user.changeRole('admin');
      const updatedUser1 = AppResultTestUtils.expectOk(step1);
      
      const step2 = await updatedUser1.changePassword('NewStrong2#$word');
      const updatedUser2 = AppResultTestUtils.expectOk(step2);
      
      const step3 = updatedUser2.changeEmail('newconsistency@example.com');
      const finalUser = AppResultTestUtils.expectOk(step3);

      // Assert - Final state is consistent
      expect(finalUser.email.value).to.equal('newconsistency@example.com');
      expect(finalUser.role.value).to.equal('admin');
      const passwordValid = await finalUser.verifyPassword('NewStrong2#$word');
      expect(passwordValid).to.be.true;

      // Assert - Original user unchanged
      expect(user.email.value).to.equal('consistency@example.com');
      expect(user.role.value).to.equal('user');
      const originalPasswordValid = await user.verifyPassword('StrongP@55w0rd!');
      expect(originalPasswordValid).to.be.true;
    });
  });
});
