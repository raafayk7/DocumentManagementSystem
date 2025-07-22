import { FastifyInstance } from 'fastify';
import { RegisterSchema } from './dto/register.dto';
import { zodValidate } from '../pipes/zod-validation.pipe';
import { register } from './auth.service';
import { LoginSchema } from './dto/login.dto';
import { login } from './auth.service';

export default async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    try {
      const data = zodValidate(RegisterSchema, request.body);
      const user = await register(data);
      reply.code(201).send(user);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    try {
      const data = zodValidate(LoginSchema, request.body);
      const result = await login(data);
      reply.code(200).send(result);
    } catch (err: any) {
      reply.code(err.statusCode || 400).send({ error: err.message });
    }
  });
}