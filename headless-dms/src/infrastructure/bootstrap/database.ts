// src/bootstrap/database.ts
import { AppConfig } from './config.js';
import { db } from '../database/index.js';

export async function initializeDatabase(config: AppConfig): Promise<any> {
  console.log('Initializing database connection...');

  try {
    // Test database connection
    const testQuery = await db.execute('SELECT 1 as test');
    console.log('Database connection established successfully');

    // Return the database instance
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error(`Database initialization failed: ${error}`);
  }
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await db.execute('SELECT 1 as test');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
} 