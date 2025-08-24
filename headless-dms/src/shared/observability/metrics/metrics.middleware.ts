import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import { MetricsService } from './metrics.service.js';
import { newRelicMetrics } from '../new-relic/NewRelicMetrics.js';

export interface MetricsOptions {
  trackPerformance?: boolean;
  trackErrors?: boolean;
  trackUserActivity?: boolean;
  storageStrategy?: string;
  operationName?: string;
  resourceType?: string;
}

export interface MetricsMiddlewareOptions {
  trackRequestMetrics?: boolean;
  trackUserActivity?: boolean;
  trackPerformance?: boolean;
  excludePaths?: string[];
  includePaths?: string[];
}

export interface MetricsEndpointOptions {
  requireAuth?: boolean;
  includeNewRelicStatus?: boolean;
  includeSystemMetrics?: boolean;
}

export class MetricsMiddleware {
  private metricsService: MetricsService;
  private options: MetricsMiddlewareOptions;

  constructor(options: MetricsMiddlewareOptions = {}) {
    this.metricsService = MetricsService.getInstance();
    this.options = {
      trackRequestMetrics: true,
      trackUserActivity: true,
      trackPerformance: true,
      excludePaths: ['/health', '/ping', '/metrics'],
      includePaths: [],
      ...options
    };
  }

  public preHandler() {
    return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      if (this.shouldTrackRequest(request)) {
        // Add start time to request for performance tracking
        (request as any).metricsStartTime = Date.now();
        
        // Track request start
        this.trackRequestStart(request);
      }
      done();
    };
  }

  public onResponse() {
    return (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => {
      if (this.shouldTrackRequest(request)) {
        this.trackRequestComplete(request, reply);
      }
      done();
    };
  }

  public onError() {
    return (request: FastifyRequest, reply: FastifyReply, error: Error, done: HookHandlerDoneFunction) => {
      if (this.shouldTrackRequest(request)) {
        this.trackRequestError(request, reply, error);
      }
      done();
    };
  }

  private shouldTrackRequest(request: FastifyRequest): boolean {
    const path = request.url;
    
    // Check exclude paths
    if (this.options.excludePaths?.some(excludePath => path.startsWith(excludePath))) {
      return false;
    }
    
    // Check include paths (if specified, only track these)
    if (this.options.includePaths && this.options.includePaths.length > 0) {
      return this.options.includePaths.some(includePath => path.startsWith(includePath));
    }
    
    return true;
  }

  private trackRequestStart(request: FastifyRequest): void {
    if (!this.options.trackRequestMetrics) return;

    try {
      const userContext = this.extractUserContext(request);
      
      if (this.options.trackUserActivity && userContext) {
        this.metricsService.trackUserActivity({
          userId: userContext.userId,
          action: 'request_start',
          resource: request.url,
          timestamp: new Date(),
          userRole: userContext.userRole,
          success: true
        });
      }

      // Track to New Relic
      newRelicMetrics.recordMetric('request.start', 1, {
        method: request.method,
        url: request.url,
        userAgent: request.headers['user-agent'],
        userId: userContext?.userId || 'anonymous',
        userRole: userContext?.userRole || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to track request start metrics:', error);
    }
  }

  private trackRequestComplete(request: FastifyRequest, reply: FastifyReply): void {
    if (!this.options.trackRequestMetrics) return;

    try {
      const startTime = (request as any).metricsStartTime;
      const duration = startTime ? Date.now() - startTime : 0;
      const statusCode = reply.statusCode;
      const success = statusCode >= 200 && statusCode < 400;
      
      const userContext = this.extractUserContext(request);
      
      // Track performance metrics
      if (this.options.trackPerformance) {
        this.metricsService.trackPerformance({
          operation: `${request.method}_${request.url}`,
          storageStrategy: 'http',
          duration,
          fileSize: this.extractResponseSize(reply),
          success,
          timestamp: new Date()
        });
      }

      // Track user activity
      if (this.options.trackUserActivity && userContext) {
        this.metricsService.trackUserActivity({
          userId: userContext.userId,
          action: `${request.method}_${request.url}`,
          resource: 'http_request',
          timestamp: new Date(),
          userRole: userContext.userRole,
          success
        });
      }

      // Track to New Relic
      newRelicMetrics.recordMetric('request.complete', 1, {
        method: request.method,
        url: request.url,
        statusCode,
        duration,
        success,
        userId: userContext?.userId || 'anonymous',
        userRole: userContext?.userRole || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to track request complete metrics:', error);
    }
  }

  private trackRequestError(request: FastifyRequest, reply: FastifyReply, error: Error): void {
    if (!this.options.trackRequestMetrics) return;

    try {
      const startTime = (request as any).metricsStartTime;
      const duration = startTime ? Date.now() - startTime : 0;
      const userContext = this.extractUserContext(request);
      
      // Track error metrics
      this.metricsService.trackError({
        storageStrategy: 'http',
        errorType: error.constructor.name,
        errorMessage: error.message,
        timestamp: new Date(),
        context: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          duration,
          userId: userContext?.userId,
          userRole: userContext?.userRole
        }
      });

      // Track failed user activity
      if (this.options.trackUserActivity && userContext) {
        this.metricsService.trackUserActivity({
          userId: userContext.userId,
          action: `${request.method}_${request.url}`,
          resource: 'http_request',
          timestamp: new Date(),
          userRole: userContext.userRole,
          success: false
        });
      }

      // Track to New Relic
      newRelicMetrics.recordMetric('request.error', 1, {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        errorType: error.constructor.name,
        errorMessage: error.message,
        userId: userContext?.userId || 'anonymous',
        userRole: userContext?.userRole || 'unknown',
        timestamp: new Date().toISOString()
      });
    } catch (metricsError) {
      console.error('Failed to track request error metrics:', metricsError);
    }
  }

  private extractUserContext(request: FastifyRequest): { userId: string; userRole: string } | null {
    try {
      // Try to extract from JWT token in request.user (set by auth middleware)
      if ((request as any).user) {
        const user = (request as any).user;
        return {
          userId: user.sub || user.id || 'unknown',
          userRole: user.role || 'unknown'
        };
      }

      // Try to extract from Authorization header
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // Note: In production, you might want to decode the JWT here
        // For now, we'll just track that there's an auth header
        return {
          userId: 'authenticated',
          userRole: 'authenticated'
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private extractResponseSize(reply: FastifyReply): number {
    try {
      const responseSize = reply.getHeader('content-length');
      if (responseSize) {
        return parseInt(responseSize.toString(), 10);
      }
      
      // Try to get size from response payload
      const payload = (reply as any).payload;
      if (payload) {
        if (Buffer.isBuffer(payload)) {
          return payload.length;
        }
        if (typeof payload === 'string') {
          return Buffer.byteLength(payload, 'utf8');
        }
        if (typeof payload === 'object') {
          return Buffer.byteLength(JSON.stringify(payload), 'utf8');
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  // Static method for easy integration
  public static create(options?: MetricsMiddlewareOptions): MetricsMiddleware {
    return new MetricsMiddleware(options);
  }
}
