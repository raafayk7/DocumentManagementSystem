import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { ConsoleLogger } from '../../../../src/adapters/secondary/logging/console-logger.service.js';
import { LogLevel, LogContext } from '../../../../src/ports/output/ILogger.js';

describe('ConsoleLogger Adapter', () => {
  let logger: ConsoleLogger;
  let consoleErrorStub: sinon.SinonStub;
  let consoleWarnStub: sinon.SinonStub;
  let consoleInfoStub: sinon.SinonStub;
  let consoleDebugStub: sinon.SinonStub;
  let consoleLogStub: sinon.SinonStub;

  beforeEach(() => {
    // Create ConsoleLogger instance
    logger = new ConsoleLogger();

    // Stub console methods
    consoleErrorStub = sinon.stub(console, 'error');
    consoleWarnStub = sinon.stub(console, 'warn');
    consoleInfoStub = sinon.stub(console, 'info');
    consoleDebugStub = sinon.stub(console, 'debug');
    consoleLogStub = sinon.stub(console, 'log');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should create ConsoleLogger instance', () => {
      expect(logger).to.be.instanceOf(ConsoleLogger);
    });

    it('should initialize with empty context', () => {
      expect((logger as any).context).to.deep.equal({});
    });
  });

  describe('error()', () => {
    it('should log error message with timestamp', () => {
      const message = 'Database connection failed';
      const context = { userId: 'user-123', operation: 'login' };

      logger.error(message, context);

      expect(consoleErrorStub.callCount).to.equal(1);
      const logCall = consoleErrorStub.firstCall;
      expect(logCall.args[0]).to.be.a('string');

      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.level).to.equal('ERROR');
      expect(logEntry.timestamp).to.be.a('string');
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.operation).to.equal('login');
    });

    it('should log error without context', () => {
      const message = 'Simple error message';

      logger.error(message);

      expect(consoleErrorStub.callCount).to.equal(1);
      const logCall = consoleErrorStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.level).to.equal('ERROR');
      expect(logEntry.timestamp).to.be.a('string');
    });
  });

  describe('warn()', () => {
    it('should log warning message with timestamp', () => {
      const message = 'User login attempt limit reached';
      const context = { userId: 'user-123', attempts: 5 };

      logger.warn(message, context);

      expect(consoleWarnStub.callCount).to.equal(1);
      const logCall = consoleWarnStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.level).to.equal('WARN');
      expect(logEntry.timestamp).to.be.a('string');
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.attempts).to.equal(5);
    });
  });

  describe('info()', () => {
    it('should log info message with timestamp', () => {
      const message = 'User logged in successfully';
      const context = { userId: 'user-123', ip: '192.168.1.1' };

      logger.info(message, context);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.level).to.equal('INFO');
      expect(logEntry.timestamp).to.be.a('string');
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.ip).to.equal('192.168.1.1');
    });
  });

  describe('debug()', () => {
    it('should log debug message with timestamp', () => {
      const message = 'Processing authentication request';
      const context = { requestId: 'req-123', timestamp: Date.now() };

      logger.debug(message, context);

      expect(consoleDebugStub.callCount).to.equal(1);
      const logCall = consoleDebugStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.level).to.equal('DEBUG');
      expect(logEntry.timestamp).to.be.a('number');
      expect(logEntry.requestId).to.equal('req-123');
    });
  });

  describe('log()', () => {
    it('should log with custom level', () => {
      const level: keyof LogLevel = 'INFO';
      const message = 'Custom log message';
      const context = { custom: 'data' };

      logger.log(level, message, context);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.level).to.equal(level);
      expect(logEntry.message).to.equal(message);
      expect(logEntry.custom).to.equal('data');
    });

    it('should handle unknown log level with console.log', () => {
      const level = 'UNKNOWN' as keyof LogLevel;
      const message = 'Unknown level message';

      logger.log(level, message);

      expect(consoleLogStub.callCount).to.equal(1);
      const logCall = consoleLogStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.level).to.equal(level);
      expect(logEntry.message).to.equal(message);
    });

    it('should merge context with instance context', () => {
      const instanceContext = { service: 'AuthService', version: '1.0.0' };
      (logger as any).context = instanceContext;

      const message = 'Test message';
      const callContext = { userId: 'user-123' };

      logger.log('INFO', message, callContext);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.service).to.equal('AuthService');
      expect(logEntry.version).to.equal('1.0.0');
      expect(logEntry.userId).to.equal('user-123');
    });
  });

  describe('logError()', () => {
    it('should log error with stack trace and name', () => {
      const error = new Error('Database connection failed');
      const context = { userId: 'user-123' };

      logger.logError(error, context);

      expect(consoleErrorStub.callCount).to.equal(1);
      const logCall = consoleErrorStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('Database connection failed');
      expect(logEntry.level).to.equal('ERROR');
      expect(logEntry.name).to.equal('Error');
      expect(logEntry.stack).to.be.a('string');
      expect(logEntry.userId).to.equal('user-123');
    });

    it('should log error without context', () => {
      const error = new Error('Simple error');

      logger.logError(error);

      expect(consoleErrorStub.callCount).to.equal(1);
      const logCall = consoleErrorStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('Simple error');
      expect(logEntry.name).to.equal('Error');
      expect(logEntry.stack).to.be.a('string');
    });
  });

  describe('logRequest()', () => {
    it('should log HTTP request details', () => {
      const request = {
        method: 'POST',
        url: '/auth/login',
        headers: { 'content-type': 'application/json' },
        body: { email: 'test@example.com' },
      };
      const context = { userId: 'user-123' };

      logger.logRequest(request, context);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('HTTP Request');
      expect(logEntry.level).to.equal('INFO');
      expect(logEntry.method).to.equal('POST');
      expect(logEntry.url).to.equal('/auth/login');
      expect(logEntry.headers).to.deep.equal({ 'content-type': 'application/json' });
      expect(logEntry.body).to.deep.equal({ email: 'test@example.com' });
      expect(logEntry.userId).to.equal('user-123');
    });

    it('should log request without context', () => {
      const request = {
        method: 'GET',
        url: '/health',
        headers: {},
        body: {},
      };

      logger.logRequest(request);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('HTTP Request');
      expect(logEntry.method).to.equal('GET');
      expect(logEntry.url).to.equal('/health');
    });
  });

  describe('logResponse()', () => {
    it('should log HTTP response details', () => {
      const response = {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
      };
      const context = { userId: 'user-123', duration: 150 };

      logger.logResponse(response, context);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('HTTP Response');
      expect(logEntry.level).to.equal('INFO');
      expect(logEntry.statusCode).to.equal(200);
      expect(logEntry.headers).to.deep.equal({ 'content-type': 'application/json' });
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.duration).to.equal(150);
    });

    it('should log response without context', () => {
      const response = {
        statusCode: 404,
        headers: {},
      };

      logger.logResponse(response);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('HTTP Response');
      expect(logEntry.statusCode).to.equal(404);
    });
  });

  describe('child()', () => {
    it('should create child logger with merged context', () => {
      const parentContext = { service: 'AuthService', version: '1.0.0' };
      (logger as any).context = parentContext;

      const childContext = { userId: 'user-123' };
      const childLogger = logger.child(childContext);

      expect(childLogger).to.be.instanceOf(ConsoleLogger);
      expect(childLogger).to.not.equal(logger);

      // Test that child logger has merged context
      const message = 'Child logger message';
      childLogger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.service).to.equal('AuthService');
      expect(logEntry.version).to.equal('1.0.0');
      expect(logEntry.userId).to.equal('user-123');
    });

    it('should create child logger without parent context', () => {
      const childContext = { userId: 'user-123' };
      const childLogger = logger.child(childContext);

      expect(childLogger).to.be.instanceOf(ConsoleLogger);

      const message = 'Child logger message';
      childLogger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.service).to.be.undefined;
    });

    it('should create child logger with empty context', () => {
      const childLogger = logger.child({});

      expect(childLogger).to.be.instanceOf(ConsoleLogger);

      const message = 'Child logger message';
      childLogger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.message).to.equal('Child logger message');
      expect(logEntry.level).to.equal('INFO');
    });
  });

  describe('Context Inheritance', () => {
    it('should inherit context from parent to child', () => {
      const parentContext = { service: 'AuthService', version: '1.0.0' };
      (logger as any).context = parentContext;

      const childLogger = logger.child({ userId: 'user-123' });
      const grandchildLogger = childLogger.child({ operation: 'login' });

      const message = 'Grandchild message';
      grandchildLogger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.service).to.equal('AuthService');
      expect(logEntry.version).to.equal('1.0.0');
      expect(logEntry.userId).to.equal('user-123');
      expect(logEntry.operation).to.equal('login');
    });

    it('should override parent context with child context', () => {
      const parentContext = { service: 'AuthService', version: '1.0.0' };
      (logger as any).context = parentContext;

      const childContext = { service: 'UserService', version: '2.0.0' };
      const childLogger = logger.child(childContext);

      const message = 'Child message';
      childLogger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      expect(logEntry.service).to.equal('UserService');
      expect(logEntry.version).to.equal('2.0.0');
    });
  });

  describe('Timestamp Format', () => {
    it('should generate valid ISO timestamp', () => {
      const message = 'Test message';
      logger.info(message);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      
      const timestamp = new Date(logEntry.timestamp);
      expect(timestamp.getTime()).to.be.a('number');
      expect(timestamp.toISOString()).to.equal(logEntry.timestamp);
    });

    it('should have consistent timestamp across log calls', () => {
      const message1 = 'First message';
      const message2 = 'Second message';

      logger.info(message1);
      logger.info(message2);

      expect(consoleInfoStub.callCount).to.equal(2);
      
      const logCall1 = consoleInfoStub.firstCall;
      const logCall2 = consoleInfoStub.secondCall;
      
      const logEntry1 = JSON.parse(logCall1.args[0]);
      const logEntry2 = JSON.parse(logCall2.args[0]);
      
      expect(logEntry1.timestamp).to.be.a('string');
      expect(logEntry2.timestamp).to.be.a('string');
    });
  });

  describe('JSON Serialization', () => {
    it('should handle circular references gracefully', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      const context = { data: circularObj };
      const message = 'Circular reference test';

      // Should throw error due to circular reference in JSON.stringify
      expect(() => {
        logger.info(message, context);
      }).to.throw('Converting circular structure to JSON');

      expect(consoleInfoStub.callCount).to.equal(0);
    });

    it('should handle undefined and null values', () => {
      const context = {
        undefinedValue: undefined,
        nullValue: null,
        emptyString: '',
        zero: 0,
        falseValue: false,
      };

      const message = 'Undefined and null test';
      logger.info(message, context);

      expect(consoleInfoStub.callCount).to.equal(1);
      const logCall = consoleInfoStub.firstCall;
      const logEntry = JSON.parse(logCall.args[0]);
      
      expect(logEntry.undefinedValue).to.be.undefined;
      expect(logEntry.nullValue).to.be.null;
      expect(logEntry.emptyString).to.equal('');
      expect(logEntry.zero).to.equal(0);
      expect(logEntry.falseValue).to.equal(false);
    });
  });

  describe('Log Level Mapping', () => {
    it('should map ERROR level to console.error', () => {
      logger.log('ERROR', 'Error message');
      expect(consoleErrorStub.callCount).to.equal(1);
      expect(consoleWarnStub.callCount).to.equal(0);
      expect(consoleInfoStub.callCount).to.equal(0);
      expect(consoleDebugStub.callCount).to.equal(0);
    });

    it('should map WARN level to console.warn', () => {
      logger.log('WARN', 'Warning message');
      expect(consoleWarnStub.callCount).to.equal(1);
      expect(consoleErrorStub.callCount).to.equal(0);
      expect(consoleInfoStub.callCount).to.equal(0);
      expect(consoleDebugStub.callCount).to.equal(0);
    });

    it('should map INFO level to console.info', () => {
      logger.log('INFO', 'Info message');
      expect(consoleInfoStub.callCount).to.equal(1);
      expect(consoleErrorStub.callCount).to.equal(0);
      expect(consoleWarnStub.callCount).to.equal(0);
      expect(consoleDebugStub.callCount).to.equal(0);
    });

    it('should map DEBUG level to console.debug', () => {
      logger.log('DEBUG', 'Debug message');
      expect(consoleDebugStub.callCount).to.equal(1);
      expect(consoleErrorStub.callCount).to.equal(0);
      expect(consoleWarnStub.callCount).to.equal(0);
      expect(consoleInfoStub.callCount).to.equal(0);
    });

    it('should map unknown level to console.log', () => {
      logger.log('UNKNOWN' as keyof LogLevel, 'Unknown level message');
      expect(consoleLogStub.callCount).to.equal(1);
      expect(consoleErrorStub.callCount).to.equal(0);
      expect(consoleWarnStub.callCount).to.equal(0);
      expect(consoleInfoStub.callCount).to.equal(0);
      expect(consoleDebugStub.callCount).to.equal(0);
    });
  });
});
