// src/app.ts - Pure entry point
import 'reflect-metadata';
import { bootstrap } from './adapters/secondary/bootstrap/index.js';

// Start the application
const start = async () => {
  try {
    console.log('Starting application...');
    
    // Bootstrap the application (CLI args will be parsed automatically)
    await bootstrap({
      validateConfig: true,
      initializeDatabase: true,
      setupServer: true,
    });

    console.log('Application started successfully');
    
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
};

// Start the application
start();
