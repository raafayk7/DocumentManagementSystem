import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { ChangeUserPasswordUseCase } from '../../../../src/application/use-cases/user/ChangeUserPasswordUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { ChangeUserPasswordRequest, ChangeUserPasswordResponse } from '../../../../src/shared/dto/user/index.js';

describe('ChangeUserPasswordUseCase', () => {
  let useCase: ChangeUserPasswordUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockRequest: ChangeUserPasswordRequest;

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
      id: 'test-user-id',
      email: { value: 'test@example.com' } as Email,
      password: { value: 'old-hashed-password' } as Password,
      role: { value: 'user' } as UserRole,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as User;

    // Create mock request
    mockRequest = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword456'
    };

    // Create use case instance
    useCase = new ChangeUserPasswordUseCase(
      mockUserApplicationService as IUserApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully change user password and return success response', async () => {
      // Arrange
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.deep.equal({
        success: true,
        message: 'Password changed successfully'
      });

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing change user password use case',
        { userId: 'test-user-id' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User password changed successfully',
        { userId: 'test-user-id' }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.changeUserPassword.calledWith(
        'test-user-id',
        'oldpassword123',
        'newpassword456'
      )).to.be.true;
    });

    it('should return InvalidOperation error when password change fails', async () => {
      // Arrange
      const passwordChangeError = AppError.InvalidOperation('Current password is incorrect');
      const passwordChangeResult = Result.Err(passwordChangeError);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Err(passwordChangeError));

      // Act
      const result = await useCase.execute('test-user-id', mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('InvalidOperation');
      expect(result.unwrapErr().message).to.equal('Current password is incorrect');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User password change failed',
        { userId: 'test-user-id' }
      )).to.be.true;
    });

    it('should return Generic error when an exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockUserApplicationService.changeUserPassword.rejects(error);

      // Act
      const result = await useCase.execute('test-user-id', mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.equal('Database connection failed');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { userId: 'test-user-id' }
      )).to.be.true;
    });



    it('should handle empty userId in request', async () => {
      // Arrange
      const emptyUserIdRequest = { ...mockRequest };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('', emptyUserIdRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith('', 'oldpassword123', 'newpassword456')).to.be.true;
    });

    it('should handle empty currentPassword in request', async () => {
      // Arrange
      const emptyCurrentPasswordRequest = { ...mockRequest, currentPassword: '' };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', emptyCurrentPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith('test-user-id', '', 'newpassword456')).to.be.true;
    });

    it('should handle empty newPassword in request', async () => {
      // Arrange
      const emptyNewPasswordRequest = { ...mockRequest, newPassword: '' };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', emptyNewPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith('test-user-id', 'oldpassword123', '')).to.be.true;
    });

    it('should create child logger with correct context', () => {
      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'ChangeUserPasswordUseCase' })).to.be.true;
    });

    it('should handle password change with special characters', async () => {
      // Arrange
      const specialCharRequest = {
        ...mockRequest,
        currentPassword: 'old@pass#123',
        newPassword: 'new@pass#456'
      };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', specialCharRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith(
        'test-user-id',
        'old@pass#123',
        'new@pass#456'
      )).to.be.true;
    });

    it('should handle password change with long passwords', async () => {
      // Arrange
      const longPasswordRequest = {
        ...mockRequest,
        currentPassword: 'a'.repeat(100),
        newPassword: 'b'.repeat(100)
      };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', longPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith(
        'test-user-id',
        'a'.repeat(100),
        'b'.repeat(100)
      )).to.be.true;
    });

    it('should handle password change with numeric passwords', async () => {
      // Arrange
      const numericPasswordRequest = {
        ...mockRequest,
        currentPassword: '123456789',
        newPassword: '987654321'
      };
      const passwordChangeResult = Result.Ok(mockUser);
      mockUserApplicationService.changeUserPassword.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute('test-user-id', numericPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.changeUserPassword.calledWith(
        'test-user-id',
        '123456789',
        '987654321'
      )).to.be.true;
    });
  });
});
