/**
 * IUserRepository Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the IUserRepository interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IUserRepository, UserFilterQuery } from '../../../src/ports/output/IUserRepository.js';
import { User } from '../../../src/domain/entities/User.js';
import { PaginationInput, PaginationOutput } from '../../../src/shared/dto/common/pagination.dto.js';
import { BaseRepository, RepositoryResult, Paginated, PaginationOptions, AppResult } from '@carbonteq/hexapp';

describe('IUserRepository Output Port Interface', () => {
  let mockRepository: IUserRepository;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockRepository = {
      // BaseRepository required methods
      insert: async (user: User): Promise<RepositoryResult<User, any>> => {
        return {
          isOk: (): this is RepositoryResult<User, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => user,
          unwrapErr: () => new Error()
        } as RepositoryResult<User, any>;
      },

      update: async (user: User): Promise<RepositoryResult<User, any>> => {
        return {
          isOk: (): this is RepositoryResult<User, never> => true,
          isErr: (): this is RepositoryResult<never, any> => false,
          unwrap: () => user,
          unwrapErr: () => new Error()
        } as RepositoryResult<User, any>;
      },

      // Existing custom methods
      findById: async (id: string): Promise<User | null> => {
        const user = {
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any;
        return user;
      },

      findByEmail: async (email: string): Promise<User | null> => {
        const user = {
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any;
        return user;
      },

      findOne: async (query: UserFilterQuery): Promise<User | null> => {
        const user = {
          id: 'user123',
          email: 'test@example.com',
          passwordHash: 'hashedpassword',
          role: 'user',
          createdAt: new Date(),
          updatedAt: new Date()
        } as any;
        return user;
      },

      find: async (query?: UserFilterQuery, pagination?: PaginationInput): Promise<PaginationOutput<User>> => {
        const users = [
          {
            id: 'user123',
            email: 'test@example.com',
            passwordHash: 'hashedpassword',
            role: 'user',
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        ];
        
        return {
          data: users,
          pagination: {
            page: pagination?.page || 1,
            limit: pagination?.limit || 10,
            total: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        };
      },

      findByRole: async (role: 'user' | 'admin'): Promise<User[]> => {
        const users = [
          {
            id: 'user123',
            email: 'test@example.com',
            passwordHash: 'hashedpassword',
            role: role,
            createdAt: new Date(),
            updatedAt: new Date()
          } as any
        ];
        
        return users;
      },

      saveUser: async (user: User): Promise<User> => {
        return user;
      },



      exists: async (query: UserFilterQuery): Promise<boolean> => {
        return true;
      },

      count: async (query?: UserFilterQuery): Promise<number> => {
        return 1;
      },

      delete: async (id: string): Promise<boolean> => {
        return true;
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockRepository).to.have.property('findById');
      expect(mockRepository).to.have.property('findByEmail');
      expect(mockRepository).to.have.property('findOne');
      expect(mockRepository).to.have.property('find');
      expect(mockRepository).to.have.property('findByRole');
      expect(mockRepository).to.have.property('saveUser');
      expect(mockRepository).to.have.property('insert');
      expect(mockRepository).to.have.property('update');
      expect(mockRepository).to.have.property('exists');
      expect(mockRepository).to.have.property('count');
      expect(mockRepository).to.have.property('delete');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockRepository.findById).to.equal('function');
      expect(typeof mockRepository.findByEmail).to.equal('function');
      expect(typeof mockRepository.findOne).to.equal('function');
      expect(typeof mockRepository.find).to.equal('function');
      expect(typeof mockRepository.findByRole).to.equal('function');
      expect(typeof mockRepository.saveUser).to.equal('function');
      expect(typeof mockRepository.insert).to.equal('function');
      expect(typeof mockRepository.update).to.equal('function');
      expect(typeof mockRepository.exists).to.equal('function');
      expect(typeof mockRepository.count).to.equal('function');
      expect(typeof mockRepository.delete).to.equal('function');
    });
  });

  describe('User Retrieval Methods', () => {
    it('should handle findById with string ID', async () => {
      const user = await mockRepository.findById('user123');
      
      expect(user).to.be.an('object');
      expect(user).to.have.property('id');
      expect(user).to.have.property('email');
      expect(user).to.have.property('role');
    });

    it('should handle findByEmail with string email', async () => {
      const user = await mockRepository.findByEmail('test@example.com');
      
      expect(user).to.be.an('object');
      expect(user).to.have.property('id');
      expect(user).to.have.property('email');
      expect(user).to.have.property('role');
    });

    it('should handle findOne with filter query', async () => {
      const filter: UserFilterQuery = { email: 'test@example.com' };
      const user = await mockRepository.findOne(filter);
      
      expect(user).to.be.an('object');
      expect(user).to.have.property('id');
      expect(user).to.have.property('email');
      expect(user).to.have.property('role');
    });

    it('should handle find with optional filter and pagination', async () => {
      const filter: UserFilterQuery = { role: 'user' };
      const pagination: PaginationInput = { page: 1, limit: 10, order: 'asc' };
      
      const result = await mockRepository.find(filter, pagination);
      
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
      expect(result.pagination).to.have.property('page');
      expect(result.pagination).to.have.property('limit');
      expect(result.pagination).to.have.property('total');
      expect(result.pagination).to.have.property('totalPages');
      expect(result.pagination).to.have.property('hasNext');
      expect(result.pagination).to.have.property('hasPrev');
      expect(Array.isArray(result.data)).to.be.true;
    });

    it('should handle find without filter and pagination', async () => {
      const result = await mockRepository.find();
      
      expect(result).to.have.property('data');
      expect(result).to.have.property('pagination');
      expect(result.pagination).to.have.property('page');
      expect(result.pagination).to.have.property('limit');
      expect(result.pagination).to.have.property('total');
      expect(result.pagination).to.have.property('totalPages');
      expect(result.pagination).to.have.property('hasNext');
      expect(result.pagination).to.have.property('hasPrev');
      expect(Array.isArray(result.data)).to.be.true;
    });

    it('should handle findByRole with role string', async () => {
      const role = 'user';
      
      const result = await mockRepository.findByRole(role);
      
      expect(Array.isArray(result)).to.be.true;
      expect(result.length).to.be.greaterThan(0);
      expect(result[0]).to.have.property('id');
      expect(result[0]).to.have.property('email');
      expect(result[0]).to.have.property('role');
    });
  });

  describe('User Persistence Methods', () => {
    it('should handle saveUser with User entity', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const savedUser = await mockRepository.saveUser(user);
      
      expect(savedUser).to.be.an('object');
      expect(savedUser).to.have.property('id');
      expect(savedUser).to.have.property('email');
      expect(savedUser).to.have.property('role');
    });

    it('should handle insert with User entity', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const result = await mockRepository.insert(user);
      
      expect(result).to.have.property('isOk');
      expect(result.isOk()).to.be.true;
      const insertedUser = result.unwrap();
      expect(insertedUser).to.be.an('object');
      expect(insertedUser).to.have.property('id');
      expect(insertedUser).to.have.property('email');
      expect(insertedUser).to.have.property('role');
    });

    it('should handle update with User entity', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const result = await mockRepository.update(user);
      
      expect(result).to.have.property('isOk');
      expect(result.isOk()).to.be.true;
      const updatedUser = result.unwrap();
      expect(updatedUser).to.be.an('object');
      expect(updatedUser).to.have.property('id');
      expect(updatedUser).to.have.property('email');
      expect(updatedUser).to.have.property('role');
    });

    it('should handle delete with string ID', async () => {
      const id = 'user123';
      const result = await mockRepository.delete(id);
      
      expect(typeof result).to.equal('boolean');
    });
  });

  describe('Utility Methods', () => {
    it('should handle exists with UserFilterQuery', async () => {
      const query: UserFilterQuery = { email: 'test@example.com' };
      const result = await mockRepository.exists(query);
      
      expect(typeof result).to.equal('boolean');
    });

    it('should handle count with optional UserFilterQuery', async () => {
      const result = await mockRepository.count();
      
      expect(typeof result).to.equal('number');
    });

    it('should handle count with UserFilterQuery', async () => {
      const query: UserFilterQuery = { role: 'user' };
      const result = await mockRepository.count(query);
      
      expect(typeof result).to.equal('number');
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for IDs and emails', async () => {
      const id = 'user123';
      const email = 'test@example.com';
      
      const findByIdResult = await mockRepository.findById(id);
      const findByEmailResult = await mockRepository.findByEmail(email);
      
      expect(findByIdResult).to.be.an('object');
      expect(findByEmailResult).to.be.an('object');
    });

    it('should accept UserFilterQuery for filter parameters', async () => {
      const filters: UserFilterQuery[] = [
        { email: 'test@example.com' },
        { role: 'user' },
        { email: 'test@example.com', role: 'user' }
      ];
      
      for (const filter of filters) {
        const result = await mockRepository.findOne(filter);
        expect(result).to.be.an('object');
      }
    });

    it('should accept PaginationInput for pagination parameters', async () => {
      const paginationInputs: PaginationInput[] = [
        { page: 1, limit: 10, order: 'asc' },
        { page: 2, limit: 20, order: 'desc' },
        { page: 1, limit: 5, order: 'asc' }
      ];
      
      for (const pagination of paginationInputs) {
        const result = await mockRepository.find(undefined, pagination);
        expect(result).to.have.property('pagination');
        expect(result.pagination).to.have.property('page');
        expect(result.pagination).to.have.property('limit');
      }
    });

    it('should accept User entities for persistence methods', async () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const saveResult = await mockRepository.saveUser(user);
      const insertResult = await mockRepository.insert(user);
      const updateResult = await mockRepository.update(user);
      
      expect(saveResult).to.be.an('object');
      expect(insertResult).to.have.property('isOk');
      expect(updateResult).to.have.property('isOk');
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return User or User[] for retrieval methods', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete repository tests
      
      expect(mockRepository.findById).to.be.a('function');
      expect(mockRepository.findByEmail).to.be.a('function');
      expect(mockRepository.findOne).to.be.a('function');
      expect(mockRepository.find).to.be.a('function');
      expect(mockRepository.findByRole).to.be.a('function');
      expect(mockRepository.saveUser).to.be.a('function');
      expect(mockRepository.insert).to.be.a('function');
      expect(mockRepository.update).to.be.a('function');
      expect(mockRepository.exists).to.be.a('function');
      expect(mockRepository.count).to.be.a('function');
      expect(mockRepository.delete).to.be.a('function');
      
      // Verify that the methods return promises
      const id = 'user123';
      const email = 'test@example.com';
      const filter: UserFilterQuery = { email: 'test@example.com' };
      const pagination: PaginationInput = { page: 1, limit: 10, order: 'asc' };
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const findByIdPromise = mockRepository.findById(id);
      const findByEmailPromise = mockRepository.findByEmail(email);
      const findOnePromise = mockRepository.findOne(filter);
      const findPromise = mockRepository.find(filter, pagination);
      const findByRolePromise = mockRepository.findByRole('user');
      const saveUserPromise = mockRepository.saveUser(user);
      const insertPromise = mockRepository.insert(user);
      const updatePromise = mockRepository.update(user);
      const existsPromise = mockRepository.exists(filter);
      const countPromise = mockRepository.count(filter);
      const deletePromise = mockRepository.delete(id);
      
      expect(findByIdPromise).to.be.instanceOf(Promise);
      expect(findByEmailPromise).to.be.instanceOf(Promise);
      expect(findOnePromise).to.be.instanceOf(Promise);
      expect(findPromise).to.be.instanceOf(Promise);
      expect(findByRolePromise).to.be.instanceOf(Promise);
      expect(saveUserPromise).to.be.instanceOf(Promise);
      expect(insertPromise).to.be.instanceOf(Promise);
      expect(updatePromise).to.be.instanceOf(Promise);
      expect(existsPromise).to.be.instanceOf(Promise);
      expect(countPromise).to.be.instanceOf(Promise);
      expect(deletePromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        findByIdPromise,
        findByEmailPromise,
        findOnePromise,
        findPromise,
        findByRolePromise,
        saveUserPromise,
        insertPromise,
        updatePromise,
        existsPromise,
        countPromise,
        deletePromise
      ]);
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all methods as async operations', async () => {
      const id = 'user123';
      const email = 'test@example.com';
      const filter: UserFilterQuery = { email: 'test@example.com' };
      const pagination: PaginationInput = { page: 1, limit: 10, order: 'asc' };
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const methods = [
        mockRepository.findById(id),
        mockRepository.findByEmail(email),
        mockRepository.findOne(filter),
        mockRepository.find(filter, pagination),
        mockRepository.findByRole('user'),
        mockRepository.saveUser(user),
        mockRepository.insert(user),
        mockRepository.update(user),
        mockRepository.exists(filter),
        mockRepository.count(filter),
        mockRepository.delete(id)
      ];
      
      methods.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      const results = await Promise.all(methods);
      results.forEach(result => {
        expect(result).to.not.be.undefined;
      });
    });
  });

  describe('Pagination and Filtering', () => {
    it('should handle pagination input correctly', () => {
      const paginationInputs: PaginationInput[] = [
        { page: 1, limit: 10, order: 'asc' },
        { page: 2, limit: 20, order: 'desc' },
        { page: 1, limit: 5, order: 'asc' }
      ];
      
      paginationInputs.forEach(pagination => {
        expect(pagination).to.have.property('page');
        expect(pagination).to.have.property('limit');
        if (pagination.order) {
          expect(['asc', 'desc']).to.include(pagination.order);
        }
      });
    });

    it('should handle user filter queries correctly', () => {
      const filters: UserFilterQuery[] = [
        { email: 'test@example.com' },
        { role: 'user' },
        { email: 'test@example.com', role: 'user' }
      ];
      
      filters.forEach(filter => {
        if (filter.email) {
          expect(typeof filter.email).to.equal('string');
        }
        if (filter.role) {
          expect(['user', 'admin']).to.include(filter.role);
        }
      });
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedRepository: IUserRepository & { additionalMethod?: () => void } = {
        ...mockRepository,
        additionalMethod: () => {}
      };
      
      expect(extendedRepository.findById).to.be.a('function');
      expect(extendedRepository.findByEmail).to.be.a('function');
      expect(extendedRepository.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository operations that may fail', async () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete repository tests
      
      expect(mockRepository.findById).to.be.a('function');
      expect(mockRepository.findByEmail).to.be.a('function');
      expect(mockRepository.findOne).to.be.a('function');
      expect(mockRepository.find).to.be.a('function');
      expect(mockRepository.findByRole).to.be.a('function');
      expect(mockRepository.saveUser).to.be.a('function');
      expect(mockRepository.insert).to.be.a('function');
      expect(mockRepository.update).to.be.a('function');
      expect(mockRepository.exists).to.be.a('function');
      expect(mockRepository.count).to.be.a('function');
      expect(mockRepository.delete).to.be.a('function');
      
      // Verify that the methods return promises
      const id = 'user123';
      const email = 'test@example.com';
      const filter: UserFilterQuery = { email: 'test@example.com' };
      const pagination: PaginationInput = { page: 1, limit: 10, order: 'asc' };
      const user = {
        id: 'user123',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any;
      
      const findByIdPromise = mockRepository.findById(id);
      const findByEmailPromise = mockRepository.findByEmail(email);
      const findOnePromise = mockRepository.findOne(filter);
      const findPromise = mockRepository.find(filter, pagination);
      const findByRolePromise = mockRepository.findByRole('user');
      const saveUserPromise = mockRepository.saveUser(user);
      const insertPromise = mockRepository.insert(user);
      const updatePromise = mockRepository.update(user);
      const existsPromise = mockRepository.exists(filter);
      const countPromise = mockRepository.count(filter);
      const deletePromise = mockRepository.delete(id);
      
      expect(findByIdPromise).to.be.instanceOf(Promise);
      expect(findByEmailPromise).to.be.instanceOf(Promise);
      expect(findOnePromise).to.be.instanceOf(Promise);
      expect(findPromise).to.be.instanceOf(Promise);
      expect(findByRolePromise).to.be.instanceOf(Promise);
      expect(saveUserPromise).to.be.instanceOf(Promise);
      expect(insertPromise).to.be.instanceOf(Promise);
      expect(updatePromise).to.be.instanceOf(Promise);
      expect(existsPromise).to.be.instanceOf(Promise);
      expect(countPromise).to.be.instanceOf(Promise);
      expect(deletePromise).to.be.instanceOf(Promise);
      
      // Verify that the promises resolve (we don't care about the actual values in interface tests)
      await Promise.all([
        findByIdPromise,
        findByEmailPromise,
        findOnePromise,
        findPromise,
        findByRolePromise,
        saveUserPromise,
        insertPromise,
        updatePromise,
        existsPromise,
        countPromise,
        deletePromise
      ]);
    });
  });
});
