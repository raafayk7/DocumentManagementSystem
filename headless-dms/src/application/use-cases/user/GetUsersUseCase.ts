import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import { UserApplicationService } from '../../services/UserApplicationService.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import type { GetUsersRequest, PaginatedUsersResponse } from '../../dto/user/index.js';
import { ApplicationError } from '../../errors/ApplicationError.js';

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject('UserApplicationService') private userApplicationService: UserApplicationService,
    @inject('ILogger') private logger: ILogger
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersUseCase' });
  }

  async execute(request: GetUsersRequest): Promise<Result<PaginatedUsersResponse, ApplicationError>> {
    this.logger.info('Getting users', { 
      page: request.page, 
      limit: request.limit, 
      search: request.search,
      role: request.role,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder
    });

    try {
      // Delegate to UserApplicationService
      const usersResult = await this.userApplicationService.getUsers();
      
      if (usersResult.isErr()) {
        this.logger.error('Failed to get users', { error: usersResult.unwrapErr().message });
        return usersResult;
      }

      const users = usersResult.unwrap();
      
      // Transform to response DTOs
      const userDtos = users.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // Build pagination info (simplified for now)
      const response: PaginatedUsersResponse = {
        users: userDtos,
        pagination: {
          page: request.page,
          limit: request.limit,
          total: users.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      this.logger.info('Users retrieved successfully', { 
        count: users.length,
        page: request.page 
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