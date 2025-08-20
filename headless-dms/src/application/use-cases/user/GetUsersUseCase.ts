import { injectable, inject } from 'tsyringe';
import { AppResult } from '@carbonteq/hexapp';
import { GetUsersRequest, PaginatedUsersResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersUseCase' });
  }

  async execute(request: GetUsersRequest): Promise<AppResult<PaginatedUsersResponse>> {
    this.logger.info('Getting users with pagination', { 
      page: request.page, 
      limit: request.limit,
      filters: request 
    });

    try {
      const users = await this.userApplicationService.getUsers(
        request.page,
        request.limit,
        request.sortBy,
        request.sortOrder,
        {
          search: request.search,
          email: request.email,
          role: request.role
        }
      );

      if (users.isErr()) {
        this.logger.warn('Failed to get users', { 
          page: request.page, 
          limit: request.limit,
          error: users.unwrapErr().message 
        });
        return AppResult.Err(new ApplicationError(
          'GetUsersUseCase.usersRetrievalFailed',
          'Failed to retrieve users',
          { page: request.page, limit: request.limit }
        ));
      }

      const usersData = users.unwrap();
      
      // Apply pagination manually since the service returns all users
      const startIndex = (request.page - 1) * request.limit;
      const endIndex = startIndex + request.limit;
      const paginatedUsers = usersData.slice(startIndex, endIndex);
      
      const response: PaginatedUsersResponse = {
        users: paginatedUsers.map(user => ({
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: {
          page: request.page,
          limit: request.limit,
          total: usersData.length,
          totalPages: Math.ceil(usersData.length / request.limit),
          hasNext: endIndex < usersData.length,
          hasPrev: request.page > 1
        }
      };
      
      this.logger.info('Users retrieved successfully', { 
        page: request.page, 
        limit: request.limit,
        totalUsers: usersData.length,
        returnedUsers: paginatedUsers.length
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error('Unexpected error during users retrieval', { 
        page: request.page, 
        limit: request.limit,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return AppResult.Err(new ApplicationError(
        'GetUsersUseCase.unexpectedError',
        'Unexpected error during users retrieval',
        { page: request.page, limit: request.limit }
      ));
    }
  }
} 