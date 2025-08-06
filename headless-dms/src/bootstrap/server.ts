// src/bootstrap/server.ts - Server bootstrap (delegates to HTTP layer)
import { AppConfig } from './config.js';
import { setupHTTPServer } from '../http/server.js';

export async function setupServer(config: AppConfig): Promise<any> {
  console.log('Setting up server...');
  
  // Delegate to HTTP layer
  return await setupHTTPServer(config);
} 