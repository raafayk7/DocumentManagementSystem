// src/bootstrap/config.ts
import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Configuration schema validation
const ConfigSchema = z.object({
  // Server configuration
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Database configuration
  DB_HOST: z.string().min(1, 'Database host is required'),
  DB_PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)),
  DB_USER: z.string().min(1, 'Database user is required'),
  DB_PASSWORD: z.string().min(1, 'Database password is required'),
  DB_NAME: z.string().min(1, 'Database name is required'),
  DB_SSL: z.string().transform(val => val === 'true').default(false),
  
  // JWT configuration
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  DOWNLOAD_JWT_SECRET: z.string().min(1, 'Download JWT secret is required'),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

// Configuration loading and validation
export function loadConfig(): AppConfig {
  try {
    const config = ConfigSchema.parse(process.env);
    
    console.log('Configuration loaded successfully:', {
      PORT: config.PORT,
      HOST: config.HOST,
      NODE_ENV: config.NODE_ENV,
      DB_HOST: config.DB_HOST,
      DB_NAME: config.DB_NAME,
    });
    
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err: any) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('Configuration loading failed:', error);
    }
    process.exit(1);
  }
}

// Configuration validation helpers
export function validateDatabaseConfig(config: AppConfig): void {
  if (!config.DB_HOST || !config.DB_USER || !config.DB_PASSWORD || !config.DB_NAME) {
    throw new Error('Missing required database configuration');
  }
}

export function validateServerConfig(config: AppConfig): void {
  if (config.PORT < 1 || config.PORT > 65535) {
    throw new Error(`Invalid port number: ${config.PORT}`);
  }
}

export function validateJWTConfig(config: AppConfig): void {
  if (!config.JWT_SECRET || !config.DOWNLOAD_JWT_SECRET) {
    throw new Error('Missing required JWT configuration');
  }
} 