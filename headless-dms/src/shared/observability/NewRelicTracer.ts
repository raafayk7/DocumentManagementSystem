import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicConfig } from './NewRelicConfig.js';
import { newRelicMetrics } from './NewRelicMetrics.js';

/**
 * Trace context for distributed tracing
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
  tags?: Record<string, string>;
}

/**
 * Transaction context for performance monitoring
 */
export interface TransactionContext {
  transactionId: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
  childSpans: TraceContext[];
}

/**
 * Performance measurement context
 */
export interface PerformanceContext {
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * New Relic distributed tracer
 * Handles distributed tracing, performance monitoring, and transaction tracking
 */
export class NewRelicTracer {
  private static instance: NewRelicTracer;
  private activeTransactions: Map<string, TransactionContext> = new Map();
  private activeSpans: Map<string, TraceContext> = new Map();
  private transactionCounter = 0;
  private spanCounter = 0;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): NewRelicTracer {
    if (!NewRelicTracer.instance) {
      NewRelicTracer.instance = new NewRelicTracer();
    }
    return NewRelicTracer.instance;
  }

  /**
   * Check if New Relic is enabled
   */
  private isEnabled(): boolean {
    return newRelicConfig.isEnabled();
  }

  /**
   * Generate unique trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique span ID
   */
  private generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start a new transaction
   */
  startTransaction(operationName: string, metadata?: Record<string, unknown>): AppResult<string> {
    if (!this.isEnabled()) {
      return AppResult.Ok('disabled');
    }

    try {
      const transactionId = this.generateTransactionId();
      const startTime = Date.now();

      const transaction: TransactionContext = {
        transactionId,
        operationName,
        startTime,
        success: true,
        metadata,
        childSpans: [],
      };

      this.activeTransactions.set(transactionId, transaction);
      this.transactionCounter++;

      // Record transaction start metric
      newRelicMetrics.recordMetric('tracing.transaction.start', 1, {
        'operation.name': operationName,
        'transaction.id': transactionId,
        ...metadata,
      });

      console.log(`[New Relic] Transaction started: ${operationName} (${transactionId})`);

      return AppResult.Ok(transactionId);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to start transaction: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * End a transaction
   */
  endTransaction(transactionId: string, success: boolean, error?: Error): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const transaction = this.activeTransactions.get(transactionId);
      if (!transaction) {
        return AppResult.Err(AppError.NotFound(`Transaction not found: ${transactionId}`));
      }

      const endTime = Date.now();
      const duration = endTime - transaction.startTime;

      transaction.endTime = endTime;
      transaction.duration = duration;
      transaction.success = success;
      transaction.error = error;

      // Record transaction end metrics
      newRelicMetrics.recordMetric('tracing.transaction.end', 1, {
        'operation.name': transaction.operationName,
        'transaction.id': transactionId,
        'success': success,
        'duration': duration,
        'error.type': error?.name,
        'error.message': error?.message,
        ...transaction.metadata,
      });

      // Record performance metrics
      newRelicMetrics.recordPerformanceMetrics({
        operationName: transaction.operationName,
        duration,
        success,
        metadata: {
          'transaction.id': transactionId,
          'child.spans.count': transaction.childSpans.length,
          ...transaction.metadata,
        },
      });

      // Remove from active transactions
      this.activeTransactions.delete(transactionId);

      console.log(`[New Relic] Transaction ended: ${transaction.operationName} (${transactionId}) - Duration: ${duration}ms, Success: ${success}`);

      return AppResult.Ok(undefined);
    } catch (err) {
      return AppResult.Err(AppError.Generic(`Failed to end transaction: ${err instanceof Error ? err.message : 'Unknown error'}`));
    }
  }

