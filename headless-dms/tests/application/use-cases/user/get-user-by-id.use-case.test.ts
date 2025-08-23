import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { GetUserByIdUseCase } from '../../../../src/application/use-cases/user/GetUserByIdUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import type { GetUserByIdRequest } from '../../../../src/shared/dto/user/GetUserByIdRequest.js';

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: GetUserByIdRequest;

  beforeEach(() => {
    // Create mocks
    mockUserApplicationService = {
      getUserById: sinon.stub(),
      createUser: sinon.stub(),
      authenticateUser: sinon.stub(),
      getUsers: sinon.stub(),
      deleteUser: sinon.stub(),
      changeUserRole: sinon.stub(),
      changeUserPassword: sinon.stub(),
      validateUserCredentials: sinon.stub(),
      getUserByEmail: sinon.stub(),
      getUsersByRole: sinon.stub(),
    };

    mockChildLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger as ILogger),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
    };

    mockLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      child: sinon.stub<[LogContext], ILogger>().returns(mockChildLogger as ILogger),
      log: sinon.stub(),
      logError: sinon.stub(),
      logRequest: sinon.stub(),
      logResponse: sinon.stub(),
    };

    // Register mocks in container
    container.registerInstance('IUserApplicationService', mockUserApplicationService);
    container.registerInstance('ILogger', mockLogger);

    // Create use case instance
    useCase = container.resolve(GetUserByIdUseCase);

    // Setup test request
    mockRequest = {
      userId: 'test-user-id'
    };
  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('execute', () => {
    it('should successfully retrieve a user by ID', async () => {
      // Arrange
      const mockUser = User.fromRepository({
        id: 'test-user-id',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUserById.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.user).to.exist;
      expect(response.user.id).to.equal(mockUser.id);
      expect(response.user.email).to.equal('test@example.com');
      expect(response.user.role).to.equal('user');
      expect(response.user.createdAt).to.equal(mockUser.createdAt);
      expect(response.user.updatedAt).to.equal(mockUser.updatedAt);

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing get user by ID use case',
        { userId: 'test-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User retrieved successfully',
        { userId: mockUser.id, email: 'test@example.com' }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.getUserById.calledWith('test-user-id')).to.be.true;
    });

    it('should return NotFound error when user does not exist', async () => {
      // Arrange
      mockUserApplicationService.getUserById.resolves(AppResult.Err(AppError.NotFound('User not found')));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('NotFound');
      expect(result.unwrapErr().message).to.include('User not found with ID: test-user-id');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User not found',
        { userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should return Generic error when database connection fails', async () => {
      // Arrange
      mockUserApplicationService.getUserById.rejects(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute get user by ID use case for user ID: test-user-id');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should create child logger with correct context', async () => {
      // Arrange
      mockUserApplicationService.getUserById.resolves(AppResult.Ok(
        User.fromRepository({
          id: 'test-user-id',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        }).unwrap()
      ));

      // Act
      await useCase.execute(mockRequest);

      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'GetUserByIdUseCase' })).to.be.true;
    });

    it('should handle edge case with empty user ID', async () => {
      // Arrange
      const emptyRequest = { userId: '' };
      mockUserApplicationService.getUserById.resolves(AppResult.Err(AppError.InvalidData('Invalid user ID')));

      // Act
      const result = await useCase.execute(emptyRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.getUserById.calledWith('')).to.be.true;
    });

    it('should handle admin user retrieval', async () => {
      // Arrange
      const adminUser = User.fromRepository({
        id: 'admin-user-id',
        email: 'admin@example.com',
        passwordHash: 'hashedpassword',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      const adminRequest = { userId: 'admin-user-id' };
      mockUserApplicationService.getUserById.resolves(AppResult.Ok(adminUser));

      // Act
      const result = await useCase.execute(adminRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.user.email).to.equal('admin@example.com');
      expect(response.user.role).to.equal('admin');
      expect(mockUserApplicationService.getUserById.calledWith('admin-user-id')).to.be.true;
    });

    it('should handle admin user retrieval with different email', async () => {
      // Arrange
      const adminUser = User.fromRepository({
        id: 'admin2-user-id',
        email: 'admin2@example.com',
        passwordHash: 'hashedpassword',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      const adminRequest = { userId: 'admin2-user-id' };
      mockUserApplicationService.getUserById.resolves(AppResult.Ok(adminUser));

      // Act
      const result = await useCase.execute(adminRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.user.email).to.equal('admin2@example.com');
      expect(response.user.role).to.equal('admin');
      expect(mockUserApplicationService.getUserById.calledWith('admin2-user-id')).to.be.true;
    });

    it('should handle user with complex email', async () => {
      // Arrange
      const complexEmailUser = User.fromRepository({
        id: 'complex-email-user-id',
        email: 'user+tag@example.co.uk',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUserById.resolves(AppResult.Ok(complexEmailUser));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.user.email).to.equal('user+tag@example.co.uk');
      expect(mockUserApplicationService.getUserById.calledWith('test-user-id')).to.be.true;
    });

    it('should handle user ID with special characters', async () => {
      // Arrange
      const specialRequest = { userId: 'user@123#456' };
      const user = User.fromRepository({
        id: 'user@123#456',
        email: 'special@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUserById.resolves(AppResult.Ok(user));

      // Act
      const result = await useCase.execute(specialRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.getUserById.calledWith('user@123#456')).to.be.true;
    });

    it('should handle user ID with very long length', async () => {
      // Arrange
      const longUserId = 'a'.repeat(100);
      const longRequest = { userId: longUserId };
      const user = User.fromRepository({
        id: longUserId,
        email: 'long@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUserById.resolves(AppResult.Ok(user));

      // Act
      const result = await useCase.execute(longRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.getUserById.calledWith(longUserId)).to.be.true;
    });

    it('should handle numeric user ID', async () => {
      // Arrange
      const numericRequest = { userId: '123456789' };
      const user = User.fromRepository({
        id: '123456789',
        email: 'numeric@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUserById.resolves(AppResult.Ok(user));

      // Act
      const result = await useCase.execute(numericRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.getUserById.calledWith('123456789')).to.be.true;
    });
  });
});
