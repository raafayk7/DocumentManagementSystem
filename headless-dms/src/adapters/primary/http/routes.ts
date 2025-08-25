// src/http/routes.ts - HTTP route registration using abstraction
import { IHttpServer } from '../../../ports/input/IHttpServer.js';
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
import { MetricsEndpoint } from '../../../shared/observability/metrics/metrics.endpoint.js';
import { PerformanceEndpoint } from '../../../shared/observability/performance/performance.endpoint.js';

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

  // Phase 5: Metrics and Performance Monitoring Endpoints
  console.log('Setting up Phase 5 metrics and performance endpoints...');
  
  // Metrics endpoints
  const metricsEndpoint = MetricsEndpoint.create({
    requireAuth: false, // Public for demo
    includeNewRelicStatus: true,
    includeSystemMetrics: true
  });

  // Storage strategy endpoint
  server.registerRoute('GET', '/storage/status', async (request: any, response: any) => {
    try {
      const container = (await import('../../../shared/di/container.js')).container;
      const factory = container.resolve('StorageStrategyFactory');
      
      const status = factory.getStatus();
      const allHealth = factory.getAllStrategyHealth();
      
      response.send({
        timestamp: new Date().toISOString(),
        success: true,
        data: {
          status,
          strategies: Array.from(allHealth.entries()).map(([id, health]) => ({
            id,
            health: health.status,
            responseTime: health.responseTime,
            successRate: health.successRate,
            availableCapacity: health.availableCapacity,
            totalCapacity: health.totalCapacity,
            lastChecked: health.lastChecked
          }))
        }
      });
    } catch (error) {
      response.send({
        timestamp: new Date().toISOString(),
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  server.registerRoute('GET', '/metrics', async (request: any, response: any) => {
    await metricsEndpoint.getMetrics(request, response);
    // Response already sent by the endpoint
  });

  server.registerRoute('GET', '/metrics/summary', async (request: any, response: any) => {
    await metricsEndpoint.getMetricsSummary(request, response);
    // Response already sent by the endpoint
  });

  server.registerRoute('GET', '/metrics/health', async (request: any, response: any) => {
    await metricsEndpoint.getHealthMetrics(request, response);
    // Response already sent by the endpoint
  });

  // Performance monitoring endpoints
  const performanceEndpoint = PerformanceEndpoint.create({
    includeNewRelicStatus: true,
    includeConfiguration: true,
    includeHealthChecks: true
  });

  server.registerRoute('GET', '/performance/metrics', async (request: any, response: any) => {
    const metrics = await performanceEndpoint.getPerformanceMetrics(request, response);
    // Response already sent by the endpoint
  });

  server.registerRoute('GET', '/performance/config', async (request: any, response: any) => {
    const config = await performanceEndpoint.getConfiguration(request, response);
    // Response already sent by the endpoint
  });

  server.registerRoute('GET', '/performance/health', async (request: any, response: any) => {
    const health = await performanceEndpoint.getHealthStatus(request, response);
    // Response already sent by the endpoint
  });

  server.registerRoute('GET', '/performance/status', async (request: any, response: any) => {
    const status = await performanceEndpoint.getStatus(request, response);
    // Response already sent by the endpoint
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