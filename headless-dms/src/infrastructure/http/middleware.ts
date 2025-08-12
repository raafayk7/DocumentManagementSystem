// src/http/middleware.ts - HTTP middleware setup
import { IHttpServer } from './interfaces/IHttpServer.js';

export async function registerMiddleware(server: IHttpServer): Promise<void> {
  console.log('Registering HTTP middleware...');

  // Register multipart for file uploads using the abstraction
  server.registerMiddleware({
    plugin: async (fastify: any) => {
      await fastify.register(await import('@fastify/multipart'), {
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      });
    }
  });

  console.log('HTTP middleware registered successfully');
} 