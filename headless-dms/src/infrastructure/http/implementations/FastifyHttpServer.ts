// src/infrastructure/http/implementations/FastifyHttpServer.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { IHttpServer, IHttpRequest, IHttpResponse } from '../interfaces/IHttpServer.js';

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

  registerRoute(method: string, path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>): void {
    // Convert our interface-based handler to Fastify-compatible handler
    const fastifyHandler = async (fastifyRequest: FastifyRequest, fastifyReply: FastifyReply) => {
      try {
        const request = new FastifyHttpRequest(fastifyRequest);
        const response = new FastifyHttpResponse(fastifyReply);
        
        await handler(request, response);
      } catch (error) {
        console.error('Route handler error:', error);
        fastifyReply.status(500).send({ error: 'Internal server error' });
      }
    };

    // Register the route with Fastify
    switch (method.toLowerCase()) {
      case 'get':
        this.server.get(path, fastifyHandler);
        break;
      case 'post':
        this.server.post(path, fastifyHandler);
        break;
      case 'put':
        this.server.put(path, fastifyHandler);
        break;
      case 'patch':
        this.server.patch(path, fastifyHandler);
        break;
      case 'delete':
        this.server.delete(path, fastifyHandler);
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
      // Fastify plugin
      this.server.register(middleware.plugin as any, middleware.options);
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