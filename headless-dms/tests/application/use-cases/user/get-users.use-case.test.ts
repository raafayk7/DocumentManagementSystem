import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { container } from 'tsyringe';
import 'reflect-metadata';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { Result } from '@carbonteq/fp';

import { GetUsersUseCase } from '../../../../src/application/use-cases/user/GetUsersUseCase.js';
import { User } from '../../../../src/domain/entities/User.js';
import { Email } from '../../../../src/domain/value-objects/Email.js';
import { Password } from '../../../../src/domain/value-objects/Password.js';
import { UserRole } from '../../../../src/domain/value-objects/UserRole.js';
import type { IUserApplicationService } from '../../../../src/ports/input/IUserApplicationService.js';
import type { ILogger, LogContext } from '../../../../src/ports/output/ILogger.js';
import type { GetUsersRequest } from '../../../../src/shared/dto/user/GetUsersRequest.js';

describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
  let mockUserApplicationService: sinon.SinonStubbedInstance<IUserApplicationService>;
  let mockLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockChildLogger: sinon.SinonStubbedInstance<ILogger>;
  let mockRequest: GetUsersRequest;

  beforeEach(() => {
    // Create mocks
    mockUserApplicationService = {
      getUsers: sinon.stub(),
      createUser: sinon.stub(),
      authenticateUser: sinon.stub(),
      getUserById: sinon.stub(),
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
      child: sinon.stub(),
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
    useCase = container.resolve(GetUsersUseCase);

    // Setup test request
    mockRequest = {
      page: 1,
      limit: 10,
      sortBy: 'email',
      sortOrder: 'asc',
      role: 'user',
      email: 'test@example.com'
    };


  });

  afterEach(() => {
    sinon.restore();
    container.clearInstances();
  });

  describe('execute', () => {
    it('should successfully retrieve users with pagination', async () => {
      // Arrange
      const mockUsers = [
        User.fromRepository({
          id: 'user1-id',
          email: 'user1@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        }).unwrap(),
        User.fromRepository({
          id: 'user2-id',
          email: 'user2@example.com',
          passwordHash: 'hashedpassword',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }).unwrap()
      ];

      mockUserApplicationService.getUsers.resolves(AppResult.Ok(mockUsers as unknown as User[]));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users).to.have.length(2);
      expect(response.users[0].email).to.equal('user1@example.com');
      expect(response.users[0].role).to.equal('user');
      expect(response.users[1].email).to.equal('user2@example.com');
      expect(response.users[1].role).to.equal('admin');
      expect(response.pagination).to.exist;
      expect(response.pagination.page).to.equal(1);
      expect(response.pagination.limit).to.equal(10);

      // Verify logging
      expect(mockChildLogger.info.calledWith(
        'Executing get users use case',
        { 
          page: 1, 
          limit: 10,
          role: 'user',
          email: 'test@example.com'
        }
      )).to.be.true;
      expect(mockChildLogger.info.calledWith(
        'Users retrieved successfully',
        { 
          userCount: 2, 
          page: 1, 
          limit: 10 
        }
      )).to.be.true;

      // Verify service call
      expect(mockUserApplicationService.getUsers.calledWith(1, 10, 'email', 'asc', { email: 'test@example.com', role: 'user' })).to.be.true;
    });

    it('should return InvalidOperation error when retrieval fails', async () => {
      // Arrange
      mockUserApplicationService.getUsers.resolves(AppResult.Err(new Error('Database error')));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('InvalidOperation');
      expect(result.unwrapErr().message).to.include('Users retrieval failed with page: 1, limit: 10');

      // Verify logging
      expect(mockChildLogger.warn.calledWith(
        'Users retrieval failed',
        { 
          page: 1, 
          limit: 10,
          role: 'user',
          email: 'test@example.com'
        }
      )).to.be.true;
    });

    it('should return Generic error when database connection fails', async () => {
      // Arrange
      mockUserApplicationService.getUsers.rejects(new Error('Database connection failed'));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(result.unwrapErr().status).to.equal('Generic');
      expect(result.unwrapErr().message).to.include('Failed to execute get users use case with page: 1, limit: 10');

      // Verify logging
      expect(mockChildLogger.error.calledWith(
        'Database connection failed',
        { 
          page: 1, 
          limit: 10,
          role: 'user',
          email: 'test@example.com'
        }
      )).to.be.true;
    });

    it('should create child logger with correct context', async () => {
      // Arrange
      mockUserApplicationService.getUsers.resolves(AppResult.Ok([]));

      // Act
      await useCase.execute(mockRequest);

      // Assert
      expect(mockLogger.child.calledWith({ useCase: 'GetUsersUseCase' })).to.be.true;
    });

    it('should handle empty user list', async () => {
      // Arrange
      mockUserApplicationService.getUsers.resolves(AppResult.Ok([]));

      // Act
      const result = await useCase.execute(mockRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users).to.have.length(0);
      expect(response.pagination).to.exist;
    });

    it('should handle request with minimal parameters', async () => {
      // Arrange
      const minimalRequest: GetUsersRequest = {
        page: 1,
        limit: 5,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const mockUser = User.fromRepository({
        id: 'minimal-id',
        email: 'minimal@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUsers.resolves(AppResult.Ok([mockUser as unknown as User]));

      // Act
      const result = await useCase.execute(minimalRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      expect(mockUserApplicationService.getUsers.calledWith(1, 5, 'createdAt', 'desc', { email: undefined, role: undefined })).to.be.true;
    });

    it('should handle admin role filter', async () => {
      // Arrange
      const adminRequest: GetUsersRequest = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: 'admin'
      };

      const adminUser = User.fromRepository({
        id: 'admin-id',
        email: 'admin@example.com',
        passwordHash: 'hashedpassword',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUsers.resolves(AppResult.Ok([adminUser as unknown as User]));

      // Act
      const result = await useCase.execute(adminRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users[0].role).to.equal('admin');
      expect(mockUserApplicationService.getUsers.calledWith(1, 10, 'createdAt', 'desc', { email: undefined, role: 'admin' })).to.be.true;
    });

    it('should handle user role filter', async () => {
      // Arrange
      const userRequest: GetUsersRequest = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: 'user'
      };

      const regularUser = User.fromRepository({
        id: 'regular-user-id',
        email: 'user@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUsers.resolves(AppResult.Ok([regularUser as unknown as User]));

      // Act
      const result = await useCase.execute(userRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users[0].role).to.equal('user');
      expect(mockUserApplicationService.getUsers.calledWith(1, 10, 'createdAt', 'desc', { email: undefined, role: 'user' })).to.be.true;
    });

    it('should handle large page size', async () => {
      // Arrange
      const largePageRequest: GetUsersRequest = {
        page: 1,
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const users = Array.from({ length: 50 }, (_, i) => 
        User.fromRepository({
          id: `user${i}-id`,
          email: `user${i}@example.com`,
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        }).unwrap()
      );

      mockUserApplicationService.getUsers.resolves(AppResult.Ok(users as unknown as User[]));

      // Act
      const result = await useCase.execute(largePageRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users).to.have.length(50);
      expect(mockUserApplicationService.getUsers.calledWith(1, 100, 'createdAt', 'desc', { email: undefined, role: undefined })).to.be.true;
    });

    it('should handle high page number', async () => {
      // Arrange
      const highPageRequest: GetUsersRequest = {
        page: 10,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockUserApplicationService.getUsers.resolves(AppResult.Ok([]));

      // Act
      const result = await useCase.execute(highPageRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users).to.have.length(0);
      expect(mockUserApplicationService.getUsers.calledWith(10, 10, 'createdAt', 'desc', { email: undefined, role: undefined })).to.be.true;
    });

    it('should handle edge case with zero page', async () => {
      // Arrange
      const zeroPageRequest: GetUsersRequest = {
        page: 0,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockUserApplicationService.getUsers.resolves(AppResult.Err(AppError.InvalidOperation('Invalid page number')));

      // Act
      const result = await useCase.execute(zeroPageRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.getUsers.calledWith(0, 10, 'createdAt', 'desc', { email: undefined, role: undefined })).to.be.true;
    });

    it('should handle edge case with zero limit', async () => {
      // Arrange
      const zeroLimitRequest: GetUsersRequest = {
        page: 1,
        limit: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      mockUserApplicationService.getUsers.resolves(AppResult.Err(AppError.InvalidOperation('Invalid limit')));

      // Act
      const result = await useCase.execute(zeroLimitRequest);

      // Assert
      expect(result.isErr()).to.be.true;
      expect(mockUserApplicationService.getUsers.calledWith(1, 0, 'createdAt', 'desc', { email: undefined, role: undefined })).to.be.true;
    });

    it('should handle complex email filter', async () => {
      // Arrange
      const complexEmailRequest: GetUsersRequest = {
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        email: 'user+tag@subdomain.example.co.uk'
      };

      const user = User.fromRepository({
        id: 'complex-email-user-id',
        email: 'user+tag@subdomain.example.co.uk',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      }).unwrap();

      mockUserApplicationService.getUsers.resolves(AppResult.Ok([user as unknown as User]));

      // Act
      const result = await useCase.execute(complexEmailRequest);

      // Assert
      expect(result.isOk()).to.be.true;
      const response = result.unwrap();
      expect(response.users[0].email).to.equal('user+tag@subdomain.example.co.uk');
    });
  });
});
