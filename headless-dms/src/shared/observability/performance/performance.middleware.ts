import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { performanceMonitor } from '../performance.monitor.js';

/**
 * Performance monitoring middleware options
 */
export interface PerformanceMiddlewareOptions {
  enabled?: boolean;
  trackRequestSize?: boolean;
  trackResponseSize?: boolean;
  trackUserContext?: boolean;
  slowRequestThreshold?: number;
}

/**
 * Performance monitoring middleware for Fastify
 * Tracks API response times, request sizes, and performance metrics
 */
export class PerformanceMiddleware {
  private options: PerformanceMiddlewareOptions;

  constructor(options: PerformanceMiddlewareOptions = {}) {
    this.options = {
      enabled: true,
      trackRequestSize: true,
      trackResponseSize: true,
      trackUserContext: true,
      slowRequestThreshold: 2000, // 2 seconds
      ...options
    };
  }

  /**
   * Create middleware instance with default options
   */
  static create(options?: PerformanceMiddlewareOptions): PerformanceMiddleware {
    return new PerformanceMiddleware(options);
  }

  /**
   * Pre-handler hook to start timing
   */
  preHandler(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
    if (!this.options.enabled) {
      return done();
    }

    // Start performance timer
    const timer = performanceMonitor.createTimer();
    
    // Store timer in request for later use
    (request as any).performanceTimer = timer;
    
    done();
  }

  /**
   * On-response hook to track performance metrics
   */
  onResponse(request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction): void {
    if (!this.options.enabled) {
      return done();
    }

    const timer = (request as any).performanceTimer;
    if (!timer) {
      return done();
    }

    try {
      // Calculate request size
      let requestSize: number | undefined;
      if (this.options.trackRequestSize) {
        requestSize = this.calculateRequestSize(request);
      }

      // Calculate response size
      let responseSize: number | undefined;
      if (this.options.trackResponseSize) {
        responseSize = this.calculateResponseSize(reply);
      }

      // Extract user context
      let userContext: { userId?: string; userRole?: string } | undefined;
      if (this.options.trackUserContext) {
        userContext = this.extractUserContext(request);
      }

      // Track API response performance
      timer.endApiResponse({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        requestSize,
        responseSize,
        userId: userContext?.userId,
        userRole: userContext?.userRole,
        userAgent: request.headers['user-agent']
      });

    } catch (error) {
      // Log error but don't fail the request
      console.warn('Failed to track performance metrics:', error);
    }

    done();
  }

  /**
   * Calculate request size in bytes
   */
  private calculateRequestSize(request: FastifyRequest): number {
    let size = 0;

    // Add URL length
    size += request.url.length;

    // Add headers size (simplified to avoid type issues)
    size += Object.keys(request.headers).reduce((acc, key) => {
      const value = request.headers[key];
      return acc + key.length + (value ? String(value).length : 0);
    }, 0);

    // Add query parameters size
    if (request.query) {
      size += JSON.stringify(request.query).length;
    }

    // Add body size if available
    if (request.body) {
      if (typeof request.body === 'string') {
        size += request.body.length;
      } else {
        size += JSON.stringify(request.body).length;
      }
    }

    return size;
  }

  /**
   * Calculate response size in bytes
   */
  private calculateResponseSize(reply: FastifyReply): number {
    let size = 0;

    // Add headers size (simplified to avoid type issues)
    size += Object.keys(reply.getHeaders()).reduce((acc, key) => {
      const value = reply.getHeaders()[key];
      return acc + key.length + (value ? String(value).length : 0);
    }, 0);

    // Add payload size if available
    // Note: Fastify doesn't have getPayload() method, so we'll estimate based on status
    // In a real implementation, you might want to track this differently
    if (reply.statusCode >= 200 && reply.statusCode < 300) {
      // Estimate response size for successful responses
      size += 100; // Base response size estimate
    }

    return size;
  }

  /**
   * Extract user context from request
   */
  private extractUserContext(request: FastifyRequest): { userId?: string; userRole?: string } | undefined {
    try {
      // Check for user in request context (set by auth middleware)
      const user = (request as any).user;
      if (user) {
        return {
          userId: user.id || user.userId,
          userRole: user.role || user.userRole
        };
      }

      // Check for user ID in headers (if passed by proxy)
      const userId = request.headers['x-user-id'] || request.headers['x-userid'];
      const userRole = request.headers['x-user-role'] || request.headers['x-userrole'];

      if (userId || userRole) {
        return {
          userId: userId as string,
          userRole: userRole as string
        };
      }

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Register middleware hooks on Fastify instance
   */
  register(fastify: any): void {
    if (!this.options.enabled) {
      return;
    }

    // Add pre-handler hook
    fastify.addHook('preHandler', this.preHandler.bind(this));

    // Add on-response hook
    fastify.addHook('onResponse', this.onResponse.bind(this));
  }

  /**
   * Update middleware options
   */
  updateOptions(options: Partial<PerformanceMiddlewareOptions>): void {
    this.options = { ...this.options, ...options };
  }
}

/**
 * Factory function to create performance middleware
 */
export function createPerformanceMiddleware(options?: PerformanceMiddlewareOptions): PerformanceMiddleware {
  return PerformanceMiddleware.create(options);
}
