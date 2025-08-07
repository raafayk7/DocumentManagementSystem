import { ILogger, LogContext, LogLevel } from '../../application/interfaces/logger.service.interface.js';
import { injectable } from 'tsyringe';

@injectable()
export class ConsoleLogger implements ILogger {
  private context: LogContext = {};

  constructor() {
    // Default constructor for DI - no parameters needed
  }

  error(message: string, context?: LogContext): void {
    this.log('ERROR', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('WARN', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('INFO', message, context);
  }

  debug(message: string, context?: LogContext): void {
    this.log('DEBUG', message, context);
  }

  log(level: keyof LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const mergedContext = { ...this.context, ...context };
    
    const logEntry = {
      timestamp,
      level,
      message,
      ...mergedContext
    };

    switch (level) {
      case 'ERROR':
        console.error(JSON.stringify(logEntry));
        break;
      case 'WARN':
        console.warn(JSON.stringify(logEntry));
        break;
      case 'INFO':
        console.info(JSON.stringify(logEntry));
        break;
      case 'DEBUG':
        console.debug(JSON.stringify(logEntry));
        break;
      default:
        console.log(JSON.stringify(logEntry));
    }
  }

  logError(error: Error, context?: LogContext): void {
    this.error(error.message, {
      ...context,
      stack: error.stack,
      name: error.name
    });
  }

  logRequest(request: any, context?: LogContext): void {
    this.info('HTTP Request', {
      ...context,
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body
    });
  }

  logResponse(response: any, context?: LogContext): void {
    this.info('HTTP Response', {
      ...context,
      statusCode: response.statusCode,
      headers: response.headers
    });
  }

  child(context: LogContext): ILogger {
    const childLogger = new ConsoleLogger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }
} 