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
}