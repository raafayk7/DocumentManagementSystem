// src/http/server.ts - HTTP server setup using abstraction
import Fastify from 'fastify';
import { AppConfig } from '../bootstrap/config.js';
import { registerMiddleware } from './middleware.js';
import { registerRoutes } from './routes.js';
import { setupSignalHandlers } from '../bootstrap/signals.js';
import { FastifyHttpServer } from './implementations/FastifyHttpServer.js';
import { IHttpServer } from './interfaces/IHttpServer.js';

export async function setupHTTPServer(config: AppConfig): Promise<IHttpServer> {
  console.log('Setting up HTTP server...');

  // Create Fastify instance
  const fastifyInstance = Fastify({ 
    logger: true,
    trustProxy: true,
  });

  // Wrap with our abstraction
  const server: IHttpServer = new FastifyHttpServer(fastifyInstance);

  try {
    // Register middleware through abstraction
    await registerMiddleware(server);

    // Register routes through abstraction
    await registerRoutes(server);

    // Setup signal handlers using abstraction
    setupSignalHandlers(server);

    // Start server through abstraction
    await server.start(config.PORT, config.HOST);
    
    // Log routes using abstraction
    server.logRoutes();

    return server;
  } catch (error) {
    console.error('Failed to setup HTTP server:', error);
    throw error;
  }
} 