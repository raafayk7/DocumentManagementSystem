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
  
  // Note: Delay removed due to Windows signal handling differences
  // The core graceful shutdown functionality works correctly
  
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
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received!');
    await gracefulShutdown(server, 'SIGTERM');
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received!');
    await gracefulShutdown(server, 'SIGINT');
  });

  // Windows-specific shutdown handling
  if (process.platform === 'win32') {
    process.on('SIGBREAK', async () => {
      console.log('SIGBREAK received (Windows Ctrl+Break)');
      await gracefulShutdown(server, 'SIGBREAK');
    });
  }

  console.log('Signal handlers setup successfully');
} 