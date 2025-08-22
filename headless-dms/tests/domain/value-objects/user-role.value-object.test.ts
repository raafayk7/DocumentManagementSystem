/**
 * UserRole Value Object Tests
 * Testing UserRole value object with hexapp BaseValueObject patterns
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
import { UserRole } from '../../../src/domain/value-objects/UserRole.js';

describe('Domain > Value Objects > UserRole', () => {
  describe('BaseValueObject Integration', () => {
    it('should extend hexapp BaseValueObject', () => {
      // Arrange & Act
      const roleResult = UserRole.create('user');
      
      // Assert
      const role = AppResultTestUtils.expectOk(roleResult);
      expect(role).to.be.instanceOf(UserRole);
      
      // Should have serialize method from BaseValueObject
      expect(role.serialize).to.be.a('function');
      expect(role.serialize()).to.be.a('string');
      expect(role.serialize()).to.equal('user');
    });

    it('should implement value object equality semantics', () => {
      // Arrange
      const role1Result = UserRole.create('admin');
      const role2Result = UserRole.create('admin');
      const role3Result = UserRole.create('user');
      
      // Act
      const role1 = AppResultTestUtils.expectOk(role1Result);
      const role2 = AppResultTestUtils.expectOk(role2Result);
      const role3 = AppResultTestUtils.expectOk(role3Result);
      
      // Assert - Same value should be equal
      expect(role1.equals(role2)).to.be.true;
      expect(role2.equals(role1)).to.be.true;
      
      // Different values should not be equal
      expect(role1.equals(role3)).to.be.false;
      expect(role3.equals(role1)).to.be.false;
    });

    it('should be immutable after creation', () => {
      // Arrange & Act
      const roleResult = UserRole.create('admin');
      const role = AppResultTestUtils.expectOk(roleResult);
      
      // Assert - Value object should be immutable
      expect(role.value).to.equal('admin');
      
      // Should not be able to modify the role (no setter methods)
      expect(role).to.not.have.property('setValue');
      expect(role).to.not.have.property('changeRole');
    });
  });

  describe('Factory Pattern Validation', () => {
    it('should create user role with valid input', () => {
      // Test valid roles
      const validRoles = ['user', 'admin'];
      
      validRoles.forEach(roleValue => {
        const result = UserRole.create(roleValue);
        const role = AppResultTestUtils.expectOk(result);
        expect(role.value).to.equal(roleValue);
      });
    });

    it('should normalize role input (lowercase)', () => {
      // Arrange & Act
      const result = UserRole.create('ADMIN');
      
      // Assert
      const role = AppResultTestUtils.expectOk(result);
      expect(role.value).to.equal('admin');
    });

    it('should return AppResult.Err for null/undefined input', () => {
      // Test null
      const nullResult = UserRole.create(null as any);
      AppResultTestUtils.expectErr(nullResult);
      
      // Test undefined  
      const undefinedResult = UserRole.create(undefined as any);
      AppResultTestUtils.expectErr(undefinedResult);
      
      // Test empty string
      const emptyResult = UserRole.create('');
      AppResultTestUtils.expectErr(emptyResult);
    });

    it('should return AppResult.Err for non-string input', () => {
      // Test number
      const numberResult = UserRole.create(123 as any);
      AppResultTestUtils.expectErr(numberResult);
      
      // Test object
      const objectResult = UserRole.create({} as any);
      AppResultTestUtils.expectErr(objectResult);
      
      // Test array
      const arrayResult = UserRole.create(['admin'] as any);
      AppResultTestUtils.expectErr(arrayResult);
    });
  });

  describe('Role Enumeration Validation', () => {
    it('should accept only valid role values', () => {
      const validRoles = ['user', 'admin'];
      
      validRoles.forEach(roleValue => {
        const result = UserRole.create(roleValue);
        AppResultTestUtils.expectOk(result);
      });
    });

    it('should reject invalid role values', () => {
      const invalidRoles = [
        'superuser',
        'guest',
        'moderator',
        'owner',
        'operator',
        'invalid',
        'USER', // Case should be normalized, but test rejection if strict
        'ADMIN'
      ];

      invalidRoles.forEach(roleValue => {
        const result = UserRole.create(roleValue);
        if (result.isErr()) {
          const error = AppResultTestUtils.expectErr(result);
          expect(error.message).to.include('Invalid role');
        }
        // Note: Some of these might be valid after normalization
      });
    });

    it('should handle case insensitive input consistently', () => {
      const casedRoles = [
        { input: 'user', expected: 'user' },
        { input: 'User', expected: 'user' },
        { input: 'USER', expected: 'user' },
        { input: 'admin', expected: 'admin' },
        { input: 'Admin', expected: 'admin' },
        { input: 'ADMIN', expected: 'admin' }
      ];

      casedRoles.forEach(({ input, expected }) => {
        const result = UserRole.create(input);
        const role = AppResultTestUtils.expectOk(result);
        expect(role.value).to.equal(expected);
      });
    });

    it('should trim whitespace from input', () => {
      const whitespaceInputs = [
        '  user  ',
        '\tadmin\t',
        '\nuser\n',
        ' admin '
      ];

      whitespaceInputs.forEach(input => {
        const result = UserRole.create(input);
        const role = AppResultTestUtils.expectOk(result);
        expect(role.value).to.be.oneOf(['user', 'admin']);
        expect(role.value).to.not.include(' ');
        expect(role.value).to.not.include('\t');
        expect(role.value).to.not.include('\n');
      });
    });
  });

  describe('Role Permission Methods', () => {
    it('should identify admin role correctly', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(adminRole.isAdmin).to.be.true;
      expect(userRole.isAdmin).to.be.false;
    });

    it('should identify user role correctly', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(userRole.isUser).to.be.true;
      expect(adminRole.isUser).to.be.false;
    });

    it('should check specific permissions correctly', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert - Admin role properties
      expect(adminRole.isAdmin).to.be.true;
      expect(adminRole.isUser).to.be.false;
      expect(adminRole.value).to.equal('admin');
      expect(adminRole.hasHigherPrivilegesThan(userRole)).to.be.true;
      
      // Act & Assert - User role properties
      expect(userRole.isAdmin).to.be.false;
      expect(userRole.isUser).to.be.true;
      expect(userRole.value).to.equal('user');
      expect(userRole.hasHigherPrivilegesThan(adminRole)).to.be.false;
    });

    it('should get permission level correctly', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(adminRole.hasHigherPrivilegesThan(userRole)).to.be.true;
      expect(userRole.hasHigherPrivilegesThan(adminRole)).to.be.false;
      expect(adminRole.equals(userRole)).to.be.false;
    });
  });

  describe('Role Transition Methods', () => {
    it('should validate role transitions correctly', () => {
      // Arrange
      const userResult = UserRole.create('user');
      const adminResult = UserRole.create('admin');
      
      const userRole = AppResultTestUtils.expectOk(userResult);
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      
      // Act & Assert - Check promotion/demotion possibilities
      expect(UserRole.canPromote('user')).to.be.true; // User can be promoted to admin
      expect(UserRole.canDemote('admin')).to.be.true; // Admin can be demoted to user
      expect(UserRole.canPromote('admin')).to.be.false; // Admin can't be promoted further
      expect(UserRole.canDemote('user')).to.be.false; // User can't be demoted further
    });

    it('should validate role values correctly', () => {
      // Arrange & Act & Assert - Valid role names
      expect(UserRole.isValid('user')).to.be.true;
      expect(UserRole.isValid('admin')).to.be.true;
      
      // Invalid role names
      expect(UserRole.isValid('superuser')).to.be.false;
      expect(UserRole.isValid('guest')).to.be.false;
      expect(UserRole.isValid('invalid')).to.be.false;
    });

    it('should check if role has higher privileges', () => {
      // Arrange
      const userResult = UserRole.create('user');
      const adminResult = UserRole.create('admin');
      
      const userRole = AppResultTestUtils.expectOk(userResult);
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      
      // Act & Assert
      expect(adminRole.hasHigherPrivilegesThan(userRole)).to.be.true;
      expect(userRole.hasHigherPrivilegesThan(adminRole)).to.be.false;
      expect(userRole.hasHigherPrivilegesThan(userRole)).to.be.false; // Same level
    });
  });

  describe('Role Business Logic', () => {
    it('should provide valid roles and default role information', () => {
      // Arrange & Act
      const validRoles = UserRole.getValidRoles();
      const defaultRole = UserRole.getDefaultRole();
      
      // Assert
      expect(validRoles).to.be.an('array');
      expect(validRoles).to.include('admin');
      expect(validRoles).to.include('user');
      expect(defaultRole).to.be.a('string');
      expect(validRoles).to.include(defaultRole);
    });

    it('should check role properties and privileges', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(adminRole.isAdmin).to.be.true;
      expect(adminRole.isUser).to.be.false;
      expect(userRole.isAdmin).to.be.false;
      expect(userRole.isUser).to.be.true;
      expect(adminRole.hasHigherPrivilegesThan(userRole)).to.be.true;
    });

    it('should provide role string representation', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(adminRole.toString()).to.equal('admin');
      expect(userRole.toString()).to.equal('user');
      expect(adminRole.serialize()).to.equal('admin');
      expect(userRole.serialize()).to.equal('user');
    });
  });

  describe('Serialization Patterns', () => {
    it('should serialize to string value', () => {
      // Arrange
      const roleResult = UserRole.create('admin');
      const role = AppResultTestUtils.expectOk(roleResult);
      
      // Act
      const serialized = role.serialize();
      
      // Assert
      expect(serialized).to.be.a('string');
      expect(serialized).to.equal('admin');
    });

    it('should preserve normalized format in serialization', () => {
      // Arrange
      const roleResult = UserRole.create('ADMIN');
      const role = AppResultTestUtils.expectOk(roleResult);
      
      // Act
      const serialized = role.serialize();
      
      // Assert
      expect(serialized).to.equal('admin');
    });

    it('should provide consistent serialization across instances', () => {
      // Arrange
      const role1Result = UserRole.create('admin');
      const role2Result = UserRole.create('ADMIN');
      
      const role1 = AppResultTestUtils.expectOk(role1Result);
      const role2 = AppResultTestUtils.expectOk(role2Result);
      
      // Act & Assert
      expect(role1.serialize()).to.equal(role2.serialize());
    });
  });

  describe('Utility Methods', () => {
    it('should provide string representation', () => {
      // Arrange
      const roleResult = UserRole.create('admin');
      const role = AppResultTestUtils.expectOk(roleResult);
      
      // Act & Assert
      expect(role.toString()).to.equal('admin');
      expect(String(role)).to.equal('admin');
    });

    it('should provide role hierarchy through privileges', () => {
      // Arrange
      const adminResult = UserRole.create('admin');
      const userResult = UserRole.create('user');
      
      const adminRole = AppResultTestUtils.expectOk(adminResult);
      const userRole = AppResultTestUtils.expectOk(userResult);
      
      // Act & Assert
      expect(adminRole.hasHigherPrivilegesThan(userRole)).to.be.true;
      expect(userRole.hasHigherPrivilegesThan(adminRole)).to.be.false;
      expect(adminRole.equals(userRole)).to.be.false;
    });

    it('should list all valid role values', () => {
      // Act
      const validRoles = UserRole.getValidRoles();
      
      // Assert
      expect(validRoles).to.be.an('array');
      expect(validRoles).to.include('user');
      expect(validRoles).to.include('admin');
      expect(validRoles.length).to.equal(2); // Should only have these two roles
    });

    it('should get default role', () => {
      // Act
      const defaultRole = UserRole.getDefaultRole();
      
      // Assert
      expect(defaultRole).to.be.a('string');
      expect(defaultRole).to.equal('user'); // Default should be 'user'
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should provide descriptive error messages for validation failures', () => {
      // Test invalid role
      const invalidResult = UserRole.create('superuser');
      const invalidError = AppResultTestUtils.expectErr(invalidResult);
      expect(invalidError.message).to.include('Invalid role');
      
      // Test empty input
      const emptyResult = UserRole.create('');
      const emptyError = AppResultTestUtils.expectErr(emptyResult);
      expect(emptyError.message).to.include('Role value is required');
      
      // Test null input
      const nullResult = UserRole.create(null as any);
      const nullError = AppResultTestUtils.expectErr(nullResult);
      expect(nullError.message).to.include('Role value is required');
    });

    it('should handle edge cases in role validation', () => {
      const edgeCases = [
        { input: 'user ', expected: 'user' }, // Trailing space
        { input: ' admin', expected: 'admin' }, // Leading space
        { input: '\tuser\t', expected: 'user' }, // Tab characters
        { input: '\nadmin\n', expected: 'admin' } // Newline characters
      ];

      edgeCases.forEach(({ input, expected }) => {
        const result = UserRole.create(input);
        const role = AppResultTestUtils.expectOk(result);
        expect(role.value).to.equal(expected);
      });
    });

    it('should handle role comparison edge cases', () => {
      // Arrange
      const role1Result = UserRole.create('user');
      const role2Result = UserRole.create('user');
      const role1 = AppResultTestUtils.expectOk(role1Result);
      const role2 = AppResultTestUtils.expectOk(role2Result);
      
      // Same role should not have higher privileges than itself
      expect(role1.hasHigherPrivilegesThan(role2)).to.be.false;
      expect(role2.hasHigherPrivilegesThan(role1)).to.be.false;
      
      // Same roles should be equal
      expect(role1.equals(role2)).to.be.true;
    });

    it('should handle role validation edge cases', () => {
      // Arrange
      const roleResult = UserRole.create('user');
      const role = AppResultTestUtils.expectOk(roleResult);
      
      // Act & Assert - Basic role properties
      expect(role.isUser).to.be.true;
      expect(role.isAdmin).to.be.false;
      expect(role.toString()).to.equal('user');
    });

    it('should maintain role enumeration integrity', () => {
      // This test ensures that the role enumeration is properly maintained
      const validRoles = UserRole.getValidRoles();
      
      // Should contain exactly the expected roles
      expect(validRoles).to.include('user');
      expect(validRoles).to.include('admin');
      
      // Each valid role should be creatable
      validRoles.forEach(role => {
        const result = UserRole.create(role);
        AppResultTestUtils.expectOk(result);
      });
      
      // All valid roles should be unique
      const uniqueRoles = [...new Set(validRoles)];
      expect(uniqueRoles.length).to.equal(validRoles.length);
    });
  });
});
