import { describe, it, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import sinon from 'sinon';
import { FastifyHttpServer } from '../../../../src/adapters/primary/http/implementations/FastifyHttpServer.js';
import { IHttpRequest, IHttpResponse } from '../../../../src/ports/input/IHttpServer.js';

describe('FastifyHttpServer Adapter', () => {
  let fastifyServer: FastifyHttpServer;
  let mockFastifyInstance: any;
  let mockFastifyRequest: any;
  let mockFastifyReply: any;

  beforeEach(() => {
    // Create mock Fastify instance
    mockFastifyInstance = {
      listen: sinon.stub().resolves(),
      close: sinon.stub().resolves(),
      get: sinon.stub(),
      post: sinon.stub(),
      put: sinon.stub(),
      patch: sinon.stub(),
      delete: sinon.stub(),
      addHook: sinon.stub(),
      register: sinon.stub(),
      ready: sinon.stub().yields(),
      printRoutes: sinon.stub().returns('Mock Routes'),
    };

    // Create mock Fastify request
    mockFastifyRequest = {
      body: { test: 'data' },
      params: { id: '123' },
      query: { page: '1' },
      headers: { 'content-type': 'application/json' },
      method: 'GET',
      url: '/test',
      user: { id: 'user123', role: 'admin' },
      file: sinon.stub().resolves({ filename: 'test.pdf' }),
      parts: sinon.stub().returns([]),
    };

    // Create mock Fastify reply
    mockFastifyReply = {
      status: sinon.stub().returnsThis(),
      code: sinon.stub().returnsThis(),
      send: sinon.stub(),
      header: sinon.stub().returnsThis(),
    };

    fastifyServer = new FastifyHttpServer(mockFastifyInstance);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor', () => {
    it('should create FastifyHttpServer instance with Fastify instance', () => {
      expect(fastifyServer).to.be.instanceOf(FastifyHttpServer);
      expect(fastifyServer.getInstance()).to.equal(mockFastifyInstance);
    });
  });

  describe('start()', () => {
    it('should start server successfully', async () => {
      await fastifyServer.start(3000, 'localhost');

      expect(mockFastifyInstance.listen.callCount).to.equal(1);
      expect(mockFastifyInstance.listen.firstCall.args[0]).to.deep.equal({
        port: 3000,
        host: 'localhost'
      });
    });

    it('should start server with default host', async () => {
      await fastifyServer.start(3000);

      expect(mockFastifyInstance.listen.callCount).to.equal(1);
      expect(mockFastifyInstance.listen.firstCall.args[0]).to.deep.equal({
        port: 3000,
        host: '0.0.0.0'
      });
    });

    it('should handle start errors', async () => {
      const error = new Error('Start failed');
      mockFastifyInstance.listen.rejects(error);

      try {
        await fastifyServer.start(3000);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('stop()', () => {
    it('should stop server successfully', async () => {
      await fastifyServer.stop();

      expect(mockFastifyInstance.close.callCount).to.equal(1);
    });

    it('should handle stop errors', async () => {
      const error = new Error('Stop failed');
      mockFastifyInstance.close.rejects(error);

      try {
        await fastifyServer.stop();
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('registerRoute()', () => {
    it('should register GET route successfully', () => {
      const handler = sinon.stub().resolves();
      
      fastifyServer.registerRoute('GET', '/test', handler);

      expect(mockFastifyInstance.get.callCount).to.equal(1);
      expect(mockFastifyInstance.get.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.get.firstCall.args[1]).to.deep.equal({});
      expect(mockFastifyInstance.get.firstCall.args[2]).to.be.a('function');
    });

    it('should register POST route successfully', () => {
      const handler = sinon.stub().resolves();
      
      fastifyServer.registerRoute('POST', '/test', handler);

      expect(mockFastifyInstance.post.callCount).to.equal(1);
      expect(mockFastifyInstance.post.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.post.firstCall.args[1]).to.deep.equal({});
      expect(mockFastifyInstance.post.firstCall.args[2]).to.be.a('function');
    });

    it('should register PUT route successfully', () => {
      const handler = sinon.stub().resolves();
      
      fastifyServer.registerRoute('PUT', '/test', handler);

      expect(mockFastifyInstance.put.callCount).to.equal(1);
      expect(mockFastifyInstance.put.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.put.firstCall.args[1]).to.deep.equal({});
      expect(mockFastifyInstance.put.firstCall.args[2]).to.be.a('function');
    });

    it('should register PATCH route successfully', () => {
      const handler = sinon.stub().resolves();
      
      fastifyServer.registerRoute('PATCH', '/test', handler);

      expect(mockFastifyInstance.patch.callCount).to.equal(1);
      expect(mockFastifyInstance.patch.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.patch.firstCall.args[1]).to.deep.equal({});
      expect(mockFastifyInstance.patch.firstCall.args[2]).to.be.a('function');
    });

    it('should register DELETE route successfully', () => {
      const handler = sinon.stub().resolves();
      
      fastifyServer.registerRoute('DELETE', '/test', handler);

      expect(mockFastifyInstance.delete.callCount).to.equal(1);
      expect(mockFastifyInstance.delete.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.delete.firstCall.args[1]).to.deep.equal({});
      expect(mockFastifyInstance.delete.firstCall.args[2]).to.be.a('function');
    });

    it('should register route with middleware', () => {
      const handler = sinon.stub().resolves();
      const middleware = [sinon.stub()];
      
      fastifyServer.registerRoute('GET', '/test', handler, middleware);

      expect(mockFastifyInstance.get.callCount).to.equal(1);
      expect(mockFastifyInstance.get.firstCall.args[0]).to.equal('/test');
      expect(mockFastifyInstance.get.firstCall.args[1]).to.deep.equal({ preHandler: middleware });
      expect(mockFastifyInstance.get.firstCall.args[2]).to.be.a('function');
    });

    it('should throw error for unsupported HTTP method', () => {
      const handler = sinon.stub().resolves();
      
      expect(() => {
        fastifyServer.registerRoute('INVALID', '/test', handler);
      }).to.throw('Unsupported HTTP method: INVALID');
    });

    it('should handle route handler errors', async () => {
      const handler = sinon.stub().rejects(new Error('Handler error'));
      
      // Register the route first to capture the handler
      fastifyServer.registerRoute('GET', '/test', handler);
      
      // Get the registered handler from the mock
      const routeHandler = mockFastifyInstance.get.firstCall.args[2];
      
      await routeHandler(mockFastifyRequest, mockFastifyReply);

      expect(mockFastifyReply.status.callCount).to.equal(1);
      expect(mockFastifyReply.status.firstCall.args[0]).to.equal(500);
      expect(mockFastifyReply.send.callCount).to.equal(1);
      expect(mockFastifyReply.send.firstCall.args[0]).to.deep.equal({ error: 'Internal server error' });
    });
  });

  describe('registerMiddleware()', () => {
    it('should register function middleware', () => {
      const middleware = sinon.stub();
      
      fastifyServer.registerMiddleware(middleware);

      expect(mockFastifyInstance.addHook.callCount).to.equal(1);
      expect(mockFastifyInstance.addHook.firstCall.args[0]).to.equal('preHandler');
      expect(mockFastifyInstance.addHook.firstCall.args[1]).to.equal(middleware);
    });

    it('should register plugin middleware', () => {
      const middleware = {
        plugin: sinon.stub(),
        options: { test: 'options' }
      };
      
      fastifyServer.registerMiddleware(middleware);

      expect(mockFastifyInstance.register.callCount).to.equal(1);
      expect(mockFastifyInstance.register.firstCall.args[0]).to.equal(middleware.plugin);
      expect(mockFastifyInstance.register.firstCall.args[1]).to.deep.equal(middleware.options);
    });

    it('should handle multipart plugin specifically', () => {
      const middleware = {
        plugin: sinon.stub().returns('@fastify/multipart'),
        options: { test: 'options' }
      };
      
      fastifyServer.registerMiddleware(middleware);

      // Should handle multipart plugin specially
      expect(mockFastifyInstance.register.callCount).to.equal(1);
    });

    it('should throw error for invalid middleware format', () => {
      const invalidMiddleware = 'invalid';
      
      expect(() => {
        fastifyServer.registerMiddleware(invalidMiddleware);
      }).to.throw('Invalid middleware format');
    });
  });

  describe('getInstance()', () => {
    it('should return the Fastify instance', () => {
      const instance = fastifyServer.getInstance();
      expect(instance).to.equal(mockFastifyInstance);
    });
  });

  describe('getFastifyInstance()', () => {
    it('should return the Fastify instance', () => {
      const instance = fastifyServer.getFastifyInstance();
      expect(instance).to.equal(mockFastifyInstance);
    });
  });

  describe('registerRoutes()', () => {
    it('should register multiple routes at once', () => {
      const routes = [
        { method: 'GET', path: '/test1', handler: sinon.stub() },
        { method: 'POST', path: '/test2', handler: sinon.stub() }
      ];
      
      fastifyServer.registerRoutes(routes);

      expect(mockFastifyInstance.get.callCount).to.equal(1);
      expect(mockFastifyInstance.post.callCount).to.equal(1);
    });
  });

  describe('logRoutes()', () => {
    it('should log routes when server is ready', () => {
      fastifyServer.logRoutes();

      expect(mockFastifyInstance.ready.callCount).to.equal(1);
      expect(mockFastifyInstance.printRoutes.callCount).to.equal(1);
    });
  });
});

// Note: FastifyHttpRequest and FastifyHttpResponse are private classes
// and cannot be tested directly. They are tested indirectly through the main FastifyHttpServer class.

// Note: FastifyHttpResponse is also a private class
// and cannot be tested directly. It is tested indirectly through the main FastifyHttpServer class.
