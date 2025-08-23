// src/infrastructure/http/route-handlers/auth.handlers.ts
import { IHttpRequest, IHttpResponse } from '../../../../ports/input/IHttpServer.js';
import { container } from '../../../../shared/di/container.js';
import { ILogger } from '../../../../ports/output/ILogger.js';
import { zodValidate } from '../../../../shared/dto/validation/technical/simple.validator.js';
import { AppResult } from '@carbonteq/hexapp';
import { PaginationInputSchema } from '../../../../shared/dto/common/pagination.dto.js';

// Import Use Cases
import { AuthenticateUserUseCase, CreateUserUseCase, GetUsersUseCase, GetUserByIdUseCase, ChangeUserRoleUseCase, DeleteUserUseCase, ChangeUserPasswordUseCase } from '../../../../application/use-cases/user/index.js';

// Get Use Case instances from DI container
const authenticateUserUseCase = container.resolve(AuthenticateUserUseCase);
const createUserUseCase = container.resolve(CreateUserUseCase);
const getUsersUseCase = container.resolve(GetUsersUseCase);
const getUserByIdUseCase = container.resolve(GetUserByIdUseCase);
const changeUserRoleUseCase = container.resolve(ChangeUserRoleUseCase);
const deleteUserUseCase = container.resolve(DeleteUserUseCase);
const changeUserPasswordUseCase = container.resolve(ChangeUserPasswordUseCase);

const logger = container.resolve<ILogger>('ILogger').child({ component: 'AuthHandlers' });

// POST /auth/login
export async function handleLogin(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('POST /auth/login request received');
  
  try {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authenticateUserUseCase.execute({ email, password });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Login failed', { error: error.message });
      res.status(401).send({ error: 'Invalid credentials' });
      return;
    }

    const authResult = result.unwrap();
    logger.info('Login successful', { statusCode: 200, userId: authResult.user.id });
    res.send({
      message: 'Login successful',
      token: authResult.token,
      user: authResult.user,
      expiresAt: authResult.expiresAt
    });
  } catch (err: any) {
    logger.error('Login failed', { error: err.message, statusCode: err.statusCode || 400 });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// POST /auth/register
export async function handleRegister(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('POST /auth/register request received');
  
  try {
    const { email, password, role } = req.body as { email: string; password: string; role: 'user' | 'admin' };
    const result = await createUserUseCase.execute({ email, password, role });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Registration failed', { error: error.message });
      res.status(400).send({ error: error.message });
      return;
    }

    const user = result.unwrap();
    logger.info('User registered successfully', { statusCode: 201, userId: user.id });
    res.status(201).send({
      message: 'User registered successfully',
      user
    });
  } catch (err: any) {
    logger.error('Registration failed', { error: err.message, statusCode: err.statusCode || 400 });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// GET /auth/users - Admin only
export async function handleGetUsers(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('GET /auth/users request received', { query: req.query });
  
  try {
    const { page, limit, sort, order, search, email, role } = req.query as any;
    
    // Parse pagination parameters
    const pagination = zodValidate(PaginationInputSchema, { page, limit, sort, order });
    
    const result = await getUsersUseCase.execute({ 
      page: parseInt(page) || 1, 
      limit: parseInt(limit) || 10, 
      sortBy: sort || 'createdAt', 
      sortOrder: order || 'desc',
      search,
      email,
      role
    });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('User retrieval failed', { error: error.message });
      res.status(500).send({ error: error.message });
      return;
    }

    const usersResult = result.unwrap();
    logger.info('Users retrieved successfully', { 
      statusCode: 200, 
      userCount: usersResult.users.length,
      total: usersResult.pagination.total,
      page: usersResult.pagination.page,
      filtersApplied: { search, email, role }
    });
    res.send(usersResult);
  } catch (err: any) {
    logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 500 });
    res.status(err.statusCode || 500).send({ error: err.message });
  }
}

