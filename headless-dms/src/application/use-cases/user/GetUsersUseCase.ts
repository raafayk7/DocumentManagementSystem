import { injectable, inject } from 'tsyringe';
import { AppResult, AppError } from '@carbonteq/hexapp';
import { GetUsersRequest, GetUsersResponse } from '../../../shared/dto/user/index.js';
import type { IUserApplicationService } from '../../../ports/input/IUserApplicationService.js';
import type { ILogger } from '../../../ports/output/ILogger.js';
import { calculatePaginationMetadata } from '../../../shared/dto/common/pagination.dto.js';

@injectable()
export class GetUsersUseCase {
  constructor(
    @inject('IUserApplicationService') private userApplicationService: IUserApplicationService,
    @inject('ILogger') private logger: ILogger,
  ) {
    this.logger = this.logger.child({ useCase: 'GetUsersUseCase' });
  }

  async execute(request: GetUsersRequest): Promise<AppResult<GetUsersResponse>> {
    this.logger.info('Executing get users use case', { 
      page: request.page, 
      limit: request.limit,
      role: request.role,
      email: request.email
    });

    try {
      const usersResult = await this.userApplicationService.getUsers(
        request.page,
        request.limit,
        request.role
      );
      
      if (usersResult.isErr()) {
        this.logger.warn('Users retrieval failed', { 
          page: request.page, 
          limit: request.limit,
          role: request.role,
          email: request.email
        });
        return AppResult.Err(AppError.InvalidOperation(
          `Users retrieval failed with page: ${request.page}, limit: ${request.limit}`
        ));
      }

      const users = usersResult.unwrap();
      const response: GetUsersResponse = {
        users: users.map(user => ({
          id: user.id,
          email: user.email.value,
          role: user.role.value,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        })),
        pagination: calculatePaginationMetadata(request.page, request.limit, users.length)
      };

      this.logger.info('Users retrieved successfully', { 
        userCount: users.length, 
        page: request.page, 
        limit: request.limit 
      });
      return AppResult.Ok(response);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Unknown error', { 
        page: request.page, 
        limit: request.limit,
        role: request.role,
        email: request.email
      });
      return AppResult.Err(AppError.Generic(
        `Failed to execute get users use case with page: ${request.page}, limit: ${request.limit}`
      ));
    }
  }
} 