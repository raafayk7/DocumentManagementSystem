import { FastifyInstance } from 'fastify';
import { container } from '../../di/container.js';
import { ILogger } from '../../../infrastructure/interfaces/ILogger.js';
import { authenticateJWT, requireRole } from '../middleware/index.js';
import { zodValidate } from '../../../validation/technical/simple.validator.js';
import { matchRes, Result } from '@carbonteq/fp';
import { PaginationInputSchema } from '../../../common/dto/pagination.dto.js';

// Import Use Cases
import { AuthenticateUserUseCase, CreateUserUseCase, GetUsersUseCase, GetUserByIdUseCase, ChangeUserRoleUseCase, DeleteUserUseCase, ChangeUserPasswordUseCase } from '../../../application/use-cases/user/index.js';

// Get Use Case instances from DI container
const authenticateUserUseCase = container.resolve(AuthenticateUserUseCase);
const createUserUseCase = container.resolve(CreateUserUseCase);
const getUsersUseCase = container.resolve(GetUsersUseCase);
const getUserByIdUseCase = container.resolve(GetUserByIdUseCase);
const changeUserRoleUseCase = container.resolve(ChangeUserRoleUseCase);
const deleteUserUseCase = container.resolve(DeleteUserUseCase);
const changeUserPasswordUseCase = container.resolve(ChangeUserPasswordUseCase);

const logger = container.resolve<ILogger>('ILogger').child({ component: 'AuthRoutes' });

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (request, reply) => {
    logger.info('POST /auth/login request received');
    
    try {
      const { email, password } = request.body as { email: string; password: string };
      const result = await authenticateUserUseCase.execute({ email, password });
      
      matchRes(result, {
        Ok: (authResult) => {
          logger.info('Login successful', { statusCode: 200, userId: authResult.user.id });
          reply.send({
            message: 'Login successful',
            token: authResult.token,
            user: authResult.user,
            expiresAt: authResult.expiresAt
          });
        },
        Err: async (error) => {
          logger.error('Login failed', { error: error.message });
          reply.code(401).send({ error: 'Invalid credentials' });
        }
      });
    } catch (err: any) {
      logger.error('Login failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // POST /auth/register
  app.post('/register', async (request, reply) => {
    logger.info('POST /auth/register request received');
    
    try {
      const { email, password, role } = request.body as { email: string; password: string; role: 'user' | 'admin' };
      const result = await createUserUseCase.execute({ email, password, role });
      
      matchRes(result, {
        Ok: (user) => {
          logger.info('User registered successfully', { statusCode: 201, userId: user.id });
          reply.code(201).send({
            message: 'User registered successfully',
            user
          });
        },
        Err: async (error) => {
          logger.error('Registration failed', { error: error.message });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Registration failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /auth/users - Admin only
  app.get('/users', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.info('GET /auth/users request received', { query: request.query });
    
    try {
      const { page, limit, sort, order, search, email, role } = request.query as any;
      
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
      
      matchRes(result, {
        Ok: (usersResult) => {
          logger.info('Users retrieved successfully', { 
            statusCode: 200, 
            userCount: usersResult.users.length,
            total: usersResult.pagination.total,
            page: usersResult.pagination.page,
            filtersApplied: { search, email, role }
          });
          reply.send(usersResult);
        },
        Err: (error) => {
          logger.error('User retrieval failed', { error: error.message });
          reply.code(500).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 500 });
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // GET /auth/users/:id - Admin only
  app.get('/users/:id', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.info('GET /auth/users/:id request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const result = await getUserByIdUseCase.execute({ userId: id });
      
      matchRes(result, {
        Ok: (userResult) => {
          logger.info('User retrieved successfully', { statusCode: 200, userId: id });
          reply.send(userResult);
        },
        Err: (error) => {
          logger.error('User retrieval failed', { error: error.message, userId: id });
          const statusCode = error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 404, userId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/role - Admin only
  app.patch('/users/:id/role', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.info('PATCH /auth/users/:id/role request received', { params: request.params, body: request.body });
    
    try {
      const { id } = request.params as { id: string };
      const { newRole } = request.body as { newRole: 'user' | 'admin' };
      
      if (!newRole || !['user', 'admin'].includes(newRole)) {
        return reply.code(400).send({ error: 'Valid role (user or admin) is required' });
      }
      
      const result = await changeUserRoleUseCase.execute({ 
        userId: id, 
        newRole,
        currentUserId: (request.user as any).id
      });
      
      matchRes(result, {
        Ok: (userResult) => {
          logger.info('User role updated successfully', { statusCode: 200, userId: id, newRole });
          reply.send({ 
            message: userResult.message
          });
        },
        Err: async (error) => {
          logger.error('Role change failed', { error: error.message, userId: id });
          const statusCode = error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Role change failed', { error: err.message, statusCode: err.statusCode || 400, userId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /auth/users/:id - Admin only
  app.delete('/users/:id', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.info('DELETE /auth/users/:id request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const result = await deleteUserUseCase.execute({ 
        userId: id,
        currentUserId: (request.user as any).id
      });
      
      matchRes(result, {
        Ok: (deleteResult) => {
          logger.info('User deleted successfully', { statusCode: 200, userId: id });
          reply.send({ message: deleteResult.message });
        },
        Err: (error) => {
          logger.error('User deletion failed', { error: error.message, userId: id });
          const statusCode = error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User deletion failed', { error: err.message, statusCode: err.statusCode || 500, userId: (request.params as any).id });
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/password - Admin only
  app.patch('/users/:id/password', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.info('PATCH /auth/users/:id/password request received', { params: request.params });
    
    try {
      const { id } = request.params as { id: string };
      const { newPassword, currentPassword } = request.body as { newPassword: string; currentPassword: string };
      
      if (!newPassword) {
        return reply.code(400).send({ error: 'New password is required' });
      }
      
      const result = await changeUserPasswordUseCase.execute({ 
        userId: id, 
        newPassword,
        currentPassword: currentPassword || 'admin_override' // For admin password changes
      });
      
      matchRes(result, {
        Ok: (passwordResult) => {
          logger.info('Password changed successfully', { statusCode: 200, userId: id });
          reply.send({ 
            message: passwordResult.message
          });
        },
        Err: async (error) => {
          logger.error('Password change failed', { error: error.message, userId: id });
          const statusCode = error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Password change failed', { error: err.message, statusCode: err.statusCode || 400, userId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}