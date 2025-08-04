import { FastifyInstance } from 'fastify';
import { RegisterSchema } from './dto/register.dto.js';
import { zodValidate } from '../pipes/zod-validation.pipe.js';
import { LoginSchema } from './dto/login.dto.js';
import { AuthService } from './auth.service.js';
import { container } from '../common/container.js';
import { ILogger } from '../common/services/logger.service.interface.js';
import { PaginationInputSchema } from '../common/dto/pagination.dto.js';
import { requireRole } from './roleGuard.js';
import { authenticateJWT } from './authenticate.js';
import { matchRes } from '@carbonteq/fp';

// Get service instances from DI container
const authService = container.resolve(AuthService);
const logger = container.resolve<ILogger>('ILogger').child({ component: 'AuthRoutes' });

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const data = zodValidate(RegisterSchema, request.body);
      const result = await authService.register(data);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 201, userId: user.id });
      reply.code(201).send(user);
        },
        Err: (error) => {
          logger.error('User registration failed', { error: error.message, operation: error.operation });
          reply.code(400).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User registration failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const data = zodValidate(LoginSchema, request.body);
      const result = await authService.login(data);
      
      matchRes(result, {
        Ok: (loginResult) => {
          logger.logResponse(reply, { statusCode: 200, userId: loginResult.user.id });
          reply.code(200).send(loginResult);
        },
        Err: (error) => {
          logger.error('User login failed', { error: error.message, operation: error.operation });
          const statusCode = error.operation.includes('findUser') || error.operation.includes('validatePassword') ? 401 : 400;
          reply.code(statusCode).send({ error: 'Invalid credentials' });
        }
      });
    } catch (err: any) {
      logger.error('User login failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // GET /auth/users - Admin only (protected route)
  app.get('/auth/users', { 
    preHandler: [authenticateJWT, requireRole('admin')] 
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { email, role, page, limit, sort, order } = request.query as any;
      
      // Parse pagination parameters
      const pagination = zodValidate(PaginationInputSchema, { page, limit, sort, order });
      
      // Parse filter parameters
      const query = { email, role };
      
      const result = await authService.findAllUsers(query, pagination);
      
      matchRes(result, {
        Ok: (usersResult) => {
          logger.logResponse(reply, { 
            statusCode: 200, 
            resultCount: usersResult.data.length,
            total: usersResult.pagination.total,
            page: usersResult.pagination.page
          });
          reply.send(usersResult);
        },
        Err: (error) => {
          logger.error('User retrieval failed', { error: error.message, operation: error.operation });
          reply.code(500).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // DELETE /auth/users/:id - Admin only (protected route)
  app.delete('/auth/users/:id', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      
      const result = await authService.removeUser(id);
      
      matchRes(result, {
        Ok: (deleteResult) => {
          logger.logResponse(reply, { statusCode: 200, userId: id });
          reply.send(deleteResult);
        },
        Err: (error) => {
          logger.error('User deletion failed', { error: error.message, operation: error.operation, userId: id });
          const statusCode = error.operation.includes('removeUser') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User deletion failed', { error: err.message, statusCode: err.statusCode || 404, userId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // GET /auth/users/:id - Admin only (protected route)
  app.get('/auth/users/:id', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      
      const result = await authService.getUserById(id);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 200, userId: id });
          reply.send(user);
        },
        Err: (error) => {
          logger.error('User retrieval failed', { error: error.message, operation: error.operation, userId: id });
          const statusCode = error.operation.includes('getUserById') && error.message.includes('not found') ? 404 : 500;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 404, userId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/password - Admin only (protected route)
  app.patch('/auth/users/:id/password', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const { newPassword } = request.body as { newPassword: string };
      
      const result = await authService.changeUserPassword(id, newPassword);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 200, userId: id });
          reply.send({ message: 'Password changed successfully', user });
        },
        Err: (error) => {
          logger.error('Password change failed', { error: error.message, operation: error.operation, userId: id });
          const statusCode = error.operation.includes('changeUserPassword') && error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Password change failed', { error: err.message, statusCode: err.statusCode || 400, userId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/role - Admin only (protected route)
  app.patch('/auth/users/:id/role', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const { newRole } = request.body as { newRole: 'user' | 'admin' };
      
      const result = await authService.changeUserRole(id, newRole);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 200, userId: id, newRole });
          reply.send({ message: 'Role changed successfully', user });
        },
        Err: (error) => {
          logger.error('Role change failed', { error: error.message, operation: error.operation, userId: id, newRole });
          const statusCode = error.operation.includes('changeUserRole') && error.message.includes('not found') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Role change failed', { error: err.message, statusCode: err.statusCode || 400, userId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}