import { injectable, inject } from 'tsyringe';
import { Result } from '@carbonteq/fp';
import type { IUserRepository } from '../../../auth/repositories/user.repository.interface.js';
import type { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
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
      role: request.role,
      sortBy: request.sortBy,
      sortOrder: request.sortOrder
    });

    try {
      // 1. Build query parameters
      const queryParams = {
        page: request.page,
        limit: request.limit,
        search: request.search,
        role: request.role,
        sortBy: request.sortBy,
        sortOrder: request.sortOrder,
      };

      // 2. Get paginated users from repository
      const result = await this.userRepository.findPaginated(queryParams);
      
      // 3. Transform to response DTOs
      const users = result.items.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      // 4. Build pagination info
      const totalPages = Math.ceil(result.total / request.limit);
      const hasNext = request.page < totalPages;
      const hasPrev = request.page > 1;

      const response: PaginatedUsersResponse = {
        users,
        pagination: {
          page: request.page,
          limit: request.limit,
          total: result.total,
          totalPages,
          hasNext,
          hasPrev,
        },
      };

      this.logger.info('Users retrieved successfully', { 
        count: users.length, 
        total: result.total,
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