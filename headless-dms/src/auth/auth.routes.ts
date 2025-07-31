import { FastifyInstance } from 'fastify';
import { RegisterSchema } from './dto/register.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { LoginSchema } from './dto/login.dto';
import { AuthService } from './auth.service';
import { container } from '../common/container';
import { ILogger } from '../common/services/logger.service.interface';
import { PaginationInputSchema } from '../common/dto/pagination.dto';
import { requireRole } from './roleGuard';
import { authenticateJWT } from './authenticate';

// Get service instances from DI container
const authService = container.resolve(AuthService);
const logger = container.resolve<ILogger>('ILogger').child({ component: 'AuthRoutes' });

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    logger.logRequest(request);
    
    try {
      const data = zodValidate(RegisterSchema, request.body);
      const user = await authService.register(data);
      logger.logResponse(reply, { statusCode: 201, userId: user.id });
      reply.code(201).send(user);
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
      logger.logResponse(reply, { statusCode: 200, userId: result.user.id });
      reply.code(200).send(result);
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
      logger.logResponse(reply, { 
        statusCode: 200, 
        resultCount: result.data.length,
        total: result.pagination.total,
        page: result.pagination.page
      });
      reply.send(result);
    } catch (err: any) {
      logger.error('User retrieval failed', { error: err.message, statusCode: err.statusCode || 400 });
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}