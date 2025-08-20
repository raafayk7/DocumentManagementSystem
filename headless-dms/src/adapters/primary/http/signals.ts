// src/bootstrap/signals.ts
import { IHttpServer } from '../../../ports/input/IHttpServer.js';

// Shutdown state management
let isShuttingDown = false;
let shutdownStartTime: number | null = null;

// Graceful shutdown function
const gracefulShutdown = async (server: IHttpServer, signal: string) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  shutdownStartTime = Date.now();
  
  console.log(`Shutdown initiated (${signal})`);
  
  // Note: Delay removed due to Windows signal handling differences
  // The core graceful shutdown functionality works correctly
  
  try {
    // Stop accepting new requests
    console.log('Stopping HTTP server (graceful shutdown)');
    await server.stop();
    
    const shutdownDuration = Date.now() - (shutdownStartTime || 0);
    console.log(`Shutdown completed successfully (${shutdownDuration}ms)`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown', error);
    process.exit(1);
  }
};

export function setupSignalHandlers(server: IHttpServer): void {
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