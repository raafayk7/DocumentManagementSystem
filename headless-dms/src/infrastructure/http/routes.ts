// src/http/routes.ts - HTTP route registration using abstraction
import { IHttpServer } from './interfaces/IHttpServer.js';
import { 
  handleLogin, 
  handleRegister, 
  handleGetUsers, 
  handleGetUserById, 
  handleChangeUserRole, 
  handleDeleteUser, 
  handleChangeUserPassword 
} from './route-handlers/auth.handlers.js';
import { 
  handleGetDocuments, 
  handleGetDocumentById, 
  handleUpdateDocument, 
  handleDeleteDocument, 
  handleUploadDocument, 
  handleGenerateDownloadLink, 
  handleDownloadByToken 
} from './route-handlers/documents.handlers.js';
import { authenticateJWT } from './middleware/authenticate.js';
import { requireRole } from './middleware/roleGuard.js';

export async function registerRoutes(server: IHttpServer): Promise<void> {
  console.log('Registering HTTP routes...');

  // Health check routes using abstraction
  server.registerRoute('GET', '/ping', async (request: any, response: any) => {
    response.send({ pong: 'it works!' });
  });

  server.registerRoute('GET', '/health', async (request: any, response: any) => {
    response.send({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  });

  // Auth routes using abstraction
  server.registerRoute('POST', '/auth/login', handleLogin); // Public
  server.registerRoute('POST', '/auth/register', handleRegister); // Public
  server.registerRoute('GET', '/auth/users', handleGetUsers, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('GET', '/auth/users/:id', handleGetUserById, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('PATCH', '/auth/users/:id/role', handleChangeUserRole, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('DELETE', '/auth/users/:id', handleDeleteUser, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('PATCH', '/auth/users/:id/password', handleChangeUserPassword, [authenticateJWT, requireRole('admin')]); // Admin only

  // Document routes using abstraction
  server.registerRoute('GET', '/documents', handleGetDocuments, [authenticateJWT]); // Protected
  server.registerRoute('GET', '/documents/:id', handleGetDocumentById, [authenticateJWT]); // Protected
  server.registerRoute('PATCH', '/documents/:id', handleUpdateDocument, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('DELETE', '/documents/:id', handleDeleteDocument, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('POST', '/documents/upload', handleUploadDocument, [authenticateJWT, requireRole('admin')]); // Admin only
  server.registerRoute('GET', '/documents/:id/download-link', handleGenerateDownloadLink, [authenticateJWT]); // Protected
  server.registerRoute('GET', '/documents/download', handleDownloadByToken); // Public (token-based)

  console.log('HTTP routes registered successfully');
} 