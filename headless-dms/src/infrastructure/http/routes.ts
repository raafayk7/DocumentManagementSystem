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
  server.registerRoute('POST', '/auth/login', handleLogin);
  server.registerRoute('POST', '/auth/register', handleRegister);
  server.registerRoute('GET', '/auth/users', handleGetUsers);
  server.registerRoute('GET', '/auth/users/:id', handleGetUserById);
  server.registerRoute('PATCH', '/auth/users/:id/role', handleChangeUserRole);
  server.registerRoute('DELETE', '/auth/users/:id', handleDeleteUser);
  server.registerRoute('PATCH', '/auth/users/:id/password', handleChangeUserPassword);

  // Document routes using abstraction
  server.registerRoute('GET', '/documents', handleGetDocuments);
  server.registerRoute('GET', '/documents/:id', handleGetDocumentById);
  server.registerRoute('PATCH', '/documents/:id', handleUpdateDocument);
  server.registerRoute('DELETE', '/documents/:id', handleDeleteDocument);
  server.registerRoute('POST', '/documents/upload', handleUploadDocument);
  server.registerRoute('GET', '/documents/:id/download-link', handleGenerateDownloadLink);
  server.registerRoute('GET', '/documents/download', handleDownloadByToken);

  console.log('HTTP routes registered successfully');
} 