import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { AuthHandler } from '../../../../src/adapters/secondary/auth/implementations/AuthHandler.js';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';
import { User } from '../../../../src/domain/entities/User.js';
import { AppResultTestUtils } from '../../../shared/test-helpers.js';

describe('AuthHandler Adapter', () => {
  let authHandler: AuthHandler;
  let mockAuthStrategy: any;
  let mockUserRepository: any;
  let mockLogger: any;
  let mockUser: any;

  beforeEach(() => {
    // Create mock user
    mockUser = User.fromRepository({
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).unwrap();

    // Add the missing methods that AuthHandler expects
    (mockUser as any).changePassword = sinon.stub().resolves(Result.Ok(mockUser));
    (mockUser as any).changeRole = sinon.stub().returns(Result.Ok(mockUser));

    // Create mock auth strategy
    mockAuthStrategy = {
      authenticate: sinon.stub(),
      register: sinon.stub(),
      verifyToken: sinon.stub(),
      generateToken: sinon.stub(),
      getStrategyName: sinon.stub().returns('MockStrategy'),
    };

    // Create mock user repository
    mockUserRepository = {
      findById: sinon.stub(),
      existsBy: sinon.stub(),
      insert: sinon.stub(),
      update: sinon.stub(),
      saveUser: sinon.stub(),
    };

    // Create mock child logger that will be returned by parent.child()
    const mockChildLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub(),
      logError: sinon.stub(),
    };

    // Create mock logger
    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      debug: sinon.stub(),
      error: sinon.stub(),
      logError: sinon.stub(),
      child: sinon.stub().returns(mockChildLogger),
    };

    // Store reference to child logger for test assertions
    (mockLogger as any).childLogger = mockChildLogger;

    // Create AuthHandler instance with mocked dependencies
    authHandler = new AuthHandler(mockAuthStrategy, mockUserRepository, mockLogger);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should create AuthHandler instance', () => {
      expect(authHandler).to.be.instanceOf(AuthHandler);
    });

    it('should set up child logger with service context', () => {
      expect(mockLogger.child.callCount).to.equal(1);
      expect(mockLogger.child.firstCall.args[0]).to.deep.equal({ service: 'AuthHandler' });
    });
  });

  describe('login()', () => {
    it('should authenticate user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const authResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      mockAuthStrategy.authenticate.resolves(Result.Ok(authResult));

      const result = await authHandler.login(credentials);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const loginResult = result.unwrap();
        expect(loginResult.user.id).to.equal('user-123');
        expect(loginResult.token).to.equal('jwt-token-123');
      }

      expect(mockAuthStrategy.authenticate.callCount).to.equal(1);
      expect(mockAuthStrategy.authenticate.firstCall.args[0]).to.deep.equal(credentials);
      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      // First call: Authentication attempt
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Authentication attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        email: 'test@example.com',
        strategy: 'MockStrategy',
      });
      // Second call: Authentication successful
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('Authentication successful');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        userId: 'user-123',
        email: { _value: 'test@example.com' },
      });
    });

    it('should return error when authentication fails', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const authError = new Error('Invalid credentials');
      mockAuthStrategy.authenticate.resolves(Result.Err(authError));

      const result = await authHandler.login(credentials);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.equal('Invalid credentials');
      }

      expect(mockLogger.childLogger.warn.callCount).to.equal(1);
      expect(mockLogger.childLogger.warn.firstCall.args[0]).to.equal('Authentication failed');
      expect(mockLogger.childLogger.warn.firstCall.args[1]).to.deep.equal({
        email: 'test@example.com',
        error: 'Invalid credentials',
      });
    });

    it('should handle authentication strategy errors gracefully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthStrategy.authenticate.rejects(new Error('Strategy error'));

      const result = await authHandler.login(credentials);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Strategy error');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ email: 'test@example.com' });
    });

    it('should log authentication attempt', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthStrategy.authenticate.resolves(Result.Ok({
        user: mockUser,
        token: 'jwt-token-123',
      }));

      await authHandler.login(credentials);

      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Authentication attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        email: 'test@example.com',
        strategy: 'MockStrategy',
      });
    });
  });

  describe('register()', () => {
    it('should register user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user' as const,
      };

      const authResult = {
        user: mockUser,
        token: 'jwt-token-123',
      };

      mockAuthStrategy.register.resolves(Result.Ok(authResult));

      const result = await authHandler.register(userData);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const user = result.unwrap();
        expect(user.id).to.equal('user-123');
        expect((user as any).email.value).to.equal('test@example.com');
        expect((user as any).role.value).to.equal('user');
      }

      expect(mockAuthStrategy.register.callCount).to.equal(1);
      expect(mockAuthStrategy.register.firstCall.args[0]).to.deep.equal(userData);
      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      // First call: Registration attempt
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Registration attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        email: 'newuser@example.com',
        strategy: 'MockStrategy',
      });
      // Second call: Registration successful
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('Registration successful');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        userId: 'user-123',
        email: { _value: 'test@example.com' },
      });
    });

    it('should return error when registration fails', async () => {
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        role: 'user' as const,
      };

      const registrationError = new Error('User already exists');
      mockAuthStrategy.register.resolves(Result.Err(registrationError));

      const result = await authHandler.register(userData);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.equal('User already exists');
      }

      expect(mockLogger.childLogger.warn.callCount).to.equal(1);
      expect(mockLogger.childLogger.warn.firstCall.args[0]).to.equal('Registration failed');
      expect(mockLogger.childLogger.warn.firstCall.args[1]).to.deep.equal({
        email: 'existing@example.com',
        error: 'User already exists',
      });
    });

    it('should handle registration strategy errors gracefully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user' as const,
      };

      mockAuthStrategy.register.rejects(new Error('Strategy error'));

      const result = await authHandler.register(userData);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Strategy error');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ email: 'newuser@example.com' });
    });

    it('should log registration attempt', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'password123',
        role: 'user' as const,
      };

      mockAuthStrategy.register.resolves(Result.Ok({
        user: mockUser,
        token: 'jwt-token-123',
      }));

      await authHandler.register(userData);

      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Registration attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        email: 'newuser@example.com',
        strategy: 'MockStrategy',
      });
    });
  });

  describe('validateToken()', () => {
    it('should validate token successfully', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockAuthStrategy.verifyToken.resolves(Result.Ok(decodedToken));

      const result = await authHandler.validateToken(token);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const tokenData = result.unwrap();
        expect(tokenData.userId).to.equal('user-123');
        expect(tokenData.email).to.equal('test@example.com');
      }

      expect(mockAuthStrategy.verifyToken.callCount).to.equal(1);
      expect(mockAuthStrategy.verifyToken.firstCall.args[0]).to.equal(token);
      expect(mockLogger.childLogger.debug.callCount).to.equal(2);
      // First call: Token validation attempt
      expect(mockLogger.childLogger.debug.firstCall.args[0]).to.equal('Token validation attempt');
      expect(mockLogger.childLogger.debug.firstCall.args[1]).to.deep.equal({
        strategy: 'MockStrategy',
      });
      // Second call: Token validation successful
      expect(mockLogger.childLogger.debug.secondCall.args[0]).to.equal('Token validation successful');
      expect(mockLogger.childLogger.debug.secondCall.args[1]).to.deep.equal({
        userId: 'user-123',
      });
    });

    it('should return error when token validation fails', async () => {
      const token = 'invalid-jwt-token';
      const validationError = new Error('Token expired');
      mockAuthStrategy.verifyToken.resolves(Result.Err(validationError));

      const result = await authHandler.validateToken(token);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error.message).to.equal('Token expired');
      }

      expect(mockLogger.childLogger.warn.callCount).to.equal(1);
      expect(mockLogger.childLogger.warn.firstCall.args[0]).to.equal('Token validation failed');
      expect(mockLogger.childLogger.warn.firstCall.args[1]).to.deep.equal({
        error: 'Token expired',
      });
    });

    it('should handle token validation strategy errors gracefully', async () => {
      const token = 'malformed-token';
      mockAuthStrategy.verifyToken.rejects(new Error('Strategy error'));

      const result = await authHandler.validateToken(token);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Strategy error');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ token: 'malformed-token...' });
    });

    it('should log token validation attempt', async () => {
      const token = 'valid-jwt-token';
      const decodedToken = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };

      mockAuthStrategy.verifyToken.resolves(Result.Ok(decodedToken));

      await authHandler.validateToken(token);

      expect(mockLogger.childLogger.debug.callCount).to.equal(2);
      expect(mockLogger.childLogger.debug.firstCall.args[0]).to.equal('Token validation attempt');
      expect(mockLogger.childLogger.debug.firstCall.args[1]).to.deep.equal({
        strategy: 'MockStrategy',
      });
    });
  });

  describe('changeUserPassword()', () => {
    it('should change user password successfully', async () => {
      const userId = 'user-123';
      const newPassword = 'new-password-123';

      mockUserRepository.findById.resolves(mockUser);
      mockUserRepository.saveUser.resolves(mockUser);

      const result = await authHandler.changeUserPassword(userId, newPassword);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const user = result.unwrap();
        expect(user.id).to.equal('user-123');
      }

      expect(mockUserRepository.findById.callCount).to.equal(1);
      expect(mockUserRepository.findById.firstCall.args[0]).to.equal(userId);
      expect(mockUserRepository.saveUser.callCount).to.equal(1);
      expect(mockUserRepository.saveUser.firstCall.args[0]).to.be.an('object');
      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      // First call: Password change attempt
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Password change attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        userId: 'user-123',
        strategy: 'MockStrategy',
      });
      // Second call: Password change successful
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('Password change successful');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        userId: 'user-123',
      });
    });

    it('should return error when user not found', async () => {
      const userId = 'nonexistent-user';
      const newPassword = 'new-password-123';

      mockUserRepository.findById.resolves(null);

      const result = await authHandler.changeUserPassword(userId, newPassword);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.include('User not found');
      }

      expect(mockLogger.childLogger.warn.callCount).to.equal(1);
      expect(mockLogger.childLogger.warn.firstCall.args[0]).to.equal('Password change failed - user not found');
      expect(mockLogger.childLogger.warn.firstCall.args[1]).to.deep.equal({
        userId: 'nonexistent-user',
      });
    });

    it('should handle password change errors gracefully', async () => {
      const userId = 'user-123';
      const newPassword = 'new-password-123';

      mockUserRepository.findById.resolves(mockUser);
      mockUserRepository.saveUser.rejects(new Error('Database error'));

      const result = await authHandler.changeUserPassword(userId, newPassword);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Database error');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ userId: 'user-123' });
    });
  });

  describe('changeUserRole()', () => {
    it('should change user role successfully', async () => {
      const userId = 'user-123';
      const newRole = 'admin';

      mockUserRepository.findById.resolves(mockUser);
      mockUserRepository.saveUser.resolves(mockUser);

      const result = await authHandler.changeUserRole(userId, newRole);

      expect(result.isOk()).to.be.true;
      if (result.isOk()) {
        const user = result.unwrap();
        expect(user.id).to.equal('user-123');
      }

      expect(mockUserRepository.findById.callCount).to.equal(1);
      expect(mockUserRepository.findById.firstCall.args[0]).to.equal(userId);
      expect(mockUserRepository.saveUser.callCount).to.equal(1);
      expect(mockUserRepository.saveUser.firstCall.args[0]).to.be.an('object');
      expect(mockLogger.childLogger.info.callCount).to.equal(2);
      // First call: Role change attempt
      expect(mockLogger.childLogger.info.firstCall.args[0]).to.equal('Role change attempt');
      expect(mockLogger.childLogger.info.firstCall.args[1]).to.deep.equal({
        userId: 'user-123',
        newRole: 'admin',
        strategy: 'MockStrategy',
      });
      // Second call: Role change successful
      expect(mockLogger.childLogger.info.secondCall.args[0]).to.equal('Role change successful');
      expect(mockLogger.childLogger.info.secondCall.args[1]).to.deep.equal({
        userId: 'user-123',
        newRole: 'admin',
      });
    });

    it('should return error when user not found', async () => {
      const userId = 'nonexistent-user';
      const newRole = 'admin';

      mockUserRepository.findById.resolves(null);

      const result = await authHandler.changeUserRole(userId, newRole);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.include('User not found');
      }

      expect(mockLogger.childLogger.warn.callCount).to.equal(1);
      expect(mockLogger.childLogger.warn.firstCall.args[0]).to.equal('Role change failed - user not found');
      expect(mockLogger.childLogger.warn.firstCall.args[1]).to.deep.equal({
        userId: 'nonexistent-user',
      });
    });

    it('should handle role change errors gracefully', async () => {
      const userId = 'user-123';
      const newRole = 'admin';

      mockUserRepository.findById.resolves(mockUser);
      mockUserRepository.saveUser.rejects(new Error('Database error'));

      const result = await authHandler.changeUserRole(userId, newRole);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
        expect(error.message).to.equal('Database error');
      }

      expect(mockLogger.childLogger.logError.callCount).to.equal(1);
      expect(mockLogger.childLogger.logError.firstCall.args[0]).to.be.instanceOf(Error);
      expect(mockLogger.childLogger.logError.firstCall.args[1]).to.deep.equal({ userId: 'user-123', newRole: 'admin' });
    });
  });

  describe('getStrategyName()', () => {
    it('should return strategy name', () => {
      const strategyName = authHandler.getStrategyName();
      expect(strategyName).to.equal('MockStrategy');
      expect(mockAuthStrategy.getStrategyName.callCount).to.equal(1);
    });
  });

  describe('Hexapp Integration', () => {
    it('should return AppResult types', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthStrategy.authenticate.resolves(Result.Ok({
        user: mockUser,
        token: 'jwt-token-123',
      }));

      const result = await authHandler.login(credentials);
      
      // Should return AppResult<T> from hexapp
      expect(result).to.have.property('isOk');
      expect(result).to.have.property('isErr');
      expect(result).to.have.property('unwrap');
      expect(result).to.have.property('unwrapErr');
    });

    it('should use AppError for error handling', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      mockAuthStrategy.authenticate.rejects(new Error('Strategy error'));

      const result = await authHandler.login(credentials);

      expect(result.isErr()).to.be.true;
      if (result.isErr()) {
        const error = result.unwrapErr();
        expect(error).to.be.instanceOf(AppError);
      }
    });
  });
});
