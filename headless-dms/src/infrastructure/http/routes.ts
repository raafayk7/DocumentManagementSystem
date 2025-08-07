// src/http/routes.ts - HTTP route registration
import Fastify from 'fastify';
import authRoutes from './controllers/auth.routes.js';
import documentsRoutes from './controllers/documents.routes.js';

export async function registerRoutes(server: Fastify.FastifyInstance): Promise<void> {
  console.log('Registering HTTP routes...');

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

  console.log('HTTP routes registered successfully');
} 