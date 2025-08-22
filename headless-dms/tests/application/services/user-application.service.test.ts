import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { UserApplicationService } from '../../../src/application/services/UserApplicationService.js';
import { User } from '../../../src/domain/entities/User.js';
import { UserDomainService, UserActivityScore, UserPermission, UserStateValidation } from '../../../src/domain/services/UserDomainService.js';
import { AuthDomainService, SecurityValidation, PasswordStrength } from '../../../src/domain/services/AuthDomainService.js';
import type { IUserRepository } from '../../../src/ports/output/IUserRepository.js';
import type { ILogger, LogContext } from '../../../src/ports/output/ILogger.js';
import { PaginationOutput } from '../../../src/shared/dto/common/pagination.dto.js';

describe('UserApplicationService', () => {
  let userService: UserApplicationService;
  let mockUserRepository: sinon.SinonStubbedInstance<IUserRepository>;
  let mockUserDomainService: sinon.SinonStubbedInstance<UserDomainService>;
  let mockAuthDomainService: sinon.SinonStubbedInstance<AuthDomainService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockAdminUser: User;
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
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger as ILogger)
    };

    // Create mock user entities
    mockUser = {
      id: 'test-user-id',
      email: { value: 'test@example.com' },
      passwordHash: 'hashedPassword123',
      role: { value: 'user' },
      createdAt: new Date(),
      updatedAt: new Date(),
      verifyPassword: sinon.stub().resolves(true),
      changePassword: sinon.stub(),
      changeRole: sinon.stub(),
      serialize: sinon.stub().returns({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } as unknown as User;

    mockAdminUser = {
      id: 'admin-user-id',
      email: { value: 'admin@example.com' },
      passwordHash: 'hashedPassword123',
      role: { value: 'admin' },
      createdAt: new Date(),
      updatedAt: new Date(),
      verifyPassword: sinon.stub().resolves(true),
      changePassword: sinon.stub(),
      changeRole: sinon.stub(),
      serialize: sinon.stub().returns({
        id: 'admin-user-id',
        email: 'admin@example.com',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } as unknown as User;

    // Register mocks in container
    container.clearInstances();
    container.registerInstance('IUserRepository', mockUserRepository);
    container.registerInstance('UserDomainService', mockUserDomainService);
    container.registerInstance('AuthDomainService', mockAuthDomainService);
    container.registerInstance('ILogger', mockLogger);

    // Create service instance
    userService = new UserApplicationService(
      mockUserRepository,
      mockUserDomainService,
      mockAuthDomainService,
      mockLogger
    );
  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('createUser', () => {
    const email = 'newuser@example.com';
    const password = 'validPassword123!';
    const role = 'user';

    it('should successfully create a new user', async () => {
      // Arrange
      const mockNewUser = { 
        ...mockUser, 
        id: 'new-user-id',
        email: { value: 'newuser@example.com' },
        role: { value: 'user' }
      };
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 80,
        level: 'strong',
        issues: [],
        recommendations: []
      } as PasswordStrength);
      mockUserRepository.findByEmail.resolves(null);
      
      // Mock User.create to succeed
      const originalCreate = User.create;
      const mockCreate = sinon.stub().resolves(AppResult.Ok(mockNewUser));
      User.create = mockCreate;
      
      mockUserRepository.insert.resolves(Result.Ok(mockNewUser as User));
      mockUserDomainService.validateUserState.returns({
        isValid: true,
        issues: [],
        recommendations: []
      } as UserStateValidation);

      // Act
      const result = await userService.createUser(email, password, role);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockNewUser);
      expect(mockCreate.calledOnceWith(email, password, role)).to.be.true;
      expect(mockAuthDomainService.validatePasswordStrength.calledOnceWith(password)).to.be.true;
      expect(mockUserRepository.findByEmail.calledOnceWith(email)).to.be.true;
      expect(mockUserRepository.insert.calledOnce).to.be.true;
      // Basic logging check - just verify info was called
      expect(mockChildLogger.info.called).to.be.true;

      // Restore original method
      User.create = originalCreate;
    });

    it('should return error for weak password', async () => {
      // Arrange
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 20,
        level: 'weak',
        issues: ['Too short', 'Missing special characters'],
        recommendations: ['Increase length', 'Add special characters']
      } as PasswordStrength);

      // Act
      const result = await userService.createUser(email, password, role);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Password does not meet security requirements');
      expect(mockChildLogger.warn.calledWith('Weak password detected', { email, score: 20 })).to.be.true;
    });

    it('should return error when user already exists', async () => {
      // Arrange
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 80,
        level: 'strong',
        issues: [],
        recommendations: []
      } as PasswordStrength);
      mockUserRepository.findByEmail.resolves(mockUser);

      // Act
      const result = await userService.createUser(email, password, role);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('User with this email already exists');
      expect(mockChildLogger.warn.calledWith('User already exists', { email })).to.be.true;
    });

    it('should return error when user entity creation fails', async () => {
      // Arrange
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 80,
        level: 'strong',
        issues: [],
        recommendations: []
      } as PasswordStrength);
      mockUserRepository.findByEmail.resolves(null);
      // Mock User.create to fail
      const originalCreate = User.create;
      User.create = sinon.stub().resolves(AppResult.Err(AppError.Generic('Invalid email format')));

      // Act
      const result = await userService.createUser(email, password, role);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Failed to create user entity');

      // Restore original method
      User.create = originalCreate;
    });

    it('should return error when repository insert fails', async () => {
      // Arrange
      const mockNewUser = { ...mockUser, id: 'new-user-id' };
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 80,
        level: 'strong',
        issues: [],
        recommendations: []
      } as PasswordStrength);
      mockUserRepository.findByEmail.resolves(null);
      
      // Mock User.create to succeed
      const originalCreate = User.create;
      const mockCreate = sinon.stub().resolves(AppResult.Ok(mockNewUser));
      User.create = mockCreate;
      
      mockUserRepository.insert.resolves(Result.Err(new Error('Database error')));

      // Act
      const result = await userService.createUser(email, password, role);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Failed to save user');
      expect(mockChildLogger.error.calledWith('Failed to save user', { email, error: 'Database error' })).to.be.true;

      // Restore original method
      User.create = originalCreate;
    });
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

      // Act
      const result = await userService.authenticateUser(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUser);
      expect(mockUserRepository.findByEmail.calledOnceWith(email)).to.be.true;
      expect((mockUser.verifyPassword as sinon.SinonStub).calledOnceWith(password)).to.be.true;
      expect(mockChildLogger.info.calledWith('User authentication attempt', { userId: 'unknown', email })).to.be.true;
      expect(mockChildLogger.info.calledWith('User authenticated successfully', { userId: 'test-user-id', email })).to.be.true;
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await userService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('User not found with email');
    });

    it('should return error when password is invalid', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(false);

      // Act
      const result = await userService.authenticateUser(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include('Invalid password for user');
      expect(mockChildLogger.warn.calledWith('Invalid password for user', { email })).to.be.true;
    });

    it('should log warning for high risk users but continue authentication', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validateUserSecurity.returns({
        isValid: true,
        issues: ['Multiple failed attempts'],
        recommendations: ['Enable 2FA'],
        riskLevel: 'high'
      } as SecurityValidation);

      // Act
      const result = await userService.authenticateUser(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockChildLogger.warn.calledWith('High risk user authentication', {
        userId: 'test-user-id',
        riskLevel: 'high'
      })).to.be.true;
    });
  });

  describe('changeUserPassword', () => {
    const userId = 'test-user-id';
    const currentPassword = 'oldPassword123!';
    const newPassword = 'newPassword123!';

    it('should successfully change user password', async () => {
      // Arrange
      const updatedUser = { ...mockUser, passwordHash: 'newHashedPassword' };
      mockUserRepository.findById.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 85,
        level: 'strong',
        issues: [],
        recommendations: []
      } as PasswordStrength);
      (mockUser.changePassword as sinon.SinonStub).resolves(AppResult.Ok(updatedUser));
      mockUserRepository.update.resolves(Result.Ok(updatedUser as User));

      // Act
      const result = await userService.changeUserPassword(userId, currentPassword, newPassword);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(updatedUser);
      expect(mockUserRepository.findById.calledOnceWith(userId)).to.be.true;
      expect((mockUser.verifyPassword as sinon.SinonStub).calledOnceWith(currentPassword)).to.be.true;
      expect(mockAuthDomainService.validatePasswordStrength.calledOnceWith(newPassword)).to.be.true;
      expect((mockUser.changePassword as sinon.SinonStub).calledOnceWith(newPassword)).to.be.true;
      expect(mockUserRepository.update.calledOnceWith(updatedUser)).to.be.true;
      expect(mockChildLogger.info.calledWith('User password changed successfully', { userId })).to.be.true;
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.resolves(null);

      // Act
      const result = await userService.changeUserPassword(userId, currentPassword, newPassword);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('User not found with id');
      expect(mockChildLogger.warn.calledWith('User not found for password change', { userId })).to.be.true;
    });

    it('should return error when current password is incorrect', async () => {
      // Arrange
      mockUserRepository.findById.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(false);

      // Act
      const result = await userService.changeUserPassword(userId, currentPassword, newPassword);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include('Current password is incorrect');
      expect(mockChildLogger.warn.calledWith('Invalid current password', { userId })).to.be.true;
    });

    it('should return error when new password is weak', async () => {
      // Arrange
      mockUserRepository.findById.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(true);
      mockAuthDomainService.validatePasswordStrength.returns({
        score: 15,
        level: 'weak',
        issues: ['Too short', 'Missing uppercase'],
        recommendations: ['Increase length', 'Add uppercase']
      } as PasswordStrength);

      // Act
      const result = await userService.changeUserPassword(userId, currentPassword, newPassword);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('New password does not meet security requirements');
      expect(mockChildLogger.warn.calledWith('Weak new password', { userId, score: 15 })).to.be.true;
    });
  });

  describe('changeUserRole', () => {
    const currentUserId = 'admin-user-id';
    const targetUserId = 'test-user-id';
    const newRole = 'admin';

    it('should successfully change user role', async () => {
      // Arrange
      const updatedUser = { ...mockUser, role: { value: 'admin' } };
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockUser);
      mockUserDomainService.canUserChangeRole.returns(true);
      (mockUser.changeRole as sinon.SinonStub).returns(AppResult.Ok(updatedUser));
      mockUserRepository.update.resolves(Result.Ok(updatedUser as User));

      // Act
      const result = await userService.changeUserRole(currentUserId, targetUserId, newRole);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(updatedUser);
      expect(mockUserRepository.findById.calledWith(currentUserId)).to.be.true;
      expect(mockUserRepository.findById.calledWith(targetUserId)).to.be.true;
      expect(mockUserDomainService.canUserChangeRole.calledOnceWith(mockAdminUser, mockUser, newRole)).to.be.true;
      expect((mockUser.changeRole as sinon.SinonStub).calledOnceWith(newRole)).to.be.true;
      expect(mockUserRepository.update.calledOnceWith(updatedUser as User)).to.be.true;
      expect(mockChildLogger.info.calledWith('User role changed successfully', { targetUserId, newRole })).to.be.true;
    });

    it('should return error when current user not found', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(null);

      // Act
      const result = await userService.changeUserRole(currentUserId, targetUserId, newRole);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('Current user not found with id');
      expect(mockChildLogger.warn.calledWith('Current user not found', { currentUserId })).to.be.true;
    });

    it('should return error when target user not found', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(null);

      // Act
      const result = await userService.changeUserRole(currentUserId, targetUserId, newRole);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('Target user not found with id');
      expect(mockChildLogger.warn.calledWith('Target user not found', { targetUserId })).to.be.true;
    });

    it('should return error when role change not permitted', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockUser);
      mockUserDomainService.canUserChangeRole.returns(false);

      // Act
      const result = await userService.changeUserRole(currentUserId, targetUserId, newRole);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include('Role change not permitted');
      expect(mockChildLogger.warn.calledWith('Role change not permitted', { currentUserId, targetUserId, newRole })).to.be.true;
    });
  });

  describe('getUserById', () => {
    const userId = 'test-user-id';

    it('should successfully get user by ID', async () => {
      // Arrange
      mockUserRepository.findById.resolves(mockUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUser);
      expect(mockUserRepository.findById.calledOnceWith(userId)).to.be.true;
      expect(mockChildLogger.info.calledWith('User retrieval by ID', { userId })).to.be.true;
      expect(mockChildLogger.info.calledWith('User retrieved successfully', { userId })).to.be.true;
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findById.resolves(null);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('User not found with id');
    });
  });

  describe('getUserByEmail', () => {
    const email = 'test@example.com';

    it('should successfully get user by email', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUser);
      expect(mockUserRepository.findByEmail.calledOnceWith(email)).to.be.true;
      expect(mockChildLogger.info.calledWith('User retrieval by email', { userId: 'unknown', email })).to.be.true;
      expect(mockChildLogger.info.calledWith('User retrieved successfully', { userId: 'test-user-id', email })).to.be.true;
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await userService.getUserByEmail(email);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('User not found with email');
    });
  });

  describe('getUsers', () => {
    const page = 1;
    const limit = 10;
    const sortBy = 'createdAt';
    const sortOrder = 'desc' as const;
    const filters = { email: 'test@example.com', role: 'user' as const };

    it('should successfully get users with filters', async () => {
      // Arrange
      const mockUsers = [mockUser, mockAdminUser];
      const mockPaginationResult = {
        data: mockUsers,
        pagination: { page, limit, total: 2, totalPages: 1 }
      };
      mockUserRepository.find.resolves(mockPaginationResult as PaginationOutput<User>);

      // Act
      const result = await userService.getUsers(page, limit, sortBy, sortOrder, filters);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUsers);
      expect(mockUserRepository.find.calledOnceWith(filters, { page, limit, order: sortOrder, sort: sortBy })).to.be.true;
      expect(mockChildLogger.info.calledWith('Getting users with filters', { page, limit, sortBy, sortOrder, filters })).to.be.true;
      expect(mockChildLogger.info.calledWith('Users retrieved successfully', { count: 2, page, limit, filtersApplied: 2 })).to.be.true;
    });

    it('should successfully get users without filters', async () => {
      // Arrange
      const mockUsers = [mockUser, mockAdminUser];
      const mockPaginationResult = {
        data: mockUsers,
        pagination: { page, limit, total: 2, totalPages: 1 }
      };
      mockUserRepository.find.resolves(mockPaginationResult as PaginationOutput<User>);

      // Act
      const result = await userService.getUsers(page, limit, sortBy, sortOrder);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUsers);
      expect(mockUserRepository.find.calledOnceWith({}, { page, limit, order: sortOrder, sort: sortBy })).to.be.true;
    });

    it('should return error when repository find fails', async () => {
      // Arrange
      mockUserRepository.find.rejects(new Error('Database error'));

      // Act
      const result = await userService.getUsers(page, limit, sortBy, sortOrder, filters);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Failed to get users');
      expect(mockChildLogger.error.calledWith('Database error', { page, limit, filters })).to.be.true;
    });
  });

  describe('getUsersByRole', () => {
    const role = 'user' as const;

    it('should successfully get users by role', async () => {
      // Arrange
      const mockUsers = [mockUser];
      mockUserRepository.findByRole.resolves(mockUsers);

      // Act
      const result = await userService.getUsersByRole(role);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.equal(mockUsers);
      expect(mockUserRepository.findByRole.calledOnceWith(role)).to.be.true;
      expect(mockChildLogger.info.calledWith('Getting users by role', { role })).to.be.true;
      expect(mockChildLogger.info.calledWith('Users retrieved successfully', { role, count: 1 })).to.be.true;
    });

    it('should return error when repository findByRole fails', async () => {
      // Arrange
      mockUserRepository.findByRole.rejects(new Error('Database error'));

      // Act
      const result = await userService.getUsersByRole(role);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Failed to get users by role');
      expect(mockChildLogger.error.calledWith('Database error', { role })).to.be.true;
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
      const result = await userService.validateUserCredentials(email, password);

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
      const result = await userService.validateUserCredentials(email, password);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.false;
      expect(mockChildLogger.info.calledWith('User credentials validated', { email, isValid: false })).to.be.true;
    });

    it('should return error when user not found', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(null);

      // Act
      const result = await userService.validateUserCredentials(email, password);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('User not found with email');
      expect(mockChildLogger.warn.calledWith('User not found for credential validation', { email })).to.be.true;
    });
  });

  describe('deleteUser', () => {
    const currentUserId = 'admin-user-id';
    const targetUserId = 'test-user-id';

    it('should successfully delete user', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockUser);
      mockUserDomainService.canUserPerformAction.returns(true);
      mockUserRepository.delete.resolves(true);

      // Act
      const result = await userService.deleteUser(currentUserId, targetUserId);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.be.undefined;
      expect(mockUserRepository.findById.calledWith(currentUserId)).to.be.true;
      expect(mockUserRepository.findById.calledWith(targetUserId)).to.be.true;
      expect(mockUserDomainService.canUserPerformAction.calledOnceWith(mockAdminUser, 'delete', 'user')).to.be.true;
      expect(mockUserRepository.delete.calledOnceWith(targetUserId)).to.be.true;
      expect(mockChildLogger.info.calledWith('User deleted successfully', { targetUserId })).to.be.true;
    });

    it('should return error when current user not found', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(null);

      // Act
      const result = await userService.deleteUser(currentUserId, targetUserId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('Current user not found with id');
      expect(mockChildLogger.warn.calledWith('Current user not found for deletion', { currentUserId })).to.be.true;
    });

    it('should return error when target user not found', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(null);

      // Act
      const result = await userService.deleteUser(currentUserId, targetUserId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
      expect(error.message).to.include('Target user not found with id');
      expect(mockChildLogger.warn.calledWith('Target user not found for deletion', { targetUserId })).to.be.true;
    });

    it('should return error when deletion not permitted', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockUser);
      mockUserDomainService.canUserPerformAction.returns(false);

      // Act
      const result = await userService.deleteUser(currentUserId, targetUserId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include('User deletion not permitted');
      expect(mockChildLogger.warn.calledWith('User deletion not permitted', { currentUserId, targetUserId })).to.be.true;
    });

    it('should return error when attempting self-deletion', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockAdminUser);
      mockUserDomainService.canUserPerformAction.returns(true);

      // Act
      const result = await userService.deleteUser(currentUserId, currentUserId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Unauthorized');
      expect(error.message).to.include('Self-deletion is not allowed');
      expect(mockChildLogger.warn.calledWith('Attempted self-deletion', { userId: currentUserId })).to.be.true;
    });

    it('should return error when repository delete fails', async () => {
      // Arrange
      mockUserRepository.findById.withArgs(currentUserId).resolves(mockAdminUser);
      mockUserRepository.findById.withArgs(targetUserId).resolves(mockUser);
      mockUserDomainService.canUserPerformAction.returns(true);
      mockUserRepository.delete.resolves(false);

      // Act
      const result = await userService.deleteUser(currentUserId, targetUserId);

      // Assert
      expect(result.isErr()).to.be.true;
      const error = result.unwrapErr();
      expect(error.status).to.equal('Generic');
      expect(error.message).to.include('Failed to delete user');
      expect(mockChildLogger.warn.calledWith('Failed to delete user', { targetUserId })).to.be.true;
    });
  });

  describe('Dependency Injection', () => {
    it('should properly inject all dependencies', () => {
      // Assert
      expect(userService).to.be.instanceOf(UserApplicationService);
      expect((userService as any).userRepository).to.equal(mockUserRepository);
      expect((userService as any).userDomainService).to.equal(mockUserDomainService);
      expect((userService as any).authDomainService).to.equal(mockAuthDomainService);
      expect((userService as any).logger).to.equal(mockChildLogger);
    });

    it('should create child logger with service context', () => {
      // Assert
      expect((mockLogger.child as sinon.SinonStub).calledWith({ service: 'UserApplicationService' })).to.be.true;
    });
  });

  describe('AppResult Pattern Usage', () => {
    it('should return AppResult.Ok for successful operations', async () => {
      // Arrange
      mockUserRepository.findById.resolves(mockUser);

      // Act
      const result = await userService.getUserById('test-user-id');

      // Assert
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isOk()).to.be.true;
    });

    it('should return AppResult.Err for failed operations', async () => {
      // Arrange
      mockUserRepository.findById.resolves(null);

      // Act
      const result = await userService.getUserById('test-user-id');

      // Assert
      expect(result).to.be.instanceOf(AppResult);
      expect(result.isErr()).to.be.true;
    });
  });

  describe('Error Handling Patterns', () => {
    it('should use proper AppError status codes', async () => {
      // Arrange
      mockUserRepository.findById.resolves(null);

      // Act
      const result = await userService.getUserById('test-user-id');

      // Assert
      const error = result.unwrapErr();
      expect(error.status).to.equal('NotFound');
    });

    it('should provide descriptive error messages', async () => {
      // Arrange
      mockUserRepository.findById.resolves(null);

      // Act
      const result = await userService.getUserById('test-user-id');

      // Assert
      const error = result.unwrapErr();
      expect(error.message).to.include('User not found with id: test-user-id');
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      mockUserRepository.findById.rejects('Unknown error type');

      // Act
      const result = await userService.getUserById('test-user-id');

      // Assert
      const error = result.unwrapErr();
      expect(error.message).to.include('Failed to get user with id: test-user-id');
    });
  });

  describe('Logging Patterns', () => {
    it('should log successful operations', async () => {
      // Arrange
      mockUserRepository.findById.resolves(mockUser);

      // Act
      await userService.getUserById('test-user-id');

      // Assert
      expect(mockChildLogger.info.calledWith('User retrieval by ID', { userId: 'test-user-id' })).to.be.true;
      expect(mockChildLogger.info.calledWith('User retrieved successfully', { userId: 'test-user-id' })).to.be.true;
    });

    it('should log warnings for validation issues', async () => {
      // Arrange
      mockUserRepository.findByEmail.resolves(mockUser);
      (mockUser.verifyPassword as sinon.SinonStub).resolves(false);

      // Act
      await userService.authenticateUser('test@example.com', 'wrongpassword');

      // Assert
      expect(mockChildLogger.warn.calledWith('Invalid password for user', { email: 'test@example.com' })).to.be.true;
    });

    it('should log errors with context', async () => {
      // Arrange
      mockUserRepository.findById.rejects(new Error('Database error'));

      // Act
      await userService.getUserById('test-user-id');

      // Assert
      expect(mockChildLogger.error.calledWith('Database error', { userId: 'test-user-id' })).to.be.true;
    });
  });
});