  /**
   * Start a new span within a transaction
   */
  startSpan(transactionId: string, operationName: string, parentSpanId?: string, metadata?: Record<string, unknown>): AppResult<string> {
    if (!this.isEnabled()) {
      return AppResult.Ok('disabled');
    }

    try {
      const transaction = this.activeTransactions.get(transactionId);
      if (!transaction) {
        return AppResult.Err(AppError.NotFound(`Transaction not found: ${transactionId}`));
      }

      const spanId = this.generateSpanId();
      const startTime = Date.now();

      const span: TraceContext = {
        traceId: transactionId,
        spanId,
        parentSpanId,
        operationName,
        startTime,
        metadata,
        tags: {},
      };

      this.activeSpans.set(spanId, span);
      transaction.childSpans.push(span);
      this.spanCounter++;

      // Record span start metric
      newRelicMetrics.recordMetric('tracing.span.start', 1, {
        'operation.name': operationName,
        'span.id': spanId,
        'transaction.id': transactionId,
        'parent.span.id': parentSpanId,
        ...metadata,
      });

      console.log(`[New Relic] Span started: ${operationName} (${spanId}) in transaction ${transactionId}`);

      return AppResult.Ok(spanId);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to start span: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * End a span
   */
  endSpan(spanId: string, success: boolean, error?: Error, metadata?: Record<string, unknown>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return AppResult.Err(AppError.NotFound(`Span not found: ${spanId}`));
      }

      const endTime = Date.now();
      const duration = endTime - span.startTime;

      span.endTime = endTime;
      span.duration = duration;
      if (metadata) {
        span.metadata = { ...span.metadata, ...metadata };
      }

      // Record span end metrics
      newRelicMetrics.recordMetric('tracing.span.end', 1, {
        'operation.name': span.operationName,
        'span.id': spanId,
        'trace.id': span.traceId,
        'success': success,
        'duration': duration,
        'error.type': error?.name,
        'error.message': error?.message,
        ...span.metadata,
      });

      // Remove from active spans
      this.activeSpans.delete(spanId);

      console.log(`[New Relic] Span ended: ${span.operationName} (${spanId}) - Duration: ${duration}ms, Success: ${success}`);

      return AppResult.Ok(undefined);
    } catch (err) {
      return AppResult.Err(AppError.Generic(`Failed to end span: ${err instanceof Error ? err.message : 'Unknown error'}`));
    }
  }

  /**
   * Add metadata to a span
   */
  addSpanMetadata(spanId: string, metadata: Record<string, unknown>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return AppResult.Err(AppError.NotFound(`Span not found: ${spanId}`));
      }

      span.metadata = { ...span.metadata, ...metadata };

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to add span metadata: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Add tags to a span
   */
  addSpanTags(spanId: string, tags: Record<string, string>): AppResult<void> {
    if (!this.isEnabled()) {
      return AppResult.Ok(undefined);
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return AppResult.Err(AppError.NotFound(`Span not found: ${spanId}`));
      }

      span.tags = { ...span.tags, ...tags };

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to add span tags: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Measure performance of an operation
   */
  measurePerformance<T>(
    operationName: string,
    operation: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<AppResult<T>> {
    return this.measurePerformanceAsync(operationName, operation, metadata);
  }

  /**
   * Measure performance of an async operation
   */
  private async measurePerformanceAsync<T>(
    operationName: string,
    operation: () => T | Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<AppResult<T>> {
    if (!this.isEnabled()) {
      try {
        const result = await operation();
        return AppResult.Ok(result);
      } catch (error) {
        return AppResult.Err(AppError.Generic(`Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    }

    const startTime = Date.now();
    let success = true;
    let error: Error | undefined;

    try {
      const result = await operation();
      return AppResult.Ok(result);
    } catch (err) {
      success = false;
      error = err instanceof Error ? err : new Error(String(err));
      throw err;
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Record performance metrics
      newRelicMetrics.recordPerformanceMetrics({
        operationName,
        duration,
        success,
        metadata: {
          'start.time': startTime,
          'end.time': endTime,
          ...metadata,
        },
      });

      // Record error if operation failed
      if (!success && error) {
        newRelicMetrics.recordError(error, {
          'operation.name': operationName,
          'duration': duration,
          ...metadata,
        });
      }
    }
  }

  /**
   * Get current transaction context
   */
  getCurrentTransaction(transactionId: string): AppResult<TransactionContext> {
    try {
      const transaction = this.activeTransactions.get(transactionId);
      if (!transaction) {
        return AppResult.Err(AppError.NotFound(`Transaction not found: ${transactionId}`));
      }
      return AppResult.Ok(transaction);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get current transaction: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get current span context
   */
  getCurrentSpan(spanId: string): AppResult<TraceContext> {
    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        return AppResult.Err(AppError.NotFound(`Span not found: ${spanId}`));
      }
      return AppResult.Ok(span);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get current span: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get tracing statistics
   */
  getTracingStats(): AppResult<{
    activeTransactions: number;
    activeSpans: number;
    totalTransactions: number;
    totalSpans: number;
  }> {
    try {
      const stats = {
        activeTransactions: this.activeTransactions.size,
        activeSpans: this.activeSpans.size,
        totalTransactions: this.transactionCounter,
        totalSpans: this.spanCounter,
      };

      return AppResult.Ok(stats);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to get tracing stats: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Clear all active traces (for cleanup)
   */
  clearAllTraces(): AppResult<void> {
    try {
      this.activeTransactions.clear();
      this.activeSpans.clear();
      this.transactionCounter = 0;
      this.spanCounter = 0;

      console.log('[New Relic] All traces cleared');

      return AppResult.Ok(undefined);
    } catch (error) {
      return AppResult.Err(AppError.Generic(`Failed to clear traces: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }
}

/**
 * Export singleton instance
 */
export const newRelicTracer = NewRelicTracer.getInstance();
