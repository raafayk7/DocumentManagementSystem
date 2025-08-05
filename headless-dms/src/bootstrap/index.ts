// src/bootstrap/index.ts
import { loadConfig, validateDatabaseConfig, validateServerConfig, validateJWTConfig, AppConfig } from './config.js';
import { setupServer } from './server.js';
import { initializeDatabase } from './database.js';

export interface BootstrapOptions {
  validateConfig?: boolean;
  initializeDatabase?: boolean;
  setupServer?: boolean;
}

export interface BootstrapResult {
  config: AppConfig;
  server?: any; // Fastify server instance
  database?: any; // Database connection
}

// Main bootstrap orchestrator
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const {
    validateConfig = true,
    initializeDatabase: shouldInitDb = true,
    setupServer: shouldSetupServer = true,
  } = options;

  console.log('Starting application bootstrap...');

  try {
    // 1. Load and validate configuration
    console.log('Loading configuration...');
    const config = loadConfig();
    
    if (validateConfig) {
      console.log('Validating configuration...');
      validateServerConfig(config);
      validateJWTConfig(config);
      if (shouldInitDb) {
        validateDatabaseConfig(config);
      }
    }

    const result: BootstrapResult = { config };

    // 2. Initialize database (if enabled)
    if (shouldInitDb) {
      console.log('Initializing database...');
      result.database = await initializeDatabase(config);
    }

    // 3. Setup HTTP server (if enabled)
    if (shouldSetupServer) {
      console.log('Setting up HTTP server...');
      result.server = await setupServer(config);
    }

    console.log('Bootstrap completed successfully');
    return result;

  } catch (error) {
    console.error('Bootstrap failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown function
export async function shutdown(server?: any, database?: any): Promise<void> {
  console.log('Initiating graceful shutdown...');

  try {
    // Close HTTP server
    if (server) {
      console.log('Closing HTTP server...');
      await server.close();
    }

    // Close database connections
    if (database) {
      console.log('Closing database connections...');
      await database.end();
    }

    console.log('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
} 