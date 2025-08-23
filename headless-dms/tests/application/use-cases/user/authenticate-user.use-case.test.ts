import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { AuthenticateUserUseCase } from '../../../../src/application/use-cases/user/AuthenticateUserUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import { AuthenticateUserRequest, AuthenticateUserResponse } from '../../../../src/shared/dto/user/index.js';

describe('AuthenticateUserUseCase', () => {
  let useCase: AuthenticateUserUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockUser: User;
  let mockRequest: AuthenticateUserRequest;

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
      password: { value: 'hashed-password' } as Password,
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
      email: 'test@example.com',
      password: 'testpassword123'
    };

    // Create use case instance
    useCase = new AuthenticateUserUseCase(
      mockUserApplicationService as IUserApplicationService,
      mockLogger as ILogger
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('execute', () => {
    it('should successfully authenticate a user and return response', async () => {
      // Arrange
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.authenticateUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap()).to.deep.include({
        token: 'dummy-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt
        }
      });
      expect(result.unwrap().expiresAt).to.be.instanceOf(Date);
      expect(result.unwrap().expiresAt!.getTime()).to.be.greaterThan(Date.now());

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing authenticate user use case',
        { email: 'test@example.com' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User authenticated successfully',
        { userId: 'test-user-id', email: 'test@example.com' }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.authenticateUser.calledWith(
        'test@example.com',
        'testpassword123'
      )).to.be.true;
    });

    it('should return Unauthorized error when authentication fails', async () => {
      // Arrange
      const authError = AppError.Unauthorized('Invalid credentials');
      const userResult = Result.Err(authError);
      mockUserApplicationService.authenticateUser.resolves(AppResult.Err(authError));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Unauthorized');
      expect(result.unwrapErr().message).to.include('Authentication failed for email: test@example.com');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User authentication failed',
        { email: 'test@example.com' }
      )).to.be.true;
    });

    it('should return Generic error when an exception occurs', async () => {
      // Arrange
      const error = new Error('Database connection failed');
      mockUserApplicationService.authenticateUser.rejects(error);

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute authenticate user use case for email: test@example.com');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { email: 'test@example.com' }
      )).to.be.true;
    });



    it('should handle empty email in request', async () => {
      // Arrange
      const emptyEmailRequest = { ...mockRequest, email: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.authenticateUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.authenticateUser.calledWith('', 'testpassword123')).to.be.true;
    });

    it('should handle empty password in request', async () => {
      // Arrange
      const emptyPasswordRequest = { ...mockRequest, password: '' };
      const userResult = Result.Ok(mockUser);
      mockUserApplicationService.authenticateUser.resolves(AppResult.Ok(mockUser));

      // Act
      const result = await useCase.execute(emptyPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.authenticateUser.calledWith('test@example.com', '')).to.be.true;
    });

    it('should create child logger with correct context', () => {
      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'AuthenticateUserUseCase' })).to.be.true;
    });

    it('should handle user with different role', async () => {
      // Arrange
      const adminUser = {
        ...mockUser,
        role: { value: 'admin' } as UserRole
      };
      const userResult = Result.Ok(adminUser);
      mockUserApplicationService.authenticateUser.resolves(AppResult.Ok(adminUser as unknown as User));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(result.unwrap().user.role).to.equal('admin');
    });
  });
});
