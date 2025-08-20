// src/http/middleware.ts - HTTP middleware setup
import { IHttpServer } from '../../../../ports/input/IHttpServer.js';

export async function registerMiddleware(server: IHttpServer): Promise<void> {
  console.log('Registering HTTP middleware...');

  // Multipart plugin is now registered directly in server setup
  // Additional middleware can be added here if needed

  console.log('HTTP middleware registered successfully');
} 