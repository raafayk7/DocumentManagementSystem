import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../interfaces/IUserRepository.js';
import type { ILogger } from '../../../domain/interfaces/ILogger.js';
import type { GetUsersRequest, PaginatedUsersResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject('IUserRepository') private userRepository: IUserRepository,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersUseCase' });
  }

  async execute(request: GetUsersRequest): Promise<Result<PaginatedUsersResponse, ApplicationError>> {
    this.logger.info('Getting users', { 
      page: request.page, 
      limit: request.limit, 
      search: request.search,
      email: request.email,
      role: request.role,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder
    });

    try {
      // Build filter query for repository
      const filterQuery: any = {};
      if (request.email) {
        filterQuery.email = request.email;
      }
      if (request.role) {
        filterQuery.role = request.role;
      }

      // Build pagination parameters for repository
      const paginationParams = {
        page: request.page,
        limit: request.limit,
        order: request.sortOrder,
        sort: request.sortBy
      };

      // Use repository directly to get full pagination information
      const usersResult = await this.userRepository.find(filterQuery, paginationParams);
      
      // Transform to response DTOs
      const userDtos = usersResult.data.map(user => ({
        id: user.id,
        email: user.email.value,
        role: user.role.value,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // Use the pagination metadata from repository
      const response: PaginatedUsersResponse = {
        users: userDtos,
        pagination: usersResult.pagination,
      };

      this.logger.info('Users retrieved successfully', { 
        count: userDtos.length,
        page: request.page,
        total: usersResult.pagination.total,
        totalPages: usersResult.pagination.totalPages,
        hasNext: usersResult.pagination.hasNext,
        hasPrev: usersResult.pagination.hasPrev,
        filtersApplied: {
          search: request.search,
          email: request.email,
          role: request.role
        }
      });
      return Result.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        page: request.page, 
        limit: request.limit 
      });
      return Result.Err(new ApplicationError(
        'GetUsersUseCase.execute',
        error instanceof Error ? error.message : 'Failed to get users',
        { page: request.page, limit: request.limit }
      ));
    }
  }
} 