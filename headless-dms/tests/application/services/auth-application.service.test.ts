import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';

import { AuthApplicationService } from '../../../src/application/services/AuthApplicationService.js';
import { User } from '../../../src/domain/entities/User.js';
import { AuthDomainService, SecurityValidation } from '../../../src/domain/services/AuthDomainService.js';
import { UserDomainService } from '../../../src/domain/services/UserDomainService.js';
import type { IUserRepository } from '../../../src/ports/output/IUserRepository.js';
import type { ILogger, LogContext } from '../../../src/ports/output/ILogger.js';

describe('AuthApplicationService', () => {
  let authService: AuthApplicationService;
  let mockUserRepository: sinon.SinonStubbedInstance<IUserRepository>;
  let mockAuthDomainService: sinon.SinonStubbedInstance<AuthDomainService>;
  let mockUserDomainService: sinon.SinonStubbedInstance<UserDomainService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;

  beforeEach(() => {
    // Create mock instances
    mockUserRepository = {
      findByEmail: sinon.stub(),
      findById: sinon.stub(),
      insert: sinon.stub(),
      update: sinon.stub(),
      delete: sinon.stub(),
      find: sinon.stub(),
      findOne: sinon.stub(),
      findByRole: sinon.stub(),
      exists: sinon.stub(),
      count: sinon.stub(),
      saveUser: sinon.stub(),
      fetchAll: sinon.stub(),
      fetchPaginated: sinon.stub(),
      fetchById: sinon.stub(),
      deleteById: sinon.stub(),
      fetchBy: sinon.stub(),
      existsBy: sinon.stub(),
      deleteBy: sinon.stub()
    };

    mockAuthDomainService = {
      validateUserSecurity: sinon.stub(),
      requiresAdditionalAuth: sinon.stub(),
      validatePasswordStrength: sinon.stub(),
      validateAuthAttempt: sinon.stub(),
      validateSession: sinon.stub(),
      calculateTokenExpiration: sinon.stub(),
      canPerformSensitiveOperation: sinon.stub(),
      calculateSecurityRiskScore: sinon.stub()
    };

    mockUserDomainService = {
      canUserPerformAction: sinon.stub(),
      canUserChangeRole: sinon.stub(),
      validateUserState: sinon.stub(),
      calculateUserActivityScore: sinon.stub(),
      canUserAccessDocument: sinon.stub(),
      getUserDocumentPermissions: sinon.stub(),
      calculateUserEngagement: sinon.stub(),
      canUserPerformSystemAction: sinon.stub()
    };

    // Create child logger mock
    mockChildLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
      child: sinon.stub()
    };

    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger)
    };

    // Create a mock user entity
    mockUser = {
      id: 'test-user-id',
      email: { value: 'test@example.com' },
      passwordHash: 'hashedPassword123',
      role: { value: 'user' },
      createdAt: new Date(),
      updatedAt: new Date(),
      verifyPassword: sinon.stub().resolves(true),
      serialize: sinon.stub().returns({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } as unknown as User;

    // Register mocks in container
    container.clearInstances();
    container.registerInstance('IUserRepository', mockUserRepository);
    container.registerInstance('AuthDomainService', mockAuthDomainService);
    container.registerInstance('UserDomainService', mockUserDomainService);
    container.registerInstance('ILogger', mockLogger);

    // Create service instance
    authService = new AuthApplicationService(
      mockUserRepository,
      mockAuthDomainService,
      mockUserDomainService,
      mockLogger
    );
  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('authenticateUser', () => {
    const email = 'test@example.com';
    const password = 'validPassword123!';

    it('should successfully authenticate a valid user', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: [],
        recommendations: [],
        riskLevel: 'low'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(false);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUser);
      expect(mockUserRepository.findByEmail.calledOnceWith(email)).to.be.true;
      expect((mockUser.verifyPassword as sinon.SinonStub).calledOnceWith(password)).to.be.true;
      expect(mockAuthDomainService.validateUserSecurity.calledOnceWith(mockUser)).to.be.true;
      expect(mockAuthDomainService.requiresAdditionalAuth.calledOnceWith(mockUser, 'login')).to.be.true;
      expect(mockChildLogger.info.calledWith('User authenticated successfully', { 
        userId: mockUser.id, 
        email 
      })).to.be.true;
    });

    it('should return Unauthorized error when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include(`Invalid credentials for email: ${email}`);
      expect(mockChildLogger.warn.calledWith('User not found for authentication', { email })).to.be.true;
    });

    it('should return Unauthorized error when password is invalid', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(false);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include(`Invalid credentials for email: ${email}`);
      expect(mockChildLogger.warn.calledWith('Invalid password for user', { email })).to.be.true;
    });

    it('should log warning for high risk users but continue authentication', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: ['Multiple failed login attempts'],
        recommendations: ['Enable 2FA'],
        riskLevel: 'high'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(false);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockChildLogger.warn.calledWith('High risk user authentication', {
        userId: mockUser.id,
        riskLevel: 'high',
        issues: ['Multiple failed login attempts']
      })).to.be.true;
    });

    it('should return Unauthorized error when additional authentication is required', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: [],
        recommendations: [],
        riskLevel: 'medium'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(true);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include(`Additional authentication required for user: ${mockUser.id}`);
      expect(mockChildLogger.warn.calledWith('Additional authentication required', { userId: mockUser.id })).to.be.true;
    });

    it('should return Generic error when repository throws exception', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.rejects(repositoryError);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include(`Failed to authenticate user with email: ${email}`);
      expect(mockChildLogger.error.calledWith('Database connection failed', { email })).to.be.true;
    });

    it('should return Generic error when password verification throws exception', async () => {
      // Arrange
      const passwordError = new Error('Password verification failed');
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).rejects(passwordError);

      // Act
      const result = await authService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include(`Failed to authenticate user with email: ${email}`);
      expect(mockChildLogger.error.calledWith('Password verification failed', { email })).to.be.true;
    });
  });

  describe('validateUserCredentials', () => {
    const email = 'test@example.com';
    const password = 'validPassword123!';

    it('should return true for valid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);

      // Act
      const result = await authService.validateUserCredentials(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.true;
      expect(mockUserRepository.findByEmail.calledOnceWith(email)).to.be.true;
      expect((mockUser.verifyPassword as sinon.SinonStub).calledOnceWith(password)).to.be.true;
      expect(mockChildLogger.info.calledWith('User credentials validated', { email, isValid: true })).to.be.true;
    });

    it('should return false for invalid credentials', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(false);

      // Act
      const result = await authService.validateUserCredentials(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.false;
      expect(mockChildLogger.info.calledWith('User credentials validated', { email, isValid: false })).to.be.true;
    });

    it('should return NotFound error when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await authService.validateUserCredentials(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include(`User not found with email: ${email}`);
      expect(mockChildLogger.warn.calledWith('User not found for credential validation', { email })).to.be.true;
    });

    it('should return Generic error when repository throws exception', async () => {
      // Arrange
      const repositoryError = new Error('Database connection failed');
      mockUserRepository.findByEmail.rejects(repositoryError);

      // Act
      const result = await authService.validateUserCredentials(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include(`Failed to validate user credentials with email: ${email}`);
      expect(mockChildLogger.error.calledWith('Database connection failed', { email })).to.be.true;
    });

    it('should return Generic error when password verification throws exception', async () => {
      // Arrange
      const passwordError = new Error('Password verification failed');
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).rejects(passwordError);

      // Act
      const result = await authService.validateUserCredentials(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error).to.be.instanceOf(AppError);
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include(`Failed to validate user credentials with email: ${email}`);
      expect(mockChildLogger.error.calledWith('Password verification failed', { email })).to.be.true;
    });
  });

  describe('Dependency Injection', () => {
    it('should properly inject all dependencies', () => {
      // Assert
      expect(authService).to.be.instanceOf(AuthApplicationService);
      expect((authService as any).userRepository).to.equal(mockUserRepository);
      expect((authService as any).authDomainService).to.equal(mockAuthDomainService);
      expect((authService as any).userDomainService).to.equal(mockUserDomainService);
      expect((authService as any).logger).to.equal(mockChildLogger);
    });

    it('should create child logger with service context', () => {
      // Assert
      expect((mockLogger.child as sinon.SinonStub).calledWith({ service: 'AuthApplicationService' })).to.be.true;
    });
  });

  describe('AppResult Pattern Usage', () => {
    it('should return AppResult.Ok for successful operations', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: [],
        recommendations: [],
        riskLevel: 'low'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(false);

      // Act
      const result = await authService.authenticateUser('test@example.com', 'password');

      // Assert
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should return AppResult.Err for failed operations', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await authService.authenticateUser('test@example.com', 'password');

      // Assert
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isErr()).to.be.true;
    });
  });

  describe('Error Handling Patterns', () => {
    it('should use proper AppError status codes', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await authService.authenticateUser('test@example.com', 'password');

      // Assert
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
    });

    it('should provide descriptive error messages', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await authService.authenticateUser('test@example.com', 'password');

      // Assert
      const error = result.unwrapErr();
      expect(error.message).to.include('Invalid credentials for email: test@example.com');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const unknownError = 'Unknown error type';
      mockUserRepository.findByEmail.rejects(unknownError);

      // Act
      const result = await authService.authenticateUser('test@example.com', 'password');

      // Assert
      const error = result.unwrapErr();
      expect(error.message).to.include('Failed to authenticate user with email: test@example.com');
    });
  });

  describe('Logging Patterns', () => {
    it('should log successful operations', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: [],
        recommendations: [],
        riskLevel: 'low'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(false);

      // Act
      await authService.authenticateUser('test@example.com', 'password');

      // Assert
      expect(mockChildLogger.info.calledWith('User authenticated successfully', {
        userId: mockUser.id,
        email: 'test@example.com'
      })).to.be.true;
    });

    it('should log warnings for security issues', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: ['Multiple failed attempts'],
        recommendations: ['Enable 2FA'],
        riskLevel: 'high'
      } as SecurityValidation);
      mockAuthDomainService.requiresAdditionalAuth.returns(false);

      // Act
      await authService.authenticateUser('test@example.com', 'password');

      // Assert
      expect(mockChildLogger.warn.calledWith('High risk user authentication', {
        userId: mockUser.id,
        riskLevel: 'high',
        issues: ['Multiple failed attempts']
      })).to.be.true;
    });

    it('should log errors with context', async () => {
      // Arrange
      const repositoryError = new Error('Database error');
      mockUserRepository.findByEmail.rejects(repositoryError);

      // Act
      await authService.authenticateUser('test@example.com', 'password');

      // Assert
      expect(mockChildLogger.error.calledWith('Database error', { email: 'test@example.com' })).to.be.true;
    });
  });
});
