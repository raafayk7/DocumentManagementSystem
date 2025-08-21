import { injectable } from 'tsyringe';
import { ILogger, LogContext, LogLevel } from '../../../ports/output/ILogger.js';

export interface LogEntry {
  level: string;
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}

@injectable()
export class MockLogger implements ILogger {
  logs: LogEntry[] = [];
  logLevel: string = 'info';
  log(level: keyof LogLevel, message: string, context?: LogContext): void {
    this.addLog(level, message, context);
  }
  logError(error: Error, context?: LogContext): void {
    this.addLog('error', error.message, { ...context, error: error.message });
  }
  logRequest(request: any, context?: LogContext): void {}
  logResponse(response: any, context?: LogContext): void {}
 
  constructor() {
    this.logs = [];
  }

  info(message: string, context?: Record<string, any>): void {
    this.addLog('info', message, context);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.addLog('warn', message, context);
  }

  error(message: string, context?: Record<string, any>): void {
    this.addLog('error', message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.addLog('debug', message, context);
  }

  child(context: Record<string, any>): ILogger {
    // Create a child logger that inherits the parent's context
    const childLogger = new MockLogger();
    childLogger.logs = [...this.logs];
    childLogger.logLevel = this.logLevel;
    return childLogger;
  }

  // Mock-specific methods for testing
  clearLogs(): void {
    this.logs = [];
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getLogsByLevel(level: string): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getInfoLogs(): LogEntry[] {
    return this.getLogsByLevel('info');
  }

  getWarnLogs(): LogEntry[] {
    return this.getLogsByLevel('warn');
  }

  getErrorLogs(): LogEntry[] {
    return this.getLogsByLevel('error');
  }

  getDebugLogs(): LogEntry[] {
    return this.getLogsByLevel('debug');
  }

  hasLogWithMessage(message: string): boolean {
    return this.logs.some(log => log.message.includes(message));
  }

  hasLogWithContext(key: string, value: any): boolean {
    return this.logs.some(log => log.context && log.context[key] === value);
  }

  getLastLog(): LogEntry | undefined {
    return this.logs[this.logs.length - 1];
  }

  getLogCount(): number {
    return this.logs.length;
  }

  setLogLevel(level: string): void {
    this.logLevel = level;
  }

  getLogLevel(): string {
    return this.logLevel;
  }

  // Helper method to check if specific operations were logged
  wasOperationLogged(operation: string): boolean {
    return this.logs.some(log => 
      log.message.toLowerCase().includes(operation.toLowerCase())
    );
  }

  // Helper method to get logs for a specific operation
  getLogsForOperation(operation: string): LogEntry[] {
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(operation.toLowerCase())
    );
  }

  // Helper method to check if error was logged
  wasErrorLogged(errorMessage?: string): boolean {
    const errorLogs = this.getErrorLogs();
    if (errorMessage) {
      return errorLogs.some(log => log.message.includes(errorMessage));
    }
    return errorLogs.length > 0;
  }

  // Helper method to get formatted log output for debugging
  getFormattedLogs(): string {
    return this.logs.map(log => 
      `[${log.timestamp.toISOString()}] ${log.level.toUpperCase()}: ${log.message}${log.context ? ` | Context: ${JSON.stringify(log.context)}` : ''}`
    ).join('\n');
  }

  // Private method to add log entries
  private addLog(level: string, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      level,
      message,
      context,
      timestamp: new Date()
    };
    
    this.logs.push(logEntry);
    
    // In test mode, you might want to console.log for debugging
    if (process.env.NODE_ENV === 'test') {
      console.log(`[MOCK LOG] ${level.toUpperCase()}: ${message}`, context || '');
    }
  }

  
}
