// src/bootstrap/signals.ts
import Fastify from 'fastify';

// Shutdown state management
let isShuttingDown = false;
let shutdownStartTime: number | null = null;

// Graceful shutdown function
const gracefulShutdown = async (server: Fastify.FastifyInstance, signal: string) => {
  if (isShuttingDown) {
    server.log.info('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  shutdownStartTime = Date.now();
  
  server.log.info(`Shutdown initiated (${signal})`);
  
  // Add delay for testing in development mode
  if (process.env.NODE_ENV === 'development') {
    server.log.info('Development mode: Adding 10 second delay for testing');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  try {
    // Stop accepting new requests
    server.log.info('Stopping HTTP server (graceful shutdown)');
    await server.close();
    
    const shutdownDuration = Date.now() - (shutdownStartTime || 0);
    server.log.info(`Shutdown completed successfully (${shutdownDuration}ms)`);
    
    process.exit(0);
  } catch (error) {
    server.log.error('Error during shutdown', error);
    process.exit(1);
  }
};

export function setupSignalHandlers(server: Fastify.FastifyInstance): void {
  console.log('Setting up signal handlers...');

  // Signal handlers
  process.on('SIGTERM', () => {
    console.log('SIGTERM received!');
    gracefulShutdown(server, 'SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received!');
    gracefulShutdown(server, 'SIGINT');
  });

  // Windows-specific shutdown handling
  if (process.platform === 'win32') {
    process.on('SIGBREAK', () => {
      console.log('SIGBREAK received (Windows Ctrl+Break)');
      gracefulShutdown(server, 'SIGBREAK');
    });
  }

  console.log('Signal handlers setup successfully');
} 