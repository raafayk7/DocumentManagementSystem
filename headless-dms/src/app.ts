// src/app.ts
import 'reflect-metadata';
import Fastify from 'fastify';
import authRoutes from './auth/routes/auth.routes.js';
import documentsRoutes from './documents/documents.routes.js';
import fastifyMultipart from '@fastify/multipart';

// Shutdown state management
let isShuttingDown = false;
let shutdownStartTime: number | null = null;

const app = Fastify({ logger: true });

// Health check route
app.get('/ping', async (request, reply) => {
  return { pong: 'it works!' };
});

app.register(fastifyMultipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB, adjust as needed
});

app.register(documentsRoutes, { prefix: '/documents' });
app.register(authRoutes, { prefix: '/auth' });

// Graceful shutdown function
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    app.log.info('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  shutdownStartTime = Date.now();
  
  app.log.info(`Shutdown initiated (${signal})`);
  
  try {
    // Stop accepting new requests
    app.log.info('Stopping HTTP server (graceful shutdown)');
    await app.close();
    
    const shutdownDuration = Date.now() - (shutdownStartTime || 0);
    app.log.info(`Shutdown completed successfully (${shutdownDuration}ms)`);
    
    process.exit(0);
  } catch (error) {
    app.log.error('Error during shutdown', error);
    process.exit(1);
  }
};

// Signal handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received!');
  gracefulShutdown('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('SIGINT received!');
  gracefulShutdown('SIGINT');
});

// Debug: Log all signal handlers
process.on('SIGUSR1', () => console.log('SIGUSR1 received'));
process.on('SIGUSR2', () => console.log('SIGUSR2 received'));

// Debug: Log process events
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('beforeExit', (code) => {
  console.log(`Process beforeExit with code: ${code}`);
});

// Debug: Log what signals are available
console.log('Platform:', process.platform);
console.log('Node version:', process.version);

// Windows-specific shutdown handling
if (process.platform === 'win32') {
  // Handle Windows console events
  process.on('SIGBREAK', () => {
    console.log('SIGBREAK received (Windows Ctrl+Break)');
    gracefulShutdown('SIGBREAK');
  });
  
  // Handle Windows process termination
  process.on('SIGKILL', () => {
    console.log('SIGKILL received');
    gracefulShutdown('SIGKILL');
  });
}

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    app.log.info('Server listening on http://localhost:3000');
    app.ready(() => {
      console.log(app.printRoutes());
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
