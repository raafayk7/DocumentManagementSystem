import { AppResult, AppError } from '@carbonteq/hexapp';
import { newRelicTracer } from './NewRelicTracer.js';
import { newRelicMetrics } from './NewRelicMetrics.js';

/**
 * New Relic decorator for automatic instrumentation
 * Can be used to wrap service methods with observability
 */
export class NewRelicDecorator {
  /**
   * Decorator factory for method instrumentation
   */
  static instrument<T extends any[], R>(
    operationName: string,
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const startTime = Date.now();
      
      // Start span for this operation
      const spanResult = newRelicTracer.startSpan(
        'decorator_span', // transactionId placeholder
        operationName,
        undefined,
        {
          method: propertyKey.toString(),
          className: target.constructor.name,
          args: args.length > 0 ? 'args_present' : 'no_args',
        }
      );

      try {
        // Record operation start
        newRelicMetrics.recordMetric('business.operation.start', 1, {
          method: propertyKey.toString(),
          className: target.constructor.name,
          operationName,
        });

        // Execute original method
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - startTime;

        // Record success
        newRelicMetrics.recordMetric('business.operation.success', 1, {
          method: propertyKey.toString(),
          className: target.constructor.name,
          operationName,
          duration,
        });

        // End span
        if (spanResult.isOk()) {
          const spanId = spanResult.unwrap();
          newRelicTracer.endSpan(spanId, true);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        // Record error
        newRelicMetrics.recordMetric('business.operation.error', 1, {
          method: propertyKey.toString(),
          className: target.constructor.name,
          operationName,
          duration,
          errorType: (error as Error).name,
          errorMessage: (error as Error).message,
        });

        // End span
        if (spanResult.isOk()) {
          const spanId = spanResult.unwrap();
          newRelicTracer.endSpan(spanId, false);
        }

        throw error;
      }
    };

    return descriptor;
  }

  /**
   * Simple function wrapper for non-method functions
   */
  static wrapFunction<T extends any[], R>(
    operationName: string,
    fn: (...args: T) => Promise<R>
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const startTime = Date.now();
      
      const spanResult = newRelicTracer.startSpan(
        'function_span', // transactionId placeholder
        operationName,
        undefined,
        {
          functionName: fn.name,
          args: args.length > 0 ? 'args_present' : 'no_args',
        }
      );

      try {
        newRelicMetrics.recordMetric('function.operation.start', 1, {
          functionName: fn.name,
          operationName,
        });

        const result = await fn(...args);
        const duration = Date.now() - startTime;

        newRelicMetrics.recordMetric('function.operation.success', 1, {
          functionName: fn.name,
          operationName,
          duration,
        });

        if (spanResult.isOk()) {
          const spanId = spanResult.unwrap();
          newRelicTracer.endSpan(spanId, true);
        }

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        newRelicMetrics.recordMetric('function.operation.error', 1, {
          functionName: fn.name,
          operationName,
          duration,
          errorType: (error as Error).name,
          errorMessage: (error as Error).message,
        });

        if (spanResult.isOk()) {
          const spanId = spanResult.unwrap();
          newRelicTracer.endSpan(spanId, false);
        }

        throw error;
      }
    };
  }
}