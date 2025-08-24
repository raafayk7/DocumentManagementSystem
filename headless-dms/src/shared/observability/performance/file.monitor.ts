import { AppResult, AppError } from '@carbonteq/hexapp';
import { performanceMonitor } from './performance.monitor.js';

/**
 * File operation information
 */
export interface FileOperationInfo {
  operation: 'upload' | 'download' | 'delete' | 'process';
  fileType: string;
  processingSteps?: string[];
}

/**
 * File operation performance monitoring wrapper
 * Tracks file upload/download performance, processing times, and file size metrics
 */
export class FileMonitor {
  private static instance: FileMonitor;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): FileMonitor {
    if (!FileMonitor.instance) {
      FileMonitor.instance = new FileMonitor();
    }
    return FileMonitor.instance;
  }

  /**
   * Monitor a file operation with performance tracking
   */
  async monitorOperation<T>(
    operationInfo: FileOperationInfo,
    fileSize: number,
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    const timer = performanceMonitor.createTimer();
    
    try {
      const result = await operation();
      
      // Track successful operation
      timer.endFileOperation({
        ...operationInfo,
        fileSize,
        success: true
      });

      return AppResult.Ok(result);
    } catch (error) {
      // Track failed operation
      timer.endFileOperation({
        ...operationInfo,
        fileSize,
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      return AppResult.Err(AppError.Generic(`File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Monitor a file operation that returns a Result type
   */
  async monitorResultOperation<T>(
    operationInfo: FileOperationInfo,
    fileSize: number,
    operation: () => Promise<AppResult<T>>
  ): Promise<AppResult<T>> {
    const timer = performanceMonitor.createTimer();
    
    try {
      const result = await operation();
      
      if (result.isOk()) {
        // Track successful operation
        timer.endFileOperation({
          ...operationInfo,
          fileSize,
          success: true
        });
      } else {
        // Track failed operation
        timer.endFileOperation({
          ...operationInfo,
          fileSize,
          success: false,
          errorType: 'AppError'
        });
      }

      return result;
    } catch (error) {
      // Track unexpected error
      timer.endFileOperation({
        ...operationInfo,
        fileSize,
        success: false,
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
      });

      return AppResult.Err(AppError.Generic(`File operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Monitor file upload operation
   */
  async monitorUpload<T>(
    fileType: string,
    fileSize: number,
    processingSteps: string[],
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    return this.monitorOperation({
      operation: 'upload',
      fileType,
      processingSteps
    }, fileSize, operation);
  }

  /**
   * Monitor file download operation
   */
  async monitorDownload<T>(
    fileType: string,
    fileSize: number,
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    return this.monitorOperation({
      operation: 'download',
      fileType
    }, fileSize, operation);
  }

  /**
   * Monitor file deletion operation
   */
  async monitorDelete<T>(
    fileType: string,
    fileSize: number,
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    return this.monitorOperation({
      operation: 'delete',
      fileType
    }, fileSize, operation);
  }

  /**
   * Monitor file processing operation
   */
  async monitorProcessing<T>(
    fileType: string,
    fileSize: number,
    processingSteps: string[],
    operation: () => Promise<T>
  ): Promise<AppResult<T>> {
    return this.monitorOperation({
      operation: 'process',
      fileType,
      processingSteps
    }, fileSize, operation);
  }

  /**
   * Create a monitored file operation
   */
  createMonitoredOperation<T>(
    operationInfo: FileOperationInfo,
    fileSize: number,
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorOperation(operationInfo, fileSize, operation);
  }

  /**
   * Create a monitored file operation that returns a Result type
   */
  createMonitoredResultOperation<T>(
    operationInfo: FileOperationInfo,
    fileSize: number,
    operation: () => Promise<AppResult<T>>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorResultOperation(operationInfo, fileSize, operation);
  }

  /**
   * Create a monitored upload operation
   */
  createMonitoredUpload<T>(
    fileType: string,
    fileSize: number,
    processingSteps: string[],
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorUpload(fileType, fileSize, processingSteps, operation);
  }

  /**
   * Create a monitored download operation
   */
  createMonitoredDownload<T>(
    fileType: string,
    fileSize: number,
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorDownload(fileType, fileSize, operation);
  }

  /**
   * Create a monitored delete operation
   */
  createMonitoredDelete<T>(
    fileType: string,
    fileSize: number,
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorDelete(fileType, fileSize, operation);
  }

  /**
   * Create a monitored processing operation
   */
  createMonitoredProcessing<T>(
    fileType: string,
    fileSize: number,
    processingSteps: string[],
    operation: () => Promise<T>
  ): () => Promise<AppResult<T>> {
    return () => this.monitorProcessing(fileType, fileSize, processingSteps, operation);
  }
}

/**
 * File monitoring decorator for methods
 */
export function MonitorFile(operationInfo: FileOperationInfo, fileSizeExtractor?: (args: any[]) => number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = FileMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      const fileSize = fileSizeExtractor ? fileSizeExtractor(args) : 0;
      return monitor.monitorOperation(operationInfo, fileSize, () => method.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * File monitoring decorator for methods that return Result types
 */
export function MonitorFileResult(operationInfo: FileOperationInfo, fileSizeExtractor?: (args: any[]) => number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const monitor = FileMonitor.getInstance();

    descriptor.value = async function (...args: any[]) {
      const fileSize = fileSizeExtractor ? fileSizeExtractor(args) : 0;
      return monitor.monitorResultOperation(operationInfo, fileSize, () => method.apply(this, args));
    };

    return descriptor;
  };
}

// Export singleton instance
export const fileMonitor = FileMonitor.getInstance();
