export interface LogLevel {
  ERROR: 'error';
  WARN: 'warn';
  INFO: 'info';
  DEBUG: 'debug';
}

export interface LogContext {
  [key: string]: any;
}

export interface ILogger {
  // Basic logging methods
  error(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;

  // Structured logging with additional metadata
  log(level: keyof LogLevel, message: string, context?: LogContext): void;

  // Utility methods for common logging patterns
  logError(error: Error, context?: LogContext): void;
  logRequest(request: any, context?: LogContext): void;
  logResponse(response: any, context?: LogContext): void;

  // Child logger creation (for scoped logging)
  child(context: LogContext): ILogger;
} 