// GET /auth/users/:id - Admin only
export async function handleGetUserById(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('GET /auth/users/:id request received', { params: req.params });
  
  try {
    const { id } = req.params as { id: string };
    const result = await getUserByIdUseCase.execute({ userId: id });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('User retrieval failed', { error: error.message, userId: id });
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const userResult = result.unwrap();
    logger.info('User retrieved successfully', { statusCode: 200, userId: id });
    res.send(userResult);
  } catch (err: any) {
    logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 404, userId: req.params.id });
    res.status(err.statusCode || 404).send({ error: err.message });
  }
}

// PATCH /auth/users/:id/role - Admin only
export async function handleChangeUserRole(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('PATCH /auth/users/:id/role request received', { params: req.params, body: req.body });
  
  try {
    const { id } = req.params as { id: string };
    const { newRole } = req.body as { newRole: 'user' | 'admin' };
    
    if (!newRole || !['user', 'admin'].includes(newRole)) {
      return res.status(400).send({ error: 'Valid role (user or admin) is required' });
    }
    
    // Get current user ID from JWT token
    const currentUserId = req.user?.sub;
    if (!currentUserId) {
      return res.status(401).send({ error: 'Authentication required' });
    }
    
    const result = await changeUserRoleUseCase.execute(id, currentUserId, { newRole });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('Role change failed', { error: error.message, userId: id });
      const statusCode = error.message.includes('not found') ? 404 : 400;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const userResult = result.unwrap();
    logger.info('User role updated successfully', { statusCode: 200, userId: id, newRole });
    res.send({ 
      message: userResult.message
    });
  } catch (err: any) {
    logger.error('Role change failed', { error: err.message, statusCode: err.statusCode || 400, userId: req.params.id });
    res.status(err.statusCode || 400).send({ error: err.message });
  }
}

// DELETE /auth/users/:id - Admin only
export async function handleDeleteUser(req: IHttpRequest, res: IHttpResponse): Promise<void> {
  logger.info('DELETE /auth/users/:id request received', { params: req.params });
  
  try {
    const { id } = req.params as { id: string };
    const result = await deleteUserUseCase.execute({ 
      userId: id,
      currentUserId: req.user?.sub
    });
    
    if (result.isErr()) {
      const error = result.unwrapErr();
      logger.error('User deletion failed', { error: error.message, userId: id });
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).send({ error: error.message });
      return;
    }

    const deleteResult = result.unwrap();
    logger.info('User deleted successfully', { statusCode: 200, userId: id });
    res.send({ message: deleteResult.message });
  } catch (err: any) {
    logger.error('User deletion failed', { error: err.message, statusCode: err.statusCode || 500, userId: req.params.id });
    res.status(err.statusCode || 500).send({ error: err.message });
  }
}

  // PATCH /auth/users/:id/password - Admin only
  export async function handleChangeUserPassword(req: IHttpRequest, res: IHttpResponse): Promise<void> {
    logger.info('PATCH /auth/users/:id/password request received', { params: req.params });
    
    try {
      const { id } = req.params as { id: string };
      const { newPassword, currentPassword } = req.body as { newPassword: string; currentPassword: string };
      
      if (!newPassword) {
        return res.status(400).send({ error: 'New password is required' });
      }
      
      const result = await changeUserPasswordUseCase.execute(id, { 
        newPassword,
        currentPassword: currentPassword || 'admin_override' // For admin password changes
      });
      
      if (result.isErr()) {
        const error = result.unwrapErr();
        logger.error('Password change failed', { error: error.message, userId: id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).send({ error: error.message });
        return;
      }

      const passwordResult = result.unwrap();
      logger.info('Password changed successfully', { statusCode: 200, userId: id });
      res.send({ 
        message: passwordResult.message
      });
    } catch (err: any) {
      logger.error('Password change failed', { error: err.message, statusCode: err.statusCode || 400, userId: req.params.id });
      res.status(err.statusCode || 400).send({ error: err.message });
    }
  }

  // ============================================================================
  // DEPRECATED METHODS - Kept for reference and completeness
  // ============================================================================
  
  // No deprecated methods in auth routes - all methods are current and active 