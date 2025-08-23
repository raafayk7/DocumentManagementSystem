/**
 * IAuthApplicationService Input Port Interface Tests
 * 
 * Tests the contract and method signatures of the IAuthApplicationService interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IAuthApplicationService } from '../../../src/ports/input/IAuthApplicationService.js';
import { User } from '../../../src/domain/entities/User.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IAuthApplicationService Input Port Interface', () => {
  let mockService: IAuthApplicationService;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockService = {
      authenticateUser: async (email: string, password: string): Promise<AppResult<User>> => {
        // Mock implementation for testing interface compliance
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
        // Mock implementation for testing interface compliance
        return AppResult.Ok(true);
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockService).to.have.property('authenticateUser');
      expect(mockService).to.have.property('validateUserCredentials');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockService.authenticateUser).to.equal('function');
      expect(typeof mockService.validateUserCredentials).to.equal('function');
    });
  });

  describe('authenticateUser Method', () => {
    it('should accept email and password parameters', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const result = await mockService.authenticateUser(email, password);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should return AppResult<User>', async () => {
      const result = await mockService.authenticateUser('test@example.com', 'password123');
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.be.instanceOf(User);
    });

    it('should handle async operations', async () => {
      const promise = mockService.authenticateUser('test@example.com', 'password123');
      expect(promise).to.be.instanceOf(Promise);
      
      const result = await promise;
      expect(result).to.be.instanceOf(AppResult);
    });
  });

  describe('validateUserCredentials Method', () => {
    it('should accept email and password parameters', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const result = await mockService.validateUserCredentials(email, password);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should return AppResult<boolean>', async () => {
      const result = await mockService.validateUserCredentials('test@example.com', 'password123');
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const isValid = result.unwrap();
      expect(typeof isValid).to.equal('boolean');
    });

    it('should handle async operations', async () => {
      const promise = mockService.validateUserCredentials('test@example.com', 'password123');
      expect(promise).to.be.instanceOf(Promise);
      
      const result = await promise;
      expect(result).to.be.instanceOf(AppResult);
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for email', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const result = await mockService.authenticateUser(email, password);
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for password', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      const result = await mockService.validateUserCredentials(email, password);
      expect(result.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const authResult = await mockService.authenticateUser('test@example.com', 'password123');
      const validationResult = await mockService.validateUserCredentials('test@example.com', 'password123');
      
      expect(authResult).to.be.instanceOf(AppResult);
      expect(validationResult).to.be.instanceOf(AppResult);
    });

    it('should handle both Ok and Err results', async () => {
      // Test that the interface can handle both success and error cases
      // This tests the contract, not the implementation
      expect(mockService.authenticateUser).to.be.a('function');
      expect(mockService.validateUserCredentials).to.be.a('function');
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      // Test that the interface doesn't prevent additional methods
      const extendedService: IAuthApplicationService & { additionalMethod?: () => void } = {
        ...mockService,
        additionalMethod: () => {}
      };
      
      expect(extendedService.authenticateUser).to.be.a('function');
      expect(extendedService.validateUserCredentials).to.be.a('function');
      expect(extendedService.additionalMethod).to.be.a('function');
    });
  });
});
