import { FastifyInstance } from 'fastify';
import { RegisterSchema } from './dto/register.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { LoginSchema } from './dto/login.dto';
import { AuthService } from './auth.service';
import { DrizzleUserRepository } from './repositories/drizzle-user.repository';

// Create repository and service instances
const userRepository = new DrizzleUserRepository();
const authService = new AuthService(userRepository);

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    try {
      const data = zodValidate(RegisterSchema, request.body);
      const user = await authService.register(data);
      reply.code(201).send(user);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const data = zodValidate(LoginSchema, request.body);
      const result = await authService.login(data);
      reply.code(200).send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}