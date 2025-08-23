// src/infrastructure/http/implementations/FastifyHttpServer.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IHttpServer, IHttpRequest, IHttpResponse } from '../../../../ports/input/IHttpServer.js';

// Fastify-specific request wrapper
class FastifyHttpRequest implements IHttpRequest {
  constructor(private fastifyRequest: FastifyRequest) {}

  get body(): any {
    return this.fastifyRequest.body;
  }

  get params(): Record<string, string> {
    return this.fastifyRequest.params as Record<string, string>;
  }

  get query(): Record<string, string> {
    return this.fastifyRequest.query as Record<string, string>;
  }

  get headers(): Record<string, string> {
    return this.fastifyRequest.headers as Record<string, string>;
  }

  get method(): string {
    return this.fastifyRequest.method;
  }

  get url(): string {
    return this.fastifyRequest.url;
  }

  get user(): any {
    // Access user from Fastify request (set by auth middleware)
    return (this.fastifyRequest as any).user;
  }

  async file(): Promise<any> {
    // Access file from multipart request
    return (this.fastifyRequest as any).file();
  }

  parts(): AsyncIterable<any> {
    // Access all parts from multipart request
    return (this.fastifyRequest as any).parts();
  }
}

// Fastify-specific response wrapper
class FastifyHttpResponse implements IHttpResponse {
  constructor(private fastifyReply: FastifyReply) {}

  status(code: number): IHttpResponse {
    this.fastifyReply.status(code);
    return this;
  }

  code(statusCode: number): IHttpResponse {
    this.fastifyReply.code(statusCode);
    return this;
  }

  send(data: any): void {
    this.fastifyReply.send(data);
  }

  header(name: string, value: string): IHttpResponse {
    this.fastifyReply.header(name, value);
    return this;
  }
}

// Main Fastify HTTP server implementation
export class FastifyHttpServer implements IHttpServer {
  private server: FastifyInstance;

  constructor(fastifyInstance: FastifyInstance) {
    this.server = fastifyInstance;
  }

  async start(port: number, host: string = '0.0.0.0'): Promise<void> {
    try {
      await this.server.listen({ port, host });
      console.log(`Server listening on http://${host}:${port}`);
    } catch (error) {
      console.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.server.close();
      console.log('Server stopped successfully');
    } catch (error) {
      console.error('Failed to stop server:', error);
      throw error;
    }
  }

  registerRoute(method: string, path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>, middleware?: any[]): void {
    // Convert our interface-based handler to Fastify-compatible handler
    const fastifyHandler = async (fastifyRequest: FastifyRequest, fastifyReply: FastifyReply) => {
      try {
        const request = new FastifyHttpRequest(fastifyRequest);
        const response = new FastifyHttpResponse(fastifyReply);
        
        await handler(request, response);
      } catch (error: any) {
        console.error('Route handler error:', error);
        
        // Try to extract meaningful error information
        let errorMessage = 'Internal server error';
        let statusCode = 500;
        
        if (error.message) {
          errorMessage = error.message;
        }
        
        if (error.statusCode) {
          statusCode = error.statusCode;
        }
        
        // Check if it's a validation error
        if (error.validation) {
          statusCode = 400;
          errorMessage = error.message || 'Validation error';
        }
        
        // Check if it's an authentication error
        if (error.statusCode === 401) {
          statusCode = 401;
          errorMessage = error.message || 'Authentication required';
        }
        
        // Check if it's an authorization error
        if (error.statusCode === 403) {
          statusCode = 403;
          errorMessage = error.message || 'Insufficient permissions';
        }
        
        // Check if it's a not found error
        if (error.statusCode === 404) {
          statusCode = 404;
          errorMessage = error.message || 'Resource not found';
        }
        
        fastifyReply.status(statusCode).send({ 
          error: errorMessage,
          statusCode,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Prepare route options with middleware if provided
    const routeOptions: any = {};
    if (middleware && middleware.length > 0) {
      routeOptions.preHandler = middleware;
    }

    // Register the route with Fastify
    switch (method.toLowerCase()) {
      case 'get':
        this.server.get(path, routeOptions, fastifyHandler);
        break;
      case 'post':
        this.server.post(path, routeOptions, fastifyHandler);
        break;
      case 'put':
        this.server.put(path, routeOptions, fastifyHandler);
        break;
      case 'patch':
        this.server.patch(path, routeOptions, fastifyHandler);
        break;
      case 'delete':
        this.server.delete(path, routeOptions, fastifyHandler);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  registerMiddleware(middleware: any): void {
    if (typeof middleware === 'function') {
      // Traditional middleware function
      this.server.addHook('preHandler', middleware as any);
    } else if (middleware.plugin) {
      // Fastify plugin - handle multipart specifically
      if (middleware.plugin.toString().includes('@fastify/multipart')) {
        // Register multipart plugin directly
        this.server.register(require('@fastify/multipart'), {
          limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
        });
      } else {
        // Handle other plugins
        this.server.register(middleware.plugin as any, middleware.options);
      }
    } else {
      throw new Error('Invalid middleware format');
    }
  }

  getInstance(): any {
    return this.server;
  }

  // Additional Fastify-specific methods for advanced usage
  getFastifyInstance(): FastifyInstance {
    return this.server;
  }

  // Helper method to register multiple routes at once
  registerRoutes(routes: Array<{ method: string; path: string; handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void> }>): void {
    routes.forEach(route => {
      this.registerRoute(route.method, route.path, route.handler);
    });
  }

  // Log all registered routes
  logRoutes(): void {
    this.server.ready(() => {
      console.log(this.server.printRoutes());
    });
  }
} 