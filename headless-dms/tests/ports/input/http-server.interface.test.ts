/**
 * IHttpServer Input Port Interface Tests
 * 
 * Tests the contract and method signatures of the IHttpServer interface
 * without testing actual implementations (that's done in adapter tests)
 */

import { expect } from 'chai';
import { describe, it, beforeEach } from 'mocha';
import { IHttpServer, IHttpRequest, IHttpResponse } from '../../../src/ports/input/IHttpServer.js';

describe('IHttpServer Input Port Interface', () => {
  let mockServer: IHttpServer;

  beforeEach(() => {
    // Create a mock implementation that satisfies the interface
    mockServer = {
      start: async (port: number, host?: string): Promise<void> => {
        // Mock implementation for testing interface compliance
      },

      stop: async (): Promise<void> => {
        // Mock implementation for testing interface compliance
      },

      registerRoute: (method: string, path: string, handler: (req: IHttpRequest, res: IHttpResponse) => Promise<void>, middleware?: any[]): void => {
        // Mock implementation for testing interface compliance
      },

      registerMiddleware: (middleware: any): void => {
        // Mock implementation for testing interface compliance
      },

      getInstance: (): any => {
        // Mock implementation for testing interface compliance
        return {};
      },

      logRoutes: (): void => {
        // Mock implementation for testing interface compliance
      }
    };
  });

  describe('Interface Contract Compliance', () => {
    it('should implement all required methods', () => {
      expect(mockServer).to.have.property('start');
      expect(mockServer).to.have.property('stop');
      expect(mockServer).to.have.property('registerRoute');
      expect(mockServer).to.have.property('registerMiddleware');
      expect(mockServer).to.have.property('getInstance');
      expect(mockServer).to.have.property('logRoutes');
    });

    it('should have correct method signatures', () => {
      expect(typeof mockServer.start).to.equal('function');
      expect(typeof mockServer.stop).to.equal('function');
      expect(typeof mockServer.registerRoute).to.equal('function');
      expect(typeof mockServer.registerMiddleware).to.equal('function');
      expect(typeof mockServer.getInstance).to.equal('function');
      expect(typeof mockServer.logRoutes).to.equal('function');
    });
  });

  describe('Server Lifecycle Methods', () => {
    it('should handle start method with port and host parameters', async () => {
      const port = 3000;
      const host = 'localhost';
      
      const promise = mockServer.start(port, host);
      expect(promise).to.be.instanceOf(Promise);
      
      await promise; // Should complete without error
    });

    it('should handle start method with only port parameter', async () => {
      const port = 3000;
      
      const promise = mockServer.start(port);
      expect(promise).to.be.instanceOf(Promise);
      
      await promise; // Should complete without error
    });

    it('should handle stop method with no parameters', async () => {
      const promise = mockServer.stop();
      expect(promise).to.be.instanceOf(Promise);
      
      await promise; // Should complete without error
    });

    it('should handle async operations correctly', async () => {
      const startPromise = mockServer.start(3000, 'localhost');
      const stopPromise = mockServer.stop();
      
      expect(startPromise).to.be.instanceOf(Promise);
      expect(stopPromise).to.be.instanceOf(Promise);
      
      await Promise.all([startPromise, stopPromise]);
    });
  });

  describe('Route Registration Methods', () => {
    it('should handle registerRoute with method, path, and handler', () => {
      const method = 'GET';
      const path = '/api/users';
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(200).send('OK');
      };
      
      expect(() => {
        mockServer.registerRoute(method, path, handler);
      }).to.not.throw();
    });

    it('should handle registerRoute with middleware', () => {
      const method = 'POST';
      const path = '/api/users';
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(201).send('Created');
      };
      const middleware = [() => {}];
      
      expect(() => {
        mockServer.registerRoute(method, path, handler, middleware);
      }).to.not.throw();
    });

    it('should handle registerRoute with different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      const path = '/api/test';
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(200).send('OK');
      };
      
      methods.forEach(method => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });

    it('should handle registerRoute with different path patterns', () => {
      const method = 'GET';
      const paths = ['/', '/api', '/api/users', '/api/users/:id', '/api/*'];
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(200).send('OK');
      };
      
      paths.forEach(path => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });

    it('should handle registerRoute with different handler types', () => {
      const method = 'GET';
      const path = '/api/test';
      const handlers = [
        async (req: IHttpRequest, res: IHttpResponse) => res.status(200).send('OK'),
        async (req: IHttpRequest, res: IHttpResponse) => { res.status(200).send('OK'); },
        async function(req: IHttpRequest, res: IHttpResponse) { res.status(200).send('OK'); }
      ];
      
      handlers.forEach(handler => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });
  });

  describe('Middleware Registration Methods', () => {
    it('should handle registerMiddleware with function parameter', () => {
      const middleware = async (req: IHttpRequest, res: IHttpResponse) => {
        // Mock middleware
      };
      
      expect(() => {
        mockServer.registerMiddleware(middleware);
      }).to.not.throw();
    });

    it('should handle registerMiddleware with different function types', () => {
      const middlewares = [
        async (req: IHttpRequest, res: IHttpResponse) => {},
        async function(req: IHttpRequest, res: IHttpResponse) {},
        async function namedMiddleware(req: IHttpRequest, res: IHttpResponse) {}
      ];
      
      middlewares.forEach(middleware => {
        expect(() => {
          mockServer.registerMiddleware(middleware);
        }).to.not.throw();
      });
    });

    it('should handle multiple middleware registrations', () => {
      const middleware1 = async (req: IHttpRequest, res: IHttpResponse) => {};
      const middleware2 = async (req: IHttpRequest, res: IHttpResponse) => {};
      const middleware3 = async (req: IHttpRequest, res: IHttpResponse) => {};
      
      expect(() => {
        mockServer.registerMiddleware(middleware1);
        mockServer.registerMiddleware(middleware2);
        mockServer.registerMiddleware(middleware3);
      }).to.not.throw();
    });
  });

  describe('Utility Methods', () => {
    it('should handle getInstance method', () => {
      const result = mockServer.getInstance();
      expect(result).to.be.an('object');
    });

    it('should handle logRoutes method', () => {
      expect(() => {
        mockServer.logRoutes();
      }).to.not.throw();
    });
  });

  describe('Method Parameter Types', () => {
    it('should accept number parameters for port', async () => {
      const ports = [3000, 8080, 9000, 65535];
      
      for (const port of ports) {
        const promise = mockServer.start(port);
        expect(promise).to.be.instanceOf(Promise);
        await promise;
      }
    });

    it('should accept string parameters for host', async () => {
      const hosts = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];
      
      for (const host of hosts) {
        const promise = mockServer.start(3000, host);
        expect(promise).to.be.instanceOf(Promise);
        await promise;
      }
    });

    it('should accept string parameters for HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
      const path = '/test';
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(200).send('OK');
      };
      
      methods.forEach(method => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });

    it('should accept string parameters for paths', () => {
      const method = 'GET';
      const paths = ['/', '/api', '/api/users', '/api/users/:id', '/api/*', '/static/*'];
      const handler = async (req: IHttpRequest, res: IHttpResponse) => {
        res.status(200).send('OK');
      };
      
      paths.forEach(path => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });

    it('should accept function parameters for handlers', () => {
      const method = 'GET';
      const path = '/test';
      const handlers = [
        async (req: IHttpRequest, res: IHttpResponse) => res.status(200).send('OK'),
        async (req: IHttpRequest, res: IHttpResponse) => { res.status(200).send('OK'); },
        async function(req: IHttpRequest, res: IHttpResponse) { res.status(200).send('OK'); },
        async function namedHandler(req: IHttpRequest, res: IHttpResponse) { res.status(200).send('OK'); }
      ];
      
      handlers.forEach(handler => {
        expect(() => {
          mockServer.registerRoute(method, path, handler);
        }).to.not.throw();
      });
    });
  });

  describe('Return Type Consistency', () => {
    it('should consistently return Promise<void> for async methods', async () => {
      const startResult = mockServer.start(3000, 'localhost');
      const stopResult = mockServer.stop();
      
      expect(startResult).to.be.instanceOf(Promise);
      expect(stopResult).to.be.instanceOf(Promise);
      
      await startResult;
      await stopResult;
    });

    it('should consistently return void for sync methods', () => {
      const routeResult = mockServer.registerRoute('GET', '/test', async (req: IHttpRequest, res: IHttpResponse) => {});
      const middlewareResult = mockServer.registerMiddleware(async (req: IHttpRequest, res: IHttpResponse) => {});
      const logRoutesResult = mockServer.logRoutes();
      
      expect(routeResult).to.be.undefined;
      expect(middlewareResult).to.be.undefined;
      expect(logRoutesResult).to.be.undefined;
    });
  });

  describe('Async Operation Handling', () => {
    it('should handle all async methods correctly', async () => {
      const asyncMethods = [
        mockServer.start(3000, 'localhost'),
        mockServer.stop()
      ];
      
      asyncMethods.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      await Promise.all(asyncMethods);
    });

    it('should handle concurrent operations', async () => {
      const promises = [
        mockServer.start(3000, 'localhost'),
        mockServer.start(3001, 'localhost'),
        mockServer.stop()
      ];
      
      promises.forEach(promise => {
        expect(promise).to.be.instanceOf(Promise);
      });
      
      await Promise.all(promises);
    });
  });

  describe('Interface Extensibility', () => {
    it('should allow additional methods in implementations', () => {
      const extendedServer: IHttpServer & { additionalMethod?: () => void } = {
        ...mockServer,
        additionalMethod: () => {}
      };
      
      expect(extendedServer.start).to.be.a('function');
      expect(extendedServer.registerRoute).to.be.a('function');
      expect(extendedServer.additionalMethod).to.be.a('function');
    });

    it('should allow additional properties in implementations', () => {
      const extendedServer: IHttpServer & { port?: number; host?: string } = {
        ...mockServer,
        port: 3000,
        host: 'localhost'
      };
      
      expect(extendedServer.start).to.be.a('function');
      expect(extendedServer.port).to.equal(3000);
      expect(extendedServer.host).to.equal('localhost');
    });
  });

  describe('Method Chaining Support', () => {
    it('should support method chaining for configuration', () => {
      // Test that methods can be called in sequence without throwing errors
      expect(() => {
        mockServer.registerRoute('GET', '/api/users', async (req: IHttpRequest, res: IHttpResponse) => {});
        mockServer.registerRoute('POST', '/api/users', async (req: IHttpRequest, res: IHttpResponse) => {});
        mockServer.registerMiddleware(async (req: IHttpRequest, res: IHttpResponse) => {});
        mockServer.logRoutes();
      }).to.not.throw();
    });
  });
});
