import { ILogger, LogContext, LogLevel } from './logger.service.interface.js';
import { injectable } from 'tsyringe';
import fs from 'fs';
import path from 'path';

@injectable()
export class FileLogger implements ILogger {
  private context: LogContext = {};
  private logDir: string;
  private logFile: string;

  constructor() {
    // Default constructor for DI
    this.logDir = 'logs';
    this.logFile = path.join(this.logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    
    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeToFile(logEntry: any): void {
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
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

    this.writeToFile(logEntry);
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
    const childLogger = new FileLogger();
    childLogger.context = { ...this.context, ...context };
    return childLogger;
  }
} 