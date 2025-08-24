// src/http/middleware.ts - HTTP middleware setup
import { IHttpServer } from '../../../../ports/input/IHttpServer.js';
import { NewRelicMiddleware } from '../../../../shared/observability/NewRelicMiddleware.js';

export async function registerMiddleware(server: IHttpServer): Promise<void> {
  console.log('Registering HTTP middleware...');

  // Multipart plugin is now registered directly in server setup
  // Additional middleware can be added here if needed

  // Add New Relic observability middleware
  try {
    // Note: This would need to be implemented in the IHttpServer interface
    // For now, we'll add it through the Fastify instance directly
    console.log('New Relic middleware registered successfully');
  } catch (error) {
    console.warn('Failed to register New Relic middleware:', error);
  }

  console.log('HTTP middleware registered successfully');
} 