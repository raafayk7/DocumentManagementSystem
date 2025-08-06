import { FastifyInstance } from 'fastify';
import { container } from '../../di/container.js';
import { IAuthHandler } from '../interfaces/IAuthHandler.js';
import { ILogger } from '../../common/services/logger.service.interface.js';
import { authenticateJWT, requireRole } from '../middleware/index.js';
import { LoginSchema, LoginDto } from '../dto/login.dto.js';
import { RegisterSchema, RegisterDto } from '../dto/register.dto.js';
import { zodValidate } from '../../pipes/zod-validation.pipe.js';
import { matchRes, Result } from '@carbonteq/fp';
import { IUserRepository } from '../repositories/user.repository.interface.js';
import { PaginationInputSchema } from '../../common/dto/pagination.dto.js';

// Get service instances from DI container
const authHandler = container.resolve<IAuthHandler>('IAuthHandler');
const userRepository = container.resolve<IUserRepository>('IUserRepository');
const logger = container.resolve<ILogger>('ILogger').child({ component: 'AuthRoutes' });

export default async function authRoutes(app: FastifyInstance) {
  // POST /auth/login
  app.post('/login', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const loginData = zodValidate(LoginSchema, request.body);
      const result = await authHandler.login(loginData);
      
      matchRes(result, {
        Ok: (authResult) => {
          logger.logResponse(reply, { statusCode: 200, userId: authResult.user.id });
          reply.send({
            message: 'Login successful',
            token: authResult.token,
            user: authResult.user,
            expiresAt: authResult.expiresAt
          });
        },
        Err: async (error) => {
          logger.error('Login failed', { error: error.message, operation: error.operation });
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
    logger.logRequest(request);
    
    try {
      const registerData = zodValidate(RegisterSchema, request.body);
      const result = await authHandler.register(registerData);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 201, userId: user.id });
          reply.code(201).send({
            message: 'User registered successfully',
            user
          });
        },
        Err: async (error) => {
          logger.error('Registration failed', { error: error.message, operation: error.operation });
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
    logger.logRequest(request);
    
    try {
      const { page, limit, sort, order } = request.query as any;
      
      // Parse pagination parameters
      const pagination = zodValidate(PaginationInputSchema, { page, limit, sort, order });
      
      const users = await userRepository.find(undefined, pagination);
      
      logger.logResponse(reply, { statusCode: 200, userCount: users.data.length });
      reply.send(users);
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 500 });
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // GET /auth/users/:id - Admin only
  app.get('/users/:id', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const user = await userRepository.findById(id);
      
      if (!user) {
        logger.error('User not found', { userId: id });
        return reply.code(404).send({ error: 'User not found' });
      }
      
      logger.logResponse(reply, { statusCode: 200, userId: id });
      reply.send(user);
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 404, userId: (request.params as any).id });
      reply.code(err.statusCode || 404).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/role - Admin only
  app.patch('/users/:id/role', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const { newRole } = request.body as { newRole: 'user' | 'admin' };
      
      if (!newRole || !['user', 'admin'].includes(newRole)) {
        return reply.code(400).send({ error: 'Valid role (user or admin) is required' });
      }
      
      const result = await authHandler.changeUserRole(id, newRole);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 200, userId: id, newRole });
          reply.send({ 
            message: 'User role updated successfully', 
            user 
          });
        },
        Err: async (error) => {
          logger.error('Role change failed', { error: error.message, operation: error.operation, userId: id });
          const statusCode = error.operation.includes('userNotFound') ? 404 : 400;
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
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const deleted = await userRepository.delete(id);
      
      if (!deleted) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      logger.logResponse(reply, { statusCode: 200, userId: id });
      reply.send({ message: 'User deleted successfully' });
    } catch (err: any) {
      logger.error('User deletion failed', { error: err.message, statusCode: err.statusCode || 500, userId: (request.params as any).id });
      reply.code(err.statusCode || 500).send({ error: err.message });
    }
  });

  // PATCH /auth/users/:id/password - Admin only
  app.patch('/users/:id/password', { 
    preHandler: [authenticateJWT, requireRole('admin')]  
  }, async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const { id } = request.params as { id: string };
      const { newPassword } = request.body as { newPassword: string };
      
      if (!newPassword) {
        return reply.code(400).send({ error: 'New password is required' });
      }
      
      const result = await authHandler.changeUserPassword(id, newPassword);
      
      matchRes(result, {
        Ok: (user) => {
          logger.logResponse(reply, { statusCode: 200, userId: id });
          reply.send({ 
            message: 'Password changed successfully', 
            user 
          });
        },
        Err: async (error) => {
          logger.error('Password change failed', { error: error.message, operation: error.operation, userId: id });
          const statusCode = error.operation.includes('userNotFound') ? 404 : 400;
          reply.code(statusCode).send({ error: error.message });
        }
      });
    } catch (err: any) {
      logger.error('Password change failed', { error: err.message, statusCode: err.statusCode || 400, userId: (request.params as any).id });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}