import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { ChangeUserRoleUseCase } from '../../../../src/application/use-cases/user/ChangeUserRoleUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { ChangeUserRoleRequest, ChangeUserRoleResponse } from '../../../../src/shared/dto/user/index.js';

describe('ChangeUserRoleUseCase', () => {
  let useCase: ChangeUserRoleUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockRequest: ChangeUserRoleRequest;

  beforeEach(() => {
    // Create mock instances
    mockUserApplicationService = {
      authenticateUser: sinon.stub(),
      createUser: sinon.stub(),
      getUserById: sinon.stub(),
      getUsers: sinon.stub(),
      changeUserRole: sinon.stub(),
      deleteUser: sinon.stub(),
      changeUserPassword: sinon.stub(),
      validateUserCredentials: sinon.stub(),
      getUserByEmail: sinon.stub(),
      getUsersByRole: sinon.stub()
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

    // Create mock user entity
    mockUser = {
      id: 'target-user-id',
      email: { value: 'target@example.com' } as Email,
      password: { value: 'hashed-password' } as Password,
      role: { value: 'user' } as UserRole,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'target-user-id',
        email: 'target@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as User;

    // Create mock request
    mockRequest = {
      currentUserId: 'admin-user-id',
      userId: 'target-user-id',
      newRole: 'admin'
    };

    // Create use case instance
    useCase = new ChangeUserRoleUseCase(
      mockUserApplicationService as IUserApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully change user role and return success response', async () => {
      // Arrange
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.deep.equal({
        success: true,
        message: 'User role changed successfully to admin'
      });

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing change user role use case',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id', 
          newRole: 'admin' 
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User role changed successfully',
        { 
          userId: 'target-user-id', 
          oldRole: 'user', 
          newRole: 'admin' 
        }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.changeUserRole.calledWith(
        'admin-user-id',
        'target-user-id',
        'admin'
      )).to.be.true;
    });

    it('should return InvalidOperation error when role change fails', async () => {
      // Arrange
      const roleChangeError = AppError.InvalidOperation('User does not have permission to change roles');
      const userResult = Result.Err(roleChangeError);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Err(roleChangeError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('InvalidOperation');
      expect(result.unwrapErr().message).to.include('User role change failed for user ID: target-user-id to role: admin');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User role change failed',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id', 
          newRole: 'admin' 
        }
      )).to.be.true;
    });

    it('should return Generic error when an exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockUserApplicationService.changeUserRole.rejects(error);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute change user role use case for user ID: target-user-id');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { 
          currentUserId: 'admin-user-id', 
          userId: 'target-user-id', 
          newRole: 'admin' 
        }
      )).to.be.true;
    });



    it('should handle role change from user to admin', async () => {
      // Arrange
      const userToAdminRequest = { ...mockRequest, newRole: 'admin' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(userToAdminRequest as ChangeUserRoleRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().message).to.equal('User role changed successfully to admin');
    });

    it('should handle role change from admin to user', async () => {
      // Arrange
      const adminToUserRequest = { ...mockRequest, newRole: 'user' };
      const adminUser = { ...mockUser, role: { value: 'admin' } as UserRole };
      const userResult = Result.Ok(adminUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(adminUser as unknown as User));

      // Act
      const result = await useCase.execute(adminToUserRequest as ChangeUserRoleRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().message).to.equal('User role changed successfully to user');
    });

    it('should handle empty currentUserId in request', async () => {
      // Arrange
      const emptyCurrentUserIdRequest = { ...mockRequest, currentUserId: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyCurrentUserIdRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserRole.calledWith('', 'target-user-id', 'admin')).to.be.true;
    });

    it('should handle empty userId in request', async () => {
      // Arrange
      const emptyUserIdRequest = { ...mockRequest, userId: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyUserIdRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserRole.calledWith('admin-user-id', '', 'admin')).to.be.true;
    });

    it('should create child logger with correct context', () => {
      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'ChangeUserRoleUseCase' })).to.be.true;
    });

    it('should handle user with different initial role', async () => {
      // Arrange
      const moderatorUser = { ...mockUser, role: { value: 'moderator' } as unknown as UserRole };
      const userResult = Result.Ok(moderatorUser);
      mockUserApplicationService.changeUserRole.resolves(AppResult.Ok(moderatorUser as unknown as User));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User role changed successfully',
        { 
          userId: 'target-user-id', 
          oldRole: 'moderator', 
          newRole: 'admin' 
        }
      )).to.be.true;
    });
  });
});
