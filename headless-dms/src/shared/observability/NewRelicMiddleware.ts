import { FastifyRequest, FastifyReply } from 'fastify';
import { newRelicIntegration } from './NewRelicIntegration.js';
import { newRelicTracer } from './NewRelicTracer.js';
import { newRelicMetrics } from './NewRelicMetrics.js';

/**
 * New Relic middleware for Fastify
 * Automatically instruments HTTP requests
 */
export class NewRelicMiddleware {
  /**
   * Request tracking middleware
   */
  static async trackRequest(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();
    const operationName = `${request.method} ${request.url}`;

    // Start transaction
    const transactionResult = newRelicTracer.startTransaction(operationName, {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    });

    if (transactionResult.isErr()) {
      console.warn('[New Relic] Failed to start transaction:', transactionResult.unwrapErr());
      return;
    }

    const transactionId = transactionResult.unwrap();

    // Add transaction ID to request context
    (request as any).newRelicTransactionId = transactionId;

    // Record request metrics
    newRelicMetrics.recordMetric('api.request', 1, {
      method: request.method,
      url: request.url,
      timestamp: startTime,
    });

    // Track response using Fastify hooks
    (reply as any).addHook('onResponse', (request: any, reply: any) => {
      const duration = Date.now() - startTime;
      const statusCode = reply.statusCode;

      // End transaction
      newRelicTracer.endTransaction(transactionId, statusCode < 400);
      
      // Record response metrics
      newRelicMetrics.recordMetric('api.response', 1, {
        statusCode,
        duration,
        success: statusCode < 400,
      });
    });

    // Track errors using Fastify hooks
    (reply as any).addHook('onError', (request: any, reply: any, error: any) => {
      newRelicTracer.endTransaction(transactionId, false, error);
      
      newRelicMetrics.recordMetric('api.error', 1, {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        errorType: error.name,
        errorMessage: error.message,
      });
    });
  }

  /**
   * Database operation tracking
   */
  static trackDatabaseOperation(
    operation: string,
    query: string,
    duration: number,
    success: boolean
  ): void {
    const spanResult = newRelicTracer.startSpan(
      'db_operation', // transactionId placeholder
      `DB: ${operation}`,
      undefined,
      {
        query: query.substring(0, 100), // Truncate long queries
        operation,
      }
    );

    if (spanResult.isOk()) {
      const spanId = spanResult.unwrap();
      newRelicTracer.endSpan(spanId, success);
    }
    
    newRelicMetrics.recordMetric('database.operation', 1, {
      operation,
      query: query.substring(0, 100),
      duration,
      success,
    });
  }

  /**
   * Storage operation tracking
   */
  static trackStorageOperation(
    operation: string,
    storageType: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, unknown>
  ): void {
    const spanResult = newRelicTracer.startSpan(
      'storage_operation', // transactionId placeholder
      `Storage: ${operation}`,
      undefined,
      {
        storageType,
        operation,
        ...metadata,
      }
    );

    if (spanResult.isOk()) {
      const spanId = spanResult.unwrap();
      newRelicTracer.endSpan(spanId, success);
    }
    
    newRelicMetrics.recordMetric('storage.operation', 1, {
      storageType,
      operation,
      duration,
      success,
      ...metadata,
    });
  }
}