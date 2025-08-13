import { injectable } from 'tsyringe';
import { IHttpServer } from '../http/interfaces/IHttpServer.js';

export interface MockRoute {
  method: string;
  path: string;
  handler: (req: any, res: any) => Promise<void>;
  middleware?: any[];
}

export interface MockRequest {
  method: string;
  url: string;
  body: any;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  user?: any;
}

export interface MockResponse {
  statusCode: number;
  data: any;
  headers: Record<string, string>;
  sent: boolean;
}

@injectable()
export class MockHttpServer implements IHttpServer {
  private routes: MockRoute[] = [];
  private isRunning = false;
  private port: number = 0;
  private host: string = 'localhost';

  async start(port: number, host?: string): Promise<void> {
    this.port = port;
    this.host = host || 'localhost';
    this.isRunning = true;
    console.log(`🚀 Mock HTTP Server started on ${this.host}:${this.port}`);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    console.log('🛑 Mock HTTP Server stopped');
  }

  registerRoute(
    method: string, 
    path: string, 
    handler: (req: any, res: any) => Promise<void>, 
    middleware?: any[]
  ): void {
    this.routes.push({ method, path, handler, middleware });
    console.log(`📝 Registered mock route: ${method} ${path}`);
  }

  registerMiddleware(middleware: any): void {
    console.log('📝 Registered mock middleware:', middleware.constructor.name);
  }

  getInstance(): any {
    return this;
  }

  logRoutes(): void {
    console.log('\n📋 Mock HTTP Server Routes:');
    this.routes.forEach(route => {
      console.log(`  ${route.method} ${route.path}`);
    });
  }

  // Mock-specific methods for testing
  isServerRunning(): boolean {
    return this.isRunning;
  }

  getRegisteredRoutes(): MockRoute[] {
    return [...this.routes];
  }

  clearRoutes(): void {
    this.routes = [];
  }

  // Simulate making a request to test route handling
  async simulateRequest(method: string, path: string, options: {
    body?: any;
    params?: Record<string, string>;
    query?: Record<string, string>;
    headers?: Record<string, string>;
    user?: any;
  } = {}): Promise<MockResponse> {
    const route = this.findRoute(method, path);
    if (!route) {
      return {
        statusCode: 404,
        data: { error: 'Route not found' },
        headers: {},
        sent: false
      };
    }

    const mockReq: MockRequest = {
      method,
      url: path,
      body: options.body || {},
      params: options.params || {},
      query: options.query || {},
      headers: options.headers || {},
      user: options.user
    };

    const mockRes: MockResponse = {
      statusCode: 200,
      data: null,
      headers: {},
      sent: false
    };

    // Create response object with mock methods
    const res = {
      status: (code: number) => {
        mockRes.statusCode = code;
        return res;
      },
      send: (data: any) => {
        mockRes.data = data;
        mockRes.sent = true;
      },
      header: (name: string, value: string) => {
        mockRes.headers[name] = value;
        return res;
      },
      code: (statusCode: number) => {
        mockRes.statusCode = statusCode;
        return res;
      }
    };

    try {
      // Apply middleware if present
      if (route.middleware && route.middleware.length > 0) {
        for (const middleware of route.middleware) {
          // Simple middleware simulation - in real tests you'd implement proper middleware
          console.log(`🔧 Applying middleware: ${middleware.constructor.name}`);
        }
      }

      await route.handler(mockReq, res);
      
      if (!mockRes.sent) {
        mockRes.data = { message: 'Handler completed without sending response' };
      }

      return mockRes;
    } catch (error) {
      mockRes.statusCode = 500;
      mockRes.data = { error: error instanceof Error ? error.message : 'Unknown error' };
      return mockRes;
    }
  }

  private findRoute(method: string, path: string): MockRoute | undefined {
    return this.routes.find(route => 
      route.method.toUpperCase() === method.toUpperCase() && 
      this.pathMatches(route.path, path)
    );
  }

  private pathMatches(routePath: string, requestPath: string): boolean {
    // Simple path matching - in real tests you'd implement proper path matching
    if (routePath === requestPath) return true;
    
    // Handle path parameters (e.g., /users/:id)
    const routeParts = routePath.split('/');
    const requestParts = requestPath.split('/');
    
    if (routeParts.length !== requestParts.length) return false;
    
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue; // Parameter
      if (routeParts[i] !== requestParts[i]) return false;
    }
    
    return true;
  }
}
