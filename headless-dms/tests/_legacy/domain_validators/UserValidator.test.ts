// src/domain/validators/__tests__/UserValidator.test.ts
import { UserValidator, User } from '../../src/domain/validators/UserValidator.js';

describe('UserValidator', () => {
  describe('Business Rules', () => {
    describe('validatePassword', () => {
      it('should validate password with minimum 8 characters', () => {
        const result = UserValidator.validatePassword('password123');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('password123');
      });

      it('should reject empty password', () => {
        const result = UserValidator.validatePassword('');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Password is required');
      });

      it('should reject password shorter than 8 characters', () => {
        const result = UserValidator.validatePassword('short');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Password must be at least 8 characters for security');
      });
    });

    describe('validateRole', () => {
      it('should validate user role', () => {
        const result = UserValidator.validateRole('user');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('user');
      });

      it('should validate admin role', () => {
        const result = UserValidator.validateRole('admin');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('admin');
      });

      it('should reject empty role', () => {
        const result = UserValidator.validateRole('');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Role is required');
      });

      it('should reject invalid role', () => {
        const result = UserValidator.validateRole('moderator');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Role must be either "user" or "admin"');
      });
    });

    describe('validateRoleChange', () => {
      it('should allow role change for different user', () => {
        const result = UserValidator.validateRoleChange('user1', 'user2', 'admin');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('admin');
      });

      it('should reject self-role change', () => {
        const result = UserValidator.validateRoleChange('user1', 'user1', 'admin');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Users cannot change their own role for security reasons');
      });
    });

    describe('validateAccountAge', () => {
      it('should validate account older than required days', () => {
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 30);
        
        const result = UserValidator.validateAccountAge(oldDate, 7);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject account younger than required days', () => {
        const recentDate = new Date();
        recentDate.setDate(recentDate.getDate() - 3);
        
        const result = UserValidator.validateAccountAge(recentDate, 7);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Account must be older than 7 days for this operation');
      });
    });

    describe('validateEmailUniqueness', () => {
      it('should validate unique email', () => {
        const existingUsers = [
          { email: 'user1@example.com', id: '1' },
          { email: 'user2@example.com', id: '2' }
        ];
        
        const result = UserValidator.validateEmailUniqueness('newuser@example.com', existingUsers);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe('newuser@example.com');
      });

      it('should reject duplicate email', () => {
        const existingUsers = [
          { email: 'user1@example.com', id: '1' },
          { email: 'user2@example.com', id: '2' }
        ];
        
        const result = UserValidator.validateEmailUniqueness('user1@example.com', existingUsers);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Email already exists in the system');
      });

      it('should normalize email case', () => {
        const existingUsers = [
          { email: 'User1@Example.com', id: '1' }
        ];
        
        const result = UserValidator.validateEmailUniqueness('user1@example.com', existingUsers);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Email already exists in the system');
      });
    });

    describe('validatePermission', () => {
      it('should allow admin to access admin operations', () => {
        const result = UserValidator.validatePermission('admin', 'admin', 'delete_user');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should allow user to access user operations', () => {
        const result = UserValidator.validatePermission('user', 'user', 'view_profile');
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject user accessing admin operations', () => {
        const result = UserValidator.validatePermission('user', 'admin', 'delete_user');
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Admin role required for operation: delete_user');
      });
    });
  });

  describe('Invariant Checking', () => {
    const validUser: User = {
      id: 'user1',
      email: 'user@example.com',
      role: 'user',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02')
    };

    describe('validateUserEmailInvariant', () => {
      it('should validate user with valid email', () => {
        const result = UserValidator.validateUserEmailInvariant(validUser);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validUser);
      });

      it('should reject user with empty email', () => {
        const user = { ...validUser, email: '' };
        const result = UserValidator.validateUserEmailInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid email address');
      });

      it('should reject user with invalid email format', () => {
        const user = { ...validUser, email: 'invalid-email' };
        const result = UserValidator.validateUserEmailInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid email address');
      });
    });

    describe('validateUserRoleInvariant', () => {
      it('should validate user with valid role', () => {
        const result = UserValidator.validateUserRoleInvariant(validUser);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validUser);
      });

      it('should reject user with invalid role', () => {
        const user = { ...validUser, role: 'moderator' as any };
        const result = UserValidator.validateUserRoleInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid role (user or admin)');
      });
    });

    describe('validateUserTimestampsInvariant', () => {
      it('should validate user with valid timestamps', () => {
        const result = UserValidator.validateUserTimestampsInvariant(validUser);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validUser);
      });

      it('should reject user with invalid creation timestamp', () => {
        const user = { ...validUser, createdAt: new Date('invalid') };
        const result = UserValidator.validateUserTimestampsInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid creation timestamp');
      });

      it('should reject user with invalid update timestamp', () => {
        const user = { ...validUser, updatedAt: new Date('invalid') };
        const result = UserValidator.validateUserTimestampsInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid update timestamp');
      });

      it('should reject user with update timestamp before creation', () => {
        const user = { 
          ...validUser, 
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-01')
        };
        const result = UserValidator.validateUserTimestampsInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User update timestamp cannot be before creation timestamp');
      });
    });

    describe('validateUserIdInvariant', () => {
      it('should validate user with valid ID', () => {
        const result = UserValidator.validateUserIdInvariant(validUser);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validUser);
      });

      it('should reject user with empty ID', () => {
        const user = { ...validUser, id: '' };
        const result = UserValidator.validateUserIdInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid ID');
      });

      it('should reject user with whitespace-only ID', () => {
        const user = { ...validUser, id: '   ' };
        const result = UserValidator.validateUserIdInvariant(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid ID');
      });
    });

    describe('validateUserInvariants', () => {
      it('should validate user with all valid invariants', () => {
        const result = UserValidator.validateUserInvariants(validUser);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(validUser);
      });

      it('should reject user with invalid ID', () => {
        const user = { ...validUser, id: '' };
        const result = UserValidator.validateUserInvariants(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid ID');
      });

      it('should reject user with invalid email', () => {
        const user = { ...validUser, email: 'invalid' };
        const result = UserValidator.validateUserInvariants(user);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('User must have a valid email address');
      });
    });

    describe('validateUserDeletionInvariant', () => {
      it('should allow deletion of user with no documents', () => {
        const result = UserValidator.validateUserDeletionInvariant(validUser, 0);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject deletion of user with documents', () => {
        const result = UserValidator.validateUserDeletionInvariant(validUser, 5);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Cannot delete user with 5 documents. Please transfer or delete documents first.');
      });
    });

    describe('validateAdminRoleChangeInvariant', () => {
      it('should allow role change for non-only admin', () => {
        const result = UserValidator.validateAdminRoleChangeInvariant(validUser, false);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(true);
      });

      it('should reject role change for only admin', () => {
        const adminUser = { ...validUser, role: 'admin' as const };
        const result = UserValidator.validateAdminRoleChangeInvariant(adminUser, true);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('Cannot change role of the only admin user. Please create another admin first.');
      });
    });
  });
}); 