// src/bootstrap/index.ts
import { loadConfig, validateDatabaseConfig, validateServerConfig, validateJWTConfig, AppConfig } from './config.js';
import { setupServer } from './server.js';
import { initializeDatabase } from './database.js';
import { parseCliArgs, validateModeConfig, StartupMode } from '../commander/cli.js';

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

export interface BootstrapOptions {
  validateConfig?: boolean;
  initializeDatabase?: boolean;
  setupServer?: boolean;
  mode?: StartupMode;
}

export interface BootstrapResult {
  config: AppConfig;
  server?: any; // Fastify server instance
  database?: any; // Database connection
  cliArgs?: any; // CLI arguments
}

// Main bootstrap orchestrator
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
  const {
    validateConfig = true,
    initializeDatabase: shouldInitDb = true,
    setupServer: shouldSetupServer = true,
    mode,
  } = options;

  console.log('Starting application bootstrap...');

  try {
    // 1. Parse CLI arguments
    console.log('Parsing CLI arguments...');
    const cliArgs = parseCliArgs();
    const startupMode = mode || cliArgs.mode;

    // 2. Load and validate configuration
    console.log('Loading configuration...');
    const config = loadConfig();
    
    // Override config with CLI arguments
    if (cliArgs.port) {
      config.PORT = cliArgs.port;
    }
    if (cliArgs.host) {
      config.HOST = cliArgs.host;
    }
    
    if (validateConfig) {
      console.log('Validating configuration...');
      validateServerConfig(config);
      validateJWTConfig(config);
      if (shouldInitDb) {
        validateDatabaseConfig(config);
      }
      
      // Validate mode-specific configuration
      validateModeConfig(startupMode, config);
    }

    const result: BootstrapResult = { config, cliArgs };

    // 3. Initialize database (if enabled)
    if (shouldInitDb) {
      console.log('Initializing database...');
      result.database = await initializeDatabase(config);
    }

    // 4. Setup HTTP server (if enabled)
    if (shouldSetupServer) {
      console.log('Setting up HTTP server...');
      result.server = await setupServer(config);
    }

    console.log(`Bootstrap completed successfully in ${startupMode} mode`);
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