/**
 * IAuthStrategy Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IAuthStrategy interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IAuthStrategy } from '../../../src/ports/output/IAuthStrategy.js';
import { LoginCredentials, RegisterData, DecodedToken, AuthResult } from '../../../src/ports/output/IAuthHandler.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IAuthStrategy Output Port Interface', () => {
  let mockAuthStrategy: IAuthStrategy;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockAuthStrategy = {
      getStrategyName: (): string => {
        return 'mock-strategy';
      },

      authenticate: async (credentials: LoginCredentials): Promise<AppResult<AuthResult>> => {
        const authResult: AuthResult = {
          token: 'jwt-token-123',
          user: {
            id: 'user123',
            email: credentials.email,
            role: 'user'
          },
          expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        };
        return AppResult.Ok(authResult);
      },

      generateToken: async (payload: any): Promise<AppResult<string>> => {
        const token = 'generated-jwt-token-789';
        return AppResult.Ok(token);
      },

      verifyToken: async (token: string): Promise<AppResult<DecodedToken>> => {
        const decodedToken: DecodedToken = {
          userId: 'user123',
          email: 'test@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        return AppResult.Ok(decodedToken);
      },

      register: async (userData: RegisterData): Promise<AppResult<AuthResult>> => {
        const authResult: AuthResult = {
          token: 'jwt-token-456',
          user: {
            id: 'user456',
            email: userData.email,
            role: userData.role
          },
          expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
        };
        return AppResult.Ok(authResult);
      },

      refreshToken: async (token: string): Promise<AppResult<string>> => {
        const newToken = 'refreshed-jwt-token-999';
        return AppResult.Ok(newToken);
      },

      invalidateToken: async (token: string): Promise<AppResult<void>> => {
        return AppResult.Ok(undefined);
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockAuthStrategy).to.have.property('getStrategyName');
      expect(mockAuthStrategy).to.have.property('authenticate');
      expect(mockAuthStrategy).to.have.property('generateToken');
      expect(mockAuthStrategy).to.have.property('verifyToken');
      expect(mockAuthStrategy).to.have.property('register');
      expect(mockAuthStrategy).to.have.property('refreshToken');
      expect(mockAuthStrategy).to.have.property('invalidateToken');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockAuthStrategy.getStrategyName).to.equal('function');
      expect(typeof mockAuthStrategy.authenticate).to.equal('function');
      expect(typeof mockAuthStrategy.generateToken).to.equal('function');
      expect(typeof mockAuthStrategy.verifyToken).to.equal('function');
      expect(typeof mockAuthStrategy.register).to.equal('function');
      expect(typeof mockAuthStrategy.refreshToken).to.equal('function');
      expect(typeof mockAuthStrategy.invalidateToken).to.equal('function');
    });
  });

  describe('Strategy Information Methods', () => {
    it('should handle getStrategyName', () => {
      const strategyName = mockAuthStrategy.getStrategyName();
      
      expect(typeof strategyName).to.equal('string');
      expect(strategyName).to.equal('mock-strategy');
    });
  });

  describe('Authentication Methods', () => {
    it('should handle authenticate with LoginCredentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result = await mockAuthStrategy.authenticate(credentials);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const authResult = result.unwrap();
      expect(authResult).to.have.property('token');
      expect(authResult).to.have.property('user');
      expect(authResult).to.have.property('expiresAt');
      expect(authResult.user.email).to.equal(credentials.email);
      expect(typeof authResult.token).to.equal('string');
      expect(authResult.expiresAt).to.be.instanceOf(Date);
    });

    it('should handle register with RegisterData', async () => {
      const userData: RegisterData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user'
      };
      
      const result = await mockAuthStrategy.register(userData);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const authResult = result.unwrap();
      expect(authResult).to.have.property('token');
      expect(authResult).to.have.property('user');
      expect(authResult).to.have.property('expiresAt');
      expect(authResult.user.email).to.equal(userData.email);
      expect(authResult.user.role).to.equal(userData.role);
    });

    it('should handle register with admin role', async () => {
      const userData: RegisterData = {
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };
      
      const result = await mockAuthStrategy.register(userData);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const authResult = result.unwrap();
      expect(authResult.user.role).to.equal('admin');
    });
  });

  describe('Token Management Methods', () => {
    it('should handle generateToken with payload', async () => {
      const payload = { userId: 'user123', email: 'test@example.com' };
      
      const result = await mockAuthStrategy.generateToken(payload);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const token = result.unwrap();
      expect(typeof token).to.equal('string');
      expect(token).to.include('generated-jwt-token');
    });

    it('should handle verifyToken with string token', async () => {
      const token = 'jwt-token-123';
      
      const result = await mockAuthStrategy.verifyToken(token);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const decodedToken = result.unwrap();
      expect(decodedToken).to.have.property('userId');
      expect(decodedToken).to.have.property('email');
      expect(decodedToken).to.have.property('role');
      expect(decodedToken).to.have.property('iat');
      expect(decodedToken).to.have.property('exp');
      expect(typeof decodedToken.userId).to.equal('string');
      expect(typeof decodedToken.email).to.equal('string');
      expect(typeof decodedToken.role).to.equal('string');
      expect(typeof decodedToken.iat).to.equal('number');
      expect(typeof decodedToken.exp).to.equal('number');
    });

    it('should handle refreshToken with string token', async () => {
      const token = 'jwt-token-123';
      
      const result = await mockAuthStrategy.refreshToken(token);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const newToken = result.unwrap();
      expect(typeof newToken).to.equal('string');
      expect(newToken).to.not.equal(token);
      expect(newToken).to.include('refreshed-jwt-token');
    });

    it('should handle invalidateToken with string token', async () => {
      const token = 'jwt-token-123';
      
      const result = await mockAuthStrategy.invalidateToken(token);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const invalidateResult = result.unwrap();
      expect(invalidateResult).to.be.undefined;
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept LoginCredentials for authenticate', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = await mockAuthStrategy.authenticate(credentials);
      expect(result.isOk()).to.be.true;
    });

    it('should accept RegisterData for register', async () => {
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const result = await mockAuthStrategy.register(userData);
      expect(result.isOk()).to.be.true;
    });

    it('should accept any parameters for generateToken', async () => {
      const payload = { userId: 'user123' };
      const result = await mockAuthStrategy.generateToken(payload);
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for tokens', async () => {
      const token = 'jwt-token-123';
      
      const verifyResult = await mockAuthStrategy.verifyToken(token);
      const refreshResult = await mockAuthStrategy.refreshToken(token);
      const invalidateResult = await mockAuthStrategy.invalidateToken(token);
      
      expect(verifyResult.isOk()).to.be.true;
      expect(refreshResult.isOk()).to.be.true;
      expect(invalidateResult.isOk()).to.be.true;
    });

    it('should accept different role values for register', async () => {
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const adminData: RegisterData = {
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };
      
      const userResult = await mockAuthStrategy.register(userData);
      const adminResult = await mockAuthStrategy.register(adminData);
      
      expect(userResult.isOk()).to.be.true;
      expect(adminResult.isOk()).to.be.true;
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return AppResult types', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const payload = { userId: 'user123' };
      const token = 'jwt-token-123';
      
      const results = [
        await mockAuthStrategy.authenticate(credentials),
        await mockAuthStrategy.register(userData),
        await mockAuthStrategy.generateToken(payload),
        await mockAuthStrategy.verifyToken(token),
        await mockAuthStrategy.refreshToken(token),
        await mockAuthStrategy.invalidateToken(token)
      ];
      
      results.forEach(result => {
        expect(result).to.be.instanceOf(AppResult);
      });
    });

    it('should return correct generic types', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const payload = { userId: 'user123' };
      const token = 'jwt-token-123';
      
      const authenticateResult = await mockAuthStrategy.authenticate(credentials);
      const registerResult = await mockAuthStrategy.register(userData);
      const generateResult = await mockAuthStrategy.generateToken(payload);
      const verifyResult = await mockAuthStrategy.verifyToken(token);
      const refreshResult = await mockAuthStrategy.refreshToken(token);
      const invalidateResult = await mockAuthStrategy.invalidateToken(token);
      
      expect(authenticateResult.unwrap()).to.have.property('token');
      expect(registerResult.unwrap()).to.have.property('token');
      expect(typeof generateResult.unwrap()).to.equal('string');
      expect(verifyResult.unwrap()).to.have.property('userId');
      expect(typeof refreshResult.unwrap()).to.equal('string');
      expect(invalidateResult.unwrap()).to.be.undefined;
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const payload = { userId: 'user123' };
      const token = 'jwt-token-123';
      
      const methods = [
        mockAuthStrategy.authenticate(credentials),
        mockAuthStrategy.register(userData),
        mockAuthStrategy.generateToken(payload),
        mockAuthStrategy.verifyToken(token),
        mockAuthStrategy.refreshToken(token),
        mockAuthStrategy.invalidateToken(token)
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

  describe('Interface Data Structures', () => {
    it('should handle LoginCredentials structure', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      expect(credentials).to.have.property('email');
      expect(credentials).to.have.property('password');
      expect(typeof credentials.email).to.equal('string');
      expect(typeof credentials.password).to.equal('string');
      
      const result = await mockAuthStrategy.authenticate(credentials);
      expect(result.isOk()).to.be.true;
    });

    it('should handle RegisterData structure', async () => {
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      
      expect(userData).to.have.property('email');
      expect(userData).to.have.property('password');
      expect(userData).to.have.property('role');
      expect(typeof userData.email).to.equal('string');
      expect(typeof userData.password).to.equal('string');
      expect(['user', 'admin']).to.include(userData.role);
      
      const result = await mockAuthStrategy.register(userData);
      expect(result.isOk()).to.be.true;
    });

    it('should handle DecodedToken structure', async () => {
      const token = 'jwt-token-123';
      const result = await mockAuthStrategy.verifyToken(token);
      
      const decodedToken = result.unwrap();
      expect(decodedToken).to.have.property('userId');
      expect(decodedToken).to.have.property('email');
      expect(decodedToken).to.have.property('role');
      expect(decodedToken).to.have.property('iat');
      expect(decodedToken).to.have.property('exp');
    });

    it('should handle AuthResult structure', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = await mockAuthStrategy.authenticate(credentials);
      
      const authResult = result.unwrap();
      expect(authResult).to.have.property('token');
      expect(authResult).to.have.property('user');
      expect(authResult).to.have.property('expiresAt');
      expect(authResult.user).to.have.property('id');
      expect(authResult.user).to.have.property('email');
      expect(authResult.user).to.have.property('role');
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedStrategy: IAuthStrategy & { additionalMethod?: () => void } = {
        ...mockAuthStrategy,
        additionalMethod: () => {}
      };
      
      expect(extendedStrategy.authenticate).to.be.a('function');
      expect(extendedStrategy.register).to.be.a('function');
      expect(extendedStrategy.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication operations that may fail', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete adapter tests
      
      expect(mockAuthStrategy.getStrategyName).to.be.a('function');
      expect(mockAuthStrategy.authenticate).to.be.a('function');
      expect(mockAuthStrategy.register).to.be.a('function');
      expect(mockAuthStrategy.generateToken).to.be.a('function');
      expect(mockAuthStrategy.verifyToken).to.be.a('function');
      expect(mockAuthStrategy.refreshToken).to.be.a('function');
      expect(mockAuthStrategy.invalidateToken).to.be.a('function');
      
      // Verify that the methods return promises (except getStrategyName)
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const payload = { userId: 'user123' };
      const token = 'jwt-token-123';
      
      const authenticatePromise = mockAuthStrategy.authenticate(credentials);
      const registerPromise = mockAuthStrategy.register(userData);
      const generatePromise = mockAuthStrategy.generateToken(payload);
      const verifyPromise = mockAuthStrategy.verifyToken(token);
      const refreshPromise = mockAuthStrategy.refreshToken(token);
      const invalidatePromise = mockAuthStrategy.invalidateToken(token);
      
      expect(authenticatePromise).to.be.instanceOf(Promise);
      expect(registerPromise).to.be.instanceOf(Promise);
      expect(generatePromise).to.be.instanceOf(Promise);
      expect(verifyPromise).to.be.instanceOf(Promise);
      expect(refreshPromise).to.be.instanceOf(Promise);
      expect(invalidatePromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        authenticatePromise,
        registerPromise,
        generatePromise,
        verifyPromise,
        refreshPromise,
        invalidatePromise
      ]);
    });
  });
});
