// src/http/middleware.ts - HTTP middleware setup
import Fastify from 'fastify';
import fastifyMultipart from '@fastify/multipart';

export async function registerMiddleware(server: Fastify.FastifyInstance): Promise<void> {
  console.log('Registering HTTP middleware...');

  // Register multipart for file uploads
  await server.register(fastifyMultipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  console.log('HTTP middleware registered successfully');
} 