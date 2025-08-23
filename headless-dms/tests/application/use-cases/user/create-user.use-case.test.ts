import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { CreateUserUseCase } from '../../../../src/application/use-cases/user/CreateUserUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { CreateUserRequest, UserResponse } from '../../../../src/shared/dto/user/index.js';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockRequest: CreateUserRequest;

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
      id: 'new-user-id',
      email: { value: 'newuser@example.com' } as Email,
      password: { value: 'hashed-password' } as Password,
      role: { value: 'user' } as UserRole,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      serialize: sinon.stub().returns({
        id: 'new-user-id',
        email: 'newuser@example.com',
        role: 'user',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z')
      })
    } as unknown as User;

    // Create mock request
    mockRequest = {
      email: 'newuser@example.com',
      password: 'newpassword123',
      role: 'user'
    };

    // Create use case instance
    useCase = new CreateUserUseCase(
      mockUserApplicationService as IUserApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully create a user and return user response', async () => {
      // Arrange
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.deep.equal({
        id: 'new-user-id',
        email: 'newuser@example.com',
        role: 'user',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt
      });

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing create user use case',
        { email: 'newuser@example.com' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User created successfully',
        { userId: 'new-user-id', email: 'newuser@example.com' }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.createUser.calledWith(
        'newuser@example.com',
        'newpassword123',
        'user'
      )).to.be.true;
    });

    it('should return InvalidData error when user creation fails', async () => {
      // Arrange
      const userCreationError = AppError.InvalidData('Email already exists');
      const userResult = Result.Err(userCreationError);
      mockUserApplicationService.createUser.resolves(AppResult.Err(userCreationError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('InvalidData');
      expect(result.unwrapErr().message).to.include('User creation failed for email: newuser@example.com');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User creation failed',
        { email: 'newuser@example.com' }
      )).to.be.true;
    });

    it('should return Generic error when an exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockUserApplicationService.createUser.rejects(error);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute create user use case for email: newuser@example.com');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { email: 'newuser@example.com' }
      )).to.be.true;
    });



    it('should handle empty email in request', async () => {
      // Arrange
      const emptyEmailRequest = { ...mockRequest, email: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.createUser.calledWith('', 'newpassword123', 'user')).to.be.true;
    });

    it('should handle empty password in request', async () => {
      // Arrange
      const emptyPasswordRequest = { ...mockRequest, password: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.createUser.calledWith('newuser@example.com', '', 'user')).to.be.true;
    });

    it('should handle invalid role in request', async () => {
      // Arrange
      const invalidRoleRequest = { ...mockRequest, role: 'invalid-role' as 'user' | 'admin' };
      const serviceError = AppError.InvalidData('User creation failed');
      mockUserApplicationService.createUser.resolves(AppResult.Err(serviceError));

      // Act
      const result = await useCase.execute(invalidRoleRequest as CreateUserRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.isOk()).to.be.false;

      const error = result.unwrapErr();
      expect(error.status).to.equal(AppError.InvalidData().status);
      expect(error.message).to.include('User creation failed for email: newuser@example.com');

      // Verify service call with invalid role (should fail validation)
      expect(mockUserApplicationService.createUser.calledWith('newuser@example.com', 'newpassword123', 'invalid-role' as unknown as 'user' | 'admin')).to.be.true;
    });

    it('should handle minimum valid role in request', async () => {
      // Arrange
      const minRoleRequest = { ...mockRequest, role: 'user' as const };
      mockUserApplicationService.createUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(minRoleRequest as CreateUserRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.createUser.calledWith('newuser@example.com', 'newpassword123', 'user')).to.be.true;
    });

    it('should create child logger with correct context', () => {
      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'CreateUserUseCase' })).to.be.true;
    });

    it('should handle user creation with admin role', async () => {
      // Arrange
      const adminRequest = { ...mockRequest, role: 'admin' };
      const adminUser = { ...mockUser, role: { value: 'admin' } as UserRole };
      const userResult = Result.Ok(adminUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(adminUser as unknown as User));

      // Act
      const result = await useCase.execute(adminRequest as CreateUserRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().role).to.equal('admin');
      expect(mockUserApplicationService.createUser.calledWith('newuser@example.com', 'newpassword123', 'admin')).to.be.true;
    });

    it('should handle user creation with special characters in email', async () => {
      // Arrange
      const specialCharRequest = { ...mockRequest, email: 'user+tag@example.com' };
      const specialCharUser = { ...mockUser, email: { value: 'user+tag@example.com' } as Email };
      const userResult = Result.Ok(specialCharUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(specialCharUser as unknown as User));

      // Act
      const result = await useCase.execute(specialCharRequest as CreateUserRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().email).to.equal('user+tag@example.com');
      expect(mockUserApplicationService.createUser.calledWith('user+tag@example.com', 'newpassword123', 'user')).to.be.true;
    });

    it('should handle user creation with long password', async () => {
      // Arrange
      const longPasswordRequest = { ...mockRequest, password: 'a'.repeat(100) };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(longPasswordRequest as CreateUserRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.createUser.calledWith('newuser@example.com', 'a'.repeat(100), 'user')).to.be.true;
    });

    it('should handle user creation with numeric email', async () => {
      // Arrange
      const numericEmailRequest = { ...mockRequest, email: '123@example.com' };
      const numericEmailUser = { ...mockUser, email: { value: '123@example.com' } as Email };
      const userResult = Result.Ok(numericEmailUser);
      mockUserApplicationService.createUser.resolves(AppResult.Ok(numericEmailUser as unknown as User));

      // Act
      const result = await useCase.execute(numericEmailRequest as CreateUserRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().email).to.equal('123@example.com');
      expect(mockUserApplicationService.createUser.calledWith('123@example.com', 'newpassword123', 'user')).to.be.true;
    });
  });
});
