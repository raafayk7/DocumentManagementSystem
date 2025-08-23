/**
 * IUserApplicationService Input Port Interface Tests
 * 
 * Tests the contract and method signatures of the IUserApplicationService interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IUserApplicationService } from '../../../src/ports/input/IUserApplicationService.js';
import { User } from '../../../src/domain/entities/User.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IUserApplicationService Input Port Interface', () => {
  let mockService: IUserApplicationService;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockService = {
      createUser: async (email: string, password: string, role?: 'user' | 'admin'): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      authenticateUser: async (email: string, password: string): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      validateUserCredentials: async (email: string, password: string): Promise<AppResult<boolean>> => {
        return AppResult.Ok(true);
      },

      changeUserPassword: async (userId: string, currentPassword: string, newPassword: string): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      changeUserRole: async (currentUserId: string, targetUserId: string, newRole: 'user' | 'admin'): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      getUserById: async (userId: string): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      getUserByEmail: async (email: string): Promise<AppResult<User>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return userResult;
      },

      getUsers: async (
        page?: number,
        limit?: number,
        sortBy?: string,
        sortOrder?: 'asc' | 'desc',
        filters?: {
          search?: string;
          email?: string;
          role?: 'user' | 'admin';
        }
      ): Promise<AppResult<User[]>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok([userResult.unwrap()]);
      },

      getUsersByRole: async (role: 'user' | 'admin'): Promise<AppResult<User[]>> => {
        const userResult = User.fromRepository({
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        return AppResult.Ok([userResult.unwrap()]);
      },

      deleteUser: async (currentUserId: string, targetUserId: string): Promise<AppResult<void>> => {
        return AppResult.Ok(undefined);
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockService).to.have.property('createUser');
      expect(mockService).to.have.property('authenticateUser');
      expect(mockService).to.have.property('validateUserCredentials');
      expect(mockService).to.have.property('changeUserPassword');
      expect(mockService).to.have.property('changeUserRole');
      expect(mockService).to.have.property('getUserById');
      expect(mockService).to.have.property('getUserByEmail');
      expect(mockService).to.have.property('getUsers');
      expect(mockService).to.have.property('getUsersByRole');
      expect(mockService).to.have.property('deleteUser');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockService.createUser).to.equal('function');
      expect(typeof mockService.authenticateUser).to.equal('function');
      expect(typeof mockService.validateUserCredentials).to.equal('function');
      expect(typeof mockService.changeUserPassword).to.equal('function');
      expect(typeof mockService.changeUserRole).to.equal('function');
      expect(typeof mockService.getUserById).to.equal('function');
      expect(typeof mockService.getUserByEmail).to.equal('function');
      expect(typeof mockService.getUsers).to.equal('function');
      expect(typeof mockService.getUsersByRole).to.equal('function');
      expect(typeof mockService.deleteUser).to.equal('function');
    });
  });

  describe('User Management Methods', () => {
    it('should handle createUser with required parameters', async () => {
      const result = await mockService.createUser('test@example.com', 'password123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.be.instanceOf(User);
    });

    it('should handle createUser with optional role parameter', async () => {
      const result = await mockService.createUser('test@example.com', 'password123', 'admin');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle changeUserPassword with all parameters', async () => {
      const result = await mockService.changeUserPassword('user123', 'oldpass', 'newpass');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle changeUserRole with all parameters', async () => {
      const result = await mockService.changeUserRole('admin123', 'user456', 'admin');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle deleteUser with both user IDs', async () => {
      const result = await mockService.deleteUser('admin123', 'user456');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('User Retrieval Methods', () => {
    it('should handle getUserById with string parameter', async () => {
      const result = await mockService.getUserById('user123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.be.instanceOf(User);
    });

    it('should handle getUserByEmail with string parameter', async () => {
      const result = await mockService.getUserByEmail('test@example.com');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.be.instanceOf(User);
    });

    it('should handle getUsers with no parameters', async () => {
      const result = await mockService.getUsers();
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const users = result.unwrap();
      expect(Array.isArray(users)).to.be.true;
    });

    it('should handle getUsers with all parameters', async () => {
      const result = await mockService.getUsers(1, 10, 'email', 'asc', { search: 'test', role: 'user' });
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should handle getUsersByRole with role parameter', async () => {
      const result = await mockService.getUsersByRole('admin');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const users = result.unwrap();
      expect(Array.isArray(users)).to.be.true;
    });
  });

  describe('Authentication Methods', () => {
    it('should handle authenticateUser with email and password', async () => {
      const result = await mockService.authenticateUser('test@example.com', 'password123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.be.instanceOf(User);
    });

    it('should handle validateUserCredentials with email and password', async () => {
      const result = await mockService.validateUserCredentials('test@example.com', 'password123');
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const isValid = result.unwrap();
      expect(typeof isValid).to.equal('boolean');
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for IDs', async () => {
      const result = await mockService.getUserById('user123');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for emails', async () => {
      const result = await mockService.getUserByEmail('test@example.com');
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for passwords', async () => {
      const result = await mockService.validateUserCredentials('test@example.com', 'password123');
      expect(result.isOk()).to.be.true;
    });

    it('should accept role union types', async () => {
      const userResult = await mockService.createUser('test@example.com', 'password123', 'user');
      const adminResult = await mockService.createUser('admin@example.com', 'password123', 'admin');
      
      expect(userResult.isOk()).to.be.true;
      expect(adminResult.isOk()).to.be.true;
    });

    it('should accept optional parameters', async () => {
      const result1 = await mockService.getUsers();
      const result2 = await mockService.getUsers(1);
      const result3 = await mockService.getUsers(1, 10);
      
      expect(result1.isOk()).to.be.true;
      expect(result2.isOk()).to.be.true;
      expect(result3.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const results = [
        await mockService.createUser('test@example.com', 'password123'),
        await mockService.getUserById('user123'),
        await mockService.getUsers(),
        await mockService.authenticateUser('test@example.com', 'password123')
      ];
      
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });

    it('should return correct generic types', async () => {
      const userResult = await mockService.getUserById('user123');
      const usersResult = await mockService.getUsers();
      const voidResult = await mockService.deleteUser('admin123', 'user456');
      
      expect(userResult.unwrap()).to.be.instanceOf(User);
      expect(Array.isArray(usersResult.unwrap())).to.be.true;
      expect(voidResult.unwrap()).to.be.undefined;
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const methods = [
        mockService.createUser('test@example.com', 'password123'),
        mockService.getUserById('user123'),
        mockService.getUsers(),
        mockService.authenticateUser('test@example.com', 'password123'),
        mockService.validateUserCredentials('test@example.com', 'password123')
      ];
      
      methods.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      const results = await Promise.all(methods);
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedService: IUserApplicationService & { additionalMethod?: () => void } = {
        ...mockService,
        additionalMethod: () => {}
      };
      
      expect(extendedService.createUser).to.be.a('function');
      expect(extendedService.getUserById).to.be.a('function');
      expect(extendedService.additionalMethod).to.be.a('function');
    });
  });
});
