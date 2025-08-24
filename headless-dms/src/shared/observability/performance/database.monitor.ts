import { AppResult, AppError } from '@carbonteq/hexapp';
import { performanceMonitor } from './performance.monitor.js';

/**
 * Database query information
 */
export interface DatabaseQueryInfo {
  operation: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  table?: string;
  query?: string;
  parameters?: Record<string, unknown>;
}

/**
 * Database performance monitoring wrapper
 * Tracks query performance, execution times, and slow queries
 */
export class DatabaseMonitor {
  private static instance: DatabaseMonitor;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  /**
   * Monitor a database operation with performance tracking
   */
  async monitorOperation<T>(
    queryInfo: DatabaseQueryInfo,
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    const timer = performanceMonitor.createTimer();
    
    try {
      const result = await operation();
      
      // Track successful operation
      timer.endDatabaseQuery({
        ...queryInfo,
        success: true,
        rowCount: this.extractRowCount(result, queryInfo.operation)
      });

      return AppResult.Ok(result);
    } catch (error) {
      // Track failed operation
      timer.endDatabaseQuery({
        ...queryInfo,
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      return AppResult.Err(AppError.Generic(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Monitor a database operation that returns a Result type
   */
  async monitorResultOperation<T, E>(
    queryInfo: DatabaseQueryInfo,
    operation: () => Promise<AppResult<T>>
  ): Promise<AppResult<T>> {
    const timer = performanceMonitor.createTimer();
    
    try {
      const result = await operation();
      
      if (result.isOk()) {
        // Track successful operation
        timer.endDatabaseQuery({
          ...queryInfo,
          success: true,
          rowCount: this.extractRowCount(result.unwrap(), queryInfo.operation)
        });
      } else {
        // Track failed operation
        timer.endDatabaseQuery({
          ...queryInfo,
          success: false,
          errorType: 'AppError'
        });
      }

      return result;
    } catch (error) {
      // Track unexpected error
      timer.endDatabaseQuery({
        ...queryInfo,
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      return AppResult.Err(AppError.Generic(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Extract row count from operation result
   */
  private extractRowCount(result: any, operation: string): number | undefined {
    try {
      switch (operation) {
        case 'select':
          // For select operations, count the result array
          if (Array.isArray(result)) {
            return result.length;
          }
          return undefined;
        
        case 'insert':
          // For insert operations, check if it's an array or single result
          if (Array.isArray(result)) {
            return result.length;
          }
          return result ? 1 : 0;
        
        case 'update':
        case 'delete':
          // For update/delete operations, check affected rows
          if (result && typeof result === 'object') {
            return result.affectedRows || result.rowCount || 1;
          }
          return result ? 1 : 0;
        
        case 'raw':
          // For raw queries, try to extract meaningful count
          if (Array.isArray(result)) {
            return result.length;
          }
          if (result && typeof result === 'object') {
            return result.affectedRows || result.rowCount || 1;
          }
          return undefined;
        
        default:
          return undefined;
      }
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Create a monitored database operation
   */
  createMonitoredOperation<T>(
    queryInfo: DatabaseQueryInfo,
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorOperation(queryInfo, operation);
  }

  /**
   * Create a monitored database operation that returns a Result type
   */
  createMonitoredResultOperation<T>(
    queryInfo: DatabaseQueryInfo,
    operation: () => Promise<AppResult<T>>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorResultOperation(queryInfo, operation);
  }
}

/**
 * Database monitoring decorator for methods
 */
export function MonitorDatabase(queryInfo: DatabaseQueryInfo) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = DatabaseMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      return monitor.monitorOperation(queryInfo, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Database monitoring decorator for methods that return Result types
 */
export function MonitorDatabaseResult(queryInfo: DatabaseQueryInfo) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = DatabaseMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      return monitor.monitorResultOperation(queryInfo, () => method.apply(this, args));
    };

    return descriptor;
  };
}

// Export singleton instance
export const databaseMonitor = DatabaseMonitor.getInstance();
