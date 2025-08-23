/**
 * IAuthHandler Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IAuthHandler interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IAuthHandler, LoginCredentials, RegisterData, DecodedToken, AuthResult } from '../../../src/ports/output/IAuthHandler.js';
import { AppResult } from '@carbonteq/hexapp';

describe('IAuthHandler Output Port Interface', () => {
  let mockAuthHandler: IAuthHandler;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockAuthHandler = {
      login: async (credentials: LoginCredentials): Promise<AppResult<AuthResult>> => {
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

      register: async (userData: RegisterData): Promise<AppResult<{ id: string; email: string; role: string }>> => {
        const user = {
          id: 'user123',
          email: userData.email,
          role: userData.role
        };
        return AppResult.Ok(user);
      },

      validateToken: async (token: string): Promise<AppResult<DecodedToken>> => {
        const decodedToken: DecodedToken = {
          userId: 'user123',
          email: 'test@example.com',
          role: 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600
        };
        return AppResult.Ok(decodedToken);
      },

      refreshToken: async (token: string): Promise<AppResult<string>> => {
        const newToken = 'new-jwt-token-456';
        return AppResult.Ok(newToken);
      },

      logout: async (token: string): Promise<AppResult<void>> => {
        return AppResult.Ok(undefined);
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockAuthHandler).to.have.property('login');
      expect(mockAuthHandler).to.have.property('register');
      expect(mockAuthHandler).to.have.property('validateToken');
      expect(mockAuthHandler).to.have.property('refreshToken');
      expect(mockAuthHandler).to.have.property('logout');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockAuthHandler.login).to.equal('function');
      expect(typeof mockAuthHandler.register).to.equal('function');
      expect(typeof mockAuthHandler.validateToken).to.equal('function');
      expect(typeof mockAuthHandler.refreshToken).to.equal('function');
      expect(typeof mockAuthHandler.logout).to.equal('function');
    });
  });

  describe('Authentication Methods', () => {
    it('should handle login with LoginCredentials', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const result = await mockAuthHandler.login(credentials);
      
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
      
      const result = await mockAuthHandler.register(userData);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user).to.have.property('id');
      expect(user).to.have.property('email');
      expect(user).to.have.property('role');
      expect(user.email).to.equal(userData.email);
      expect(user.role).to.equal(userData.role);
    });

    it('should handle register with admin role', async () => {
      const userData: RegisterData = {
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin'
      };
      
      const result = await mockAuthHandler.register(userData);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const user = result.unwrap();
      expect(user.role).to.equal('admin');
    });
  });

  describe('Token Management Methods', () => {
    it('should handle validateToken with string token', async () => {
      const token = 'jwt-token-123';
      
      const result = await mockAuthHandler.validateToken(token);
      
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
      
      const result = await mockAuthHandler.refreshToken(token);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const newToken = result.unwrap();
      expect(typeof newToken).to.equal('string');
      expect(newToken).to.not.equal(token);
    });

    it('should handle logout with string token', async () => {
      const token = 'jwt-token-123';
      
      const result = await mockAuthHandler.logout(token);
      
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
      
      const logoutResult = result.unwrap();
      expect(logoutResult).to.be.undefined;
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept LoginCredentials for login', async () => {
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const result = await mockAuthHandler.login(credentials);
      expect(result.isOk()).to.be.true;
    });

    it('should accept RegisterData for register', async () => {
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const result = await mockAuthHandler.register(userData);
      expect(result.isOk()).to.be.true;
    });

    it('should accept string parameters for tokens', async () => {
      const token = 'jwt-token-123';
      
      const validateResult = await mockAuthHandler.validateToken(token);
      const refreshResult = await mockAuthHandler.refreshToken(token);
      const logoutResult = await mockAuthHandler.logout(token);
      
      expect(validateResult.isOk()).to.be.true;
      expect(refreshResult.isOk()).to.be.true;
      expect(logoutResult.isOk()).to.be.true;
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
      
      const userResult = await mockAuthHandler.register(userData);
      const adminResult = await mockAuthHandler.register(adminData);
      
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
      const token = 'jwt-token-123';
      
      const results = [
        await mockAuthHandler.login(credentials),
        await mockAuthHandler.register(userData),
        await mockAuthHandler.validateToken(token),
        await mockAuthHandler.refreshToken(token),
        await mockAuthHandler.logout(token)
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
      const token = 'jwt-token-123';
      
      const loginResult = await mockAuthHandler.login(credentials);
      const registerResult = await mockAuthHandler.register(userData);
      const validateResult = await mockAuthHandler.validateToken(token);
      const refreshResult = await mockAuthHandler.refreshToken(token);
      const logoutResult = await mockAuthHandler.logout(token);
      
      expect(loginResult.unwrap()).to.have.property('token');
      expect(registerResult.unwrap()).to.have.property('id');
      expect(validateResult.unwrap()).to.have.property('userId');
      expect(typeof refreshResult.unwrap()).to.equal('string');
      expect(logoutResult.unwrap()).to.be.undefined;
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
      const token = 'jwt-token-123';
      
      const methods = [
        mockAuthHandler.login(credentials),
        mockAuthHandler.register(userData),
        mockAuthHandler.validateToken(token),
        mockAuthHandler.refreshToken(token),
        mockAuthHandler.logout(token)
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
      
      const result = await mockAuthHandler.login(credentials);
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
      
      const result = await mockAuthHandler.register(userData);
      expect(result.isOk()).to.be.true;
    });

    it('should handle DecodedToken structure', async () => {
      const token = 'jwt-token-123';
      const result = await mockAuthHandler.validateToken(token);
      
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
      const result = await mockAuthHandler.login(credentials);
      
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
      const extendedHandler: IAuthHandler & { additionalMethod?: () => void } = {
        ...mockAuthHandler,
        additionalMethod: () => {}
      };
      
      expect(extendedHandler.login).to.be.a('function');
      expect(extendedHandler.register).to.be.a('function');
      expect(extendedHandler.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication operations that may fail', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete adapter tests
      
      expect(mockAuthHandler.login).to.be.a('function');
      expect(mockAuthHandler.register).to.be.a('function');
      expect(mockAuthHandler.validateToken).to.be.a('function');
      expect(mockAuthHandler.refreshToken).to.be.a('function');
      expect(mockAuthHandler.logout).to.be.a('function');
      
      // Verify that the methods return promises
      const credentials: LoginCredentials = {
        email: 'test@example.com',
        password: 'password123'
      };
      const userData: RegisterData = {
        email: 'test@example.com',
        password: 'password123',
        role: 'user'
      };
      const token = 'jwt-token-123';
      
      const loginPromise = mockAuthHandler.login(credentials);
      const registerPromise = mockAuthHandler.register(userData);
      const validatePromise = mockAuthHandler.validateToken(token);
      const refreshPromise = mockAuthHandler.refreshToken(token);
      const logoutPromise = mockAuthHandler.logout(token);
      
      expect(loginPromise).to.be.instanceOf(Promise);
      expect(registerPromise).to.be.instanceOf(Promise);
      expect(validatePromise).to.be.instanceOf(Promise);
      expect(refreshPromise).to.be.instanceOf(Promise);
      expect(logoutPromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        loginPromise,
        registerPromise,
        validatePromise,
        refreshPromise,
        logoutPromise
      ]);
    });
  });
});
