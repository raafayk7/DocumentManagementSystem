// src/app.ts
import 'reflect-metadata';
import { bootstrap } from './bootstrap/index.js';

// Global error handlers (essential for concurrency)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development, but log the error
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Always exit on uncaught exceptions
  process.exit(1);
});

// Start the application using bootstrap with CLI support
const start = async () => {
  try {
    console.log('Starting application...');
    
    // Bootstrap the application (CLI args will be parsed automatically)
    const result = await bootstrap({
      validateConfig: true,
      initializeDatabase: true,
      setupServer: true,
    });

    console.log('Application started successfully');
    console.log('Platform:', process.platform);
    console.log('Node version:', process.version);
    console.log('Startup mode:', result.cliArgs?.mode || 'dev');
    
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

start();
