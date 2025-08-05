// src/bootstrap/routes.ts
import Fastify from 'fastify';
import authRoutes from '../auth/routes/auth.routes.js';
import documentsRoutes from '../documents/documents.routes.js';

export async function registerRoutes(server: Fastify.FastifyInstance): Promise<void> {
  console.log('Registering routes...');

  // Health check routes
  server.get('/ping', async (request, reply) => {
    return { pong: 'it works!' };
  });

  server.get('/health', async (request, reply) => {
    return { 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  });

  // Register application routes
  await server.register(documentsRoutes, { prefix: '/documents' });
  await server.register(authRoutes, { prefix: '/auth' });

  console.log('Routes registered successfully');
} 