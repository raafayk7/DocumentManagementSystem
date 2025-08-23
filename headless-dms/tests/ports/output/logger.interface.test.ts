/**
 * ILogger Output Port Interface Tests
 * 
 * Tests the contract and method signatures of the ILogger interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { ILogger, LogLevel, LogContext } from '../../../src/ports/output/ILogger.js';

describe('ILogger Output Port Interface', () => {
  let mockLogger: ILogger;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockLogger = {
      error: (message: string, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      warn: (message: string, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      info: (message: string, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      debug: (message: string, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      log: (level: keyof LogLevel, message: string, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      logError: (error: Error, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      logRequest: (request: any, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      logResponse: (response: any, context?: LogContext): void => {
        // Mock implementation for testing interface compliance
      },

      child: (context: LogContext): ILogger => {
        // Return a new mock logger instance
        return {
          error: () => {},
          warn: () => {},
          info: () => {},
          debug: () => {},
          log: () => {},
          logError: () => {},
          logRequest: () => {},
          logResponse: () => {},
          child: () => mockLogger
        };
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockLogger).to.have.property('error');
      expect(mockLogger).to.have.property('warn');
      expect(mockLogger).to.have.property('info');
      expect(mockLogger).to.have.property('debug');
      expect(mockLogger).to.have.property('log');
      expect(mockLogger).to.have.property('logError');
      expect(mockLogger).to.have.property('logRequest');
      expect(mockLogger).to.have.property('logResponse');
      expect(mockLogger).to.have.property('child');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockLogger.error).to.equal('function');
      expect(typeof mockLogger.warn).to.equal('function');
      expect(typeof mockLogger.info).to.equal('function');
      expect(typeof mockLogger.debug).to.equal('function');
      expect(typeof mockLogger.log).to.equal('function');
      expect(typeof mockLogger.logError).to.equal('function');
      expect(typeof mockLogger.logRequest).to.equal('function');
      expect(typeof mockLogger.logResponse).to.equal('function');
      expect(typeof mockLogger.child).to.equal('function');
    });
  });

  describe('Basic Logging Methods', () => {
    it('should handle error method with message and optional context', () => {
      const message = 'Error occurred';
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.error(message);
        mockLogger.error(message, context);
      }).to.not.throw();
    });

    it('should handle warn method with message and optional context', () => {
      const message = 'Warning message';
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.warn(message);
        mockLogger.warn(message, context);
      }).to.not.throw();
    });

    it('should handle info method with message and optional context', () => {
      const message = 'Info message';
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.info(message);
        mockLogger.info(message, context);
      }).to.not.throw();
    });

    it('should handle debug method with message and optional context', () => {
      const message = 'Debug message';
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.debug(message);
        mockLogger.debug(message, context);
      }).to.not.throw();
    });
  });

  describe('Structured Logging Methods', () => {
    it('should handle log method with level, message, and optional context', () => {
      const level: keyof LogLevel = 'ERROR';
      const message = 'Structured log message';
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.log(level, message);
        mockLogger.log(level, message, context);
      }).to.not.throw();
    });

    it('should handle all log levels', () => {
      const levels: (keyof LogLevel)[] = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      const message = 'Test message';
      
      levels.forEach(level => {
        expect(() => {
          mockLogger.log(level, message);
        }).to.not.throw();
      });
    });
  });

  describe('Utility Logging Methods', () => {
    it('should handle logError with Error object and optional context', () => {
      const error = new Error('Test error');
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.logError(error);
        mockLogger.logError(error, context);
      }).to.not.throw();
    });

    it('should handle logRequest with request object and optional context', () => {
      const request = { method: 'GET', url: '/api/users' };
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.logRequest(request);
        mockLogger.logRequest(request, context);
      }).to.not.throw();
    });

    it('should handle logResponse with response object and optional context', () => {
      const response = { status: 200, body: { success: true } };
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      expect(() => {
        mockLogger.logResponse(response);
        mockLogger.logResponse(response, context);
      }).to.not.throw();
    });
  });

  describe('Child Logger Creation', () => {
    it('should handle child method with context', () => {
      const context: LogContext = { userId: 'user123', action: 'login' };
      
      const childLogger = mockLogger.child(context);
      
      expect(childLogger).to.be.an('object');
      expect(childLogger).to.have.property('error');
      expect(childLogger).to.have.property('warn');
      expect(childLogger).to.have.property('info');
      expect(childLogger).to.have.property('debug');
      expect(childLogger).to.have.property('log');
      expect(childLogger).to.have.property('logError');
      expect(childLogger).to.have.property('logRequest');
      expect(childLogger).to.have.property('logResponse');
      expect(childLogger).to.have.property('child');
    });

    it('should create child logger with all required methods', () => {
      const context: LogContext = { module: 'auth' };
      const childLogger = mockLogger.child(context);
      
      expect(typeof childLogger.error).to.equal('function');
      expect(typeof childLogger.warn).to.equal('function');
      expect(typeof childLogger.info).to.equal('function');
      expect(typeof childLogger.debug).to.equal('function');
      expect(typeof childLogger.log).to.equal('function');
      expect(typeof childLogger.logError).to.equal('function');
      expect(typeof childLogger.logRequest).to.equal('function');
      expect(typeof childLogger.logResponse).to.equal('function');
      expect(typeof childLogger.child).to.equal('function');
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept string parameters for messages', () => {
      const messages = [
        'Simple message',
        'Message with special chars: !@#$%^&*()',
        'Message with numbers: 12345',
        'Message with spaces and   tabs',
        ''
      ];
      
      messages.forEach(message => {
        expect(() => {
          mockLogger.error(message);
          mockLogger.warn(message);
          mockLogger.info(message);
          mockLogger.debug(message);
          mockLogger.log('ERROR', message);
        }).to.not.throw();
      });
    });

    it('should accept LogContext for context parameters', () => {
      const contexts: LogContext[] = [
        {},
        { userId: 'user123' },
        { action: 'login', timestamp: new Date() },
        { nested: { key: 'value' } },
        { array: [1, 2, 3], boolean: true, number: 42 }
      ];
      
      contexts.forEach(context => {
        expect(() => {
          mockLogger.error('test', context);
          mockLogger.warn('test', context);
          mockLogger.info('test', context);
          mockLogger.debug('test', context);
          mockLogger.log('ERROR', 'test', context);
        }).to.not.throw();
      });
    });

    it('should accept Error objects for logError', () => {
      const errors = [
        new Error('Test error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new SyntaxError('Syntax error')
      ];
      
      errors.forEach(error => {
        expect(() => {
          mockLogger.logError(error);
        }).to.not.throw();
      });
    });

    it('should accept any objects for logRequest and logResponse', () => {
      const requests = [
        { method: 'GET', url: '/api/users' },
        { body: { email: 'test@example.com' } },
        { headers: { 'Content-Type': 'application/json' } }
      ];
      
      const responses = [
        { status: 200, body: { success: true } },
        { headers: { 'Content-Type': 'application/json' } },
        { error: 'Not found' }
      ];
      
      requests.forEach(request => {
        expect(() => {
          mockLogger.logRequest(request);
        }).to.not.throw();
      });
      
      responses.forEach(response => {
        expect(() => {
          mockLogger.logResponse(response);
        }).to.not.throw();
      });
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return void for logging methods', () => {
      const message = 'Test message';
      const context: LogContext = { userId: 'user123' };
      const error = new Error('Test error');
      const request = { method: 'GET' };
      const response = { status: 200 };
      
      const results = [
        mockLogger.error(message),
        mockLogger.warn(message),
        mockLogger.info(message),
        mockLogger.debug(message),
        mockLogger.log('ERROR', message),
        mockLogger.logError(error),
        mockLogger.logRequest(request),
        mockLogger.logResponse(response)
      ];
      
      results.forEach(result => {
        expect(result).to.be.undefined;
      });
    });

    it('should consistently return ILogger for child method', () => {
      const context: LogContext = { userId: 'user123' };
      const childLogger = mockLogger.child(context);
      
      expect(childLogger).to.be.an('object');
      expect(childLogger).to.have.property('error');
      expect(childLogger).to.have.property('warn');
      expect(childLogger).to.have.property('info');
      expect(childLogger).to.have.property('debug');
      expect(childLogger).to.have.property('log');
      expect(childLogger).to.have.property('logError');
      expect(childLogger).to.have.property('logRequest');
      expect(childLogger).to.have.property('logResponse');
      expect(childLogger).to.have.property('child');
    });
  });

  describe('Interface Data Structures', () => {
    it('should handle LogLevel structure', () => {
      const logLevel: LogLevel = {
        ERROR: 'error',
        WARN: 'warn',
        INFO: 'info',
        DEBUG: 'debug'
      };
      
      expect(logLevel).to.have.property('ERROR');
      expect(logLevel).to.have.property('WARN');
      expect(logLevel).to.have.property('INFO');
      expect(logLevel).to.have.property('DEBUG');
      expect(logLevel.ERROR).to.equal('error');
      expect(logLevel.WARN).to.equal('warn');
      expect(logLevel.INFO).to.equal('info');
      expect(logLevel.DEBUG).to.equal('debug');
    });

    it('should handle LogContext structure', () => {
      const context: LogContext = {
        userId: 'user123',
        action: 'login',
        timestamp: new Date(),
        nested: { key: 'value' },
        array: [1, 2, 3],
        boolean: true,
        number: 42
      };
      
      expect(context).to.have.property('userId');
      expect(context).to.have.property('action');
      expect(context).to.have.property('timestamp');
      expect(context).to.have.property('nested');
      expect(context).to.have.property('array');
      expect(context).to.have.property('boolean');
      expect(context).to.have.property('number');
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedLogger: ILogger & { additionalMethod?: () => void } = {
        ...mockLogger,
        additionalMethod: () => {}
      };
      
      expect(extendedLogger.error).to.be.a('function');
      expect(extendedLogger.info).to.be.a('function');
      expect(extendedLogger.additionalMethod).to.be.a('function');
    });
  });

  describe('Error Handling', () => {
    it('should handle logging operations that may fail', () => {
      // This test verifies the interface contract, not the implementation
      // The actual implementation will be tested in concrete adapter tests
      
      expect(mockLogger.error).to.be.a('function');
      expect(mockLogger.warn).to.be.a('function');
      expect(mockLogger.info).to.be.a('function');
      expect(mockLogger.debug).to.be.a('function');
      expect(mockLogger.log).to.be.a('function');
      expect(mockLogger.logError).to.be.a('function');
      expect(mockLogger.logRequest).to.be.a('function');
      expect(mockLogger.logResponse).to.be.a('function');
      expect(mockLogger.child).to.be.a('function');
      
      // Verify that the methods can be called without throwing errors
      const message = 'Test message';
      const context: LogContext = { userId: 'user123' };
      const error = new Error('Test error');
      const request = { method: 'GET' };
      const response = { status: 200 };
      
      expect(() => {
        mockLogger.error(message);
        mockLogger.warn(message);
        mockLogger.info(message);
        mockLogger.debug(message);
        mockLogger.log('ERROR', message);
        mockLogger.logError(error);
        mockLogger.logRequest(request);
        mockLogger.logResponse(response);
        mockLogger.child(context);
      }).to.not.throw();
    });
  });
});
