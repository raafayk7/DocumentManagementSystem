// src/http/server.ts - HTTP server setup
import Fastify from 'fastify';
import { AppConfig } from '../bootstrap/config.js';
import { registerMiddleware } from './middleware.js';
import { registerRoutes } from './routes.js';
import { setupSignalHandlers } from '../bootstrap/signals.js';

export async function setupHTTPServer(config: AppConfig): Promise<Fastify.FastifyInstance> {
  console.log('Setting up HTTP server...');

  // Create Fastify instance
  const server = Fastify({ 
    logger: true,
    trustProxy: true,
  });

  try {
    // Register middleware
    await registerMiddleware(server);

    // Register routes
    await registerRoutes(server);

    // Setup signal handlers
    setupSignalHandlers(server);

    // Start server
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    });

    console.log(`Server listening on http://${config.HOST}:${config.PORT}`);
    
    // Log routes
    server.ready(() => {
      console.log(server.printRoutes());
    });

    return server;
  } catch (error) {
    console.error('Failed to setup HTTP server:', error);
    throw error;
  }
} 