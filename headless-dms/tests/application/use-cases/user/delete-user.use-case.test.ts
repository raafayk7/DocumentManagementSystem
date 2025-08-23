import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { DeleteUserUseCase } from '../../../../src/application/use-cases/user/DeleteUserUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import type { DeleteUserRequest } from '../../../../src/shared/dto/user/DeleteUserRequest.js';


describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: DeleteUserRequest;

  beforeEach(() => {
    // Create mocks
    mockUserApplicationService = {
      deleteUser: sinon.stub(),
      createUser: sinon.stub(),
      authenticateUser: sinon.stub(),
      getUsers: sinon.stub(),
      getUserById: sinon.stub(),
      changeUserRole: sinon.stub(),
      changeUserPassword: sinon.stub(),
      validateUserCredentials: sinon.stub(),
      getUserByEmail: sinon.stub(),
      getUsersByRole: sinon.stub()
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
      logResponse: sinon.stub()
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
      logResponse: sinon.stub()
    };

    // Register mocks in container
    container.registerInstance('IUserApplicationService', mockUserApplicationService);
    container.registerInstance('ILogger', mockLogger);

    // Create use case instance
    useCase = container.resolve(DeleteUserUseCase);

    // Setup test request
    mockRequest = {
      currentUserId: 'admin-user-id',
      userId: 'target-user-id'
    };
  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('execute', () => {
    it('should successfully delete a user', async () => {
      // Arrange
      const deletedUser = User.create(
        Email.create('deleted@example.com').unwrap().value,
        Password.create('StrongP@55w0rd!').unwrap().value,
        UserRole.create('user').unwrap().value
      );

      mockUserApplicationService.deleteUser.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.success).to.be.true;
      expect(response.message).to.include('target-user-id');
      expect(response.message).to.include('deleted successfully');

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing delete user use case',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User deleted successfully',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id' 
        }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.deleteUser.calledWith(
        'admin-user-id',
        'target-user-id'
      )).to.be.true;
    });

    it('should return InvalidOperation error when deletion fails', async () => {
      // Arrange
      mockUserApplicationService.deleteUser.resolves(AppResult.Err(new Error('User not found')));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('InvalidOperation');
      expect(result.unwrapErr().message).to.include('User deletion failed for user ID: target-user-id');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User deletion failed',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id' 
        }
      )).to.be.true;
    });

    it('should return Generic error when database connection fails', async () => {
      // Arrange
      mockUserApplicationService.deleteUser.rejects(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute delete user use case for user ID: target-user-id');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id' 
        }
      )).to.be.true;
    });

    it('should create child logger with correct context', async () => {
      // Arrange
      mockUserApplicationService.deleteUser.resolves(AppResult.Ok(undefined));

      // Act
      await useCase.execute(mockRequest);

      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'DeleteUserUseCase' })).to.be.true;
    });

    it('should handle edge case with empty user IDs', async () => {
      // Arrange
      const emptyRequest = {
        currentUserId: '',
        userId: 'target-user-id'
      };

      mockUserApplicationService.deleteUser.resolves(AppResult.Err(new Error('Invalid user ID')));

      // Act
      const result = await useCase.execute(emptyRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.deleteUser.calledWith('', 'target-user-id')).to.be.true;
    });

    it('should handle edge case with target user ID empty', async () => {
      // Arrange
      const emptyTargetRequest = {
        currentUserId: 'admin-user-id',
        userId: ''
      };

      mockUserApplicationService.deleteUser.resolves(AppResult.Err(new Error('Invalid target user ID')));

      // Act
      const result = await useCase.execute(emptyTargetRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.deleteUser.calledWith('admin-user-id', '')).to.be.true;
    });

    it('should handle deletion with special characters in user IDs', async () => {
      // Arrange
      const specialRequest = {
        currentUserId: 'admin@user#123',
        userId: 'target$user%456'
      };

      const deletedUser = User.create(
        Email.create('special@example.com').unwrap().value,
        Password.create('StrongP@55w0rd!').unwrap().value,
        UserRole.create('user').unwrap().value
      );

      mockUserApplicationService.deleteUser.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(specialRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.deleteUser.calledWith(
        'admin@user#123',
        'target$user%456'
      )).to.be.true;
    });

    it('should handle deletion with very long user IDs', async () => {
      // Arrange
      const longRequest = {
        currentUserId: 'a'.repeat(100),
        userId: 'b'.repeat(100)
      };

      const deletedUser = User.create(
        Email.create('long@example.com').unwrap().value,
        Password.create('StrongP@55w0rd!').unwrap().value,
        UserRole.create('user').unwrap().value
      );

      mockUserApplicationService.deleteUser.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(longRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.deleteUser.calledWith(
        'a'.repeat(100),
        'b'.repeat(100)
      )).to.be.true;
    });

    it('should handle deletion with numeric user IDs', async () => {
      // Arrange
      const numericRequest = {
        currentUserId: '123456789',
        userId: '987654321'
      };

      const deletedUser = User.create(
        Email.create('numeric@example.com').unwrap().value,
        Password.create('Abracadra246!').unwrap().value,
        UserRole.create('admin').unwrap().value
      );

      mockUserApplicationService.deleteUser.resolves(AppResult.Ok(undefined));

      // Act
      const result = await useCase.execute(numericRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.deleteUser.calledWith(
        '123456789',
        '987654321'
      )).to.be.true;
    });
  });
});
