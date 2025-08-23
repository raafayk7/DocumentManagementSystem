import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { ValidateUserCredentialsUseCase } from '../../../../src/application/use-cases/user/ValidateUserCredentialsUseCase.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import type { ValidateUserCredentialsRequest } from '../../../../src/shared/dto/user/ValidateUserCredentialsRequest.js';

describe('ValidateUserCredentialsUseCase', () => {
  let useCase: ValidateUserCredentialsUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: ValidateUserCredentialsRequest;

  beforeEach(() => {
    // Create mocks
    mockUserApplicationService = {
      validateUserCredentials: sinon.stub(),
      createUser: sinon.stub(),
      authenticateUser: sinon.stub(),
      getUsers: sinon.stub(),
      getUserById: sinon.stub(),
      deleteUser: sinon.stub(),
      changeUserRole: sinon.stub(),
      changeUserPassword: sinon.stub(),
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
    useCase = container.resolve(ValidateUserCredentialsUseCase);

    // Setup test request
    mockRequest = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('execute', () => {
    it('should successfully validate correct credentials', async () => {
      // Arrange
      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.isValid).to.be.true;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing validate user credentials use case',
        { email: 'test@example.com' }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'User credentials validation completed',
        { 
          email: 'test@example.com', 
          isValid: true 
        }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'test@example.com',
        'testpassword123'
      )).to.be.true;
    });

    it('should successfully validate incorrect credentials', async () => {
      // Arrange
      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(false));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.isValid).to.be.false;

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'User credentials validation completed',
        { 
          email: 'test@example.com', 
          isValid: false 
        }
      )).to.be.true;
    });

    it('should return Unauthorized error when validation service fails', async () => {
      // Arrange
      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Err(new Error('User not found')));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Unauthorized');
      expect(result.unwrapErr().message).to.include('Credentials validation failed for email: test@example.com');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'User credentials validation failed',
        { email: 'test@example.com' }
      )).to.be.true;
    });

    it('should return Generic error when database connection fails', async () => {
      // Arrange
      mockUserApplicationService.validateUserCredentials.rejects(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute validate user credentials use case for email: test@example.com');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { email: 'test@example.com' }
      )).to.be.true;
    });

    it('should create child logger with correct context', async () => {
      // Arrange
      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      await useCase.execute(mockRequest);

      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'ValidateUserCredentialsUseCase' })).to.be.true;
    });

    it('should handle edge case with empty email', async () => {
      // Arrange
      const emptyEmailRequest = {
        email: '',
        password: 'testpassword123'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Err(new Error('Invalid email')));

      // Act
      const result = await useCase.execute(emptyEmailRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith('', 'testpassword123')).to.be.true;
    });

    it('should handle edge case with empty password', async () => {
      // Arrange
      const emptyPasswordRequest = {
        email: 'test@example.com',
        password: ''
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Err(new Error('Invalid password')));

      // Act
      const result = await useCase.execute(emptyPasswordRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith('test@example.com', '')).to.be.true;
    });

    it('should handle admin user credentials validation', async () => {
      // Arrange
      const adminRequest = {
        email: 'admin@example.com',
        password: 'adminpassword123'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(adminRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.isValid).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'admin@example.com',
        'adminpassword123'
      )).to.be.true;
    });

    it('should handle complex email format', async () => {
      // Arrange
      const complexEmailRequest = {
        email: 'user+tag@subdomain.example.co.uk',
        password: 'complexpassword123'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(complexEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'user+tag@subdomain.example.co.uk',
        'complexpassword123'
      )).to.be.true;
    });

    it('should handle password with special characters', async () => {
      // Arrange
      const specialPasswordRequest = {
        email: 'test@example.com',
        password: 'P@ssw0rd!#$%'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(specialPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'test@example.com',
        'P@ssw0rd!#$%'
      )).to.be.true;
    });

    it('should handle very long password', async () => {
      // Arrange
      const longPasswordRequest = {
        email: 'test@example.com',
        password: 'a'.repeat(200)
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(false));

      // Act
      const result = await useCase.execute(longPasswordRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.isValid).to.be.false;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'test@example.com',
        'a'.repeat(200)
      )).to.be.true;
    });

    it('should handle numeric email format', async () => {
      // Arrange
      const numericEmailRequest = {
        email: '123@456.com',
        password: 'numericpassword'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(numericEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        '123@456.com',
        'numericpassword'
      )).to.be.true;
    });

    it('should handle case sensitivity in email', async () => {
      // Arrange
      const upperCaseEmailRequest = {
        email: 'TEST@EXAMPLE.COM',
        password: 'testpassword123'
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(true));

      // Act
      const result = await useCase.execute(upperCaseEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        'TEST@EXAMPLE.COM',
        'testpassword123'
      )).to.be.true;
    });

    it('should handle whitespace in credentials', async () => {
      // Arrange
      const whitespaceRequest = {
        email: '  test@example.com  ',
        password: '  testpassword123  '
      };

      mockUserApplicationService.validateUserCredentials.resolves(AppResult.Ok(false));

      // Act
      const result = await useCase.execute(whitespaceRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.isValid).to.be.false;
      expect(mockUserApplicationService.validateUserCredentials.calledWith(
        '  test@example.com  ',
        '  testpassword123  '
      )).to.be.true;
    });
  });
});
