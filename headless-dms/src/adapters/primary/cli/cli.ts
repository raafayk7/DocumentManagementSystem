#!/usr/bin/env node

import { Command } from 'commander';
import { container } from '../../../shared/di/container.js';
import { DownloadCommand } from './commands/DownloadCommand.js';
import { UploadCommand } from './commands/UploadCommand.js';
import { StatusCommand } from './commands/StatusCommand.js';

/**
 * Main CLI entry point for the Document Management System
 * Integrates with existing hexagonal architecture and services
 */
class DocumentManagementCLI {
  private program: Command;
  private downloadCommand!: DownloadCommand;
  private uploadCommand!: UploadCommand;
  private statusCommand!: StatusCommand;

  constructor() {
    this.program = new Command();
    this.initializeCommands();
    this.setupCLI();
  }

  private initializeCommands(): void {
    try {
      console.log('Initializing CLI commands...');
      
      // Initialize commands with dependency injection
      this.downloadCommand = container.resolve(DownloadCommand);
      console.log('✅ Download command initialized');
      
      this.uploadCommand = container.resolve(UploadCommand);
      console.log('✅ Upload command initialized');
      
      this.statusCommand = container.resolve(StatusCommand);
      console.log('✅ Status command initialized');
      
      console.log('All CLI commands initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize CLI commands:', error);
      console.error('This might be due to missing dependencies in the container');
      process.exit(1);
    }
  }

  private setupCLI(): void {
    this.program
      .name('dms-cli')
      .description('Document Management System CLI Tool')
      .version('1.0.0');

    // Add download command
    this.downloadCommand.register(this.program);
    
    // Add upload command
    this.uploadCommand.register(this.program);
    
    // Add status command
    this.statusCommand.register(this.program);

    // Global error handling
    this.program.exitOverride();
  }

  public async run(): Promise<void> {
    try {
      console.log('🚀 Starting DMS CLI...');
      await this.program.parseAsync();
    } catch (error) {
      console.error('CLI Error:', error);
      process.exit(1);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new DocumentManagementCLI();
  cli.run().catch((error) => {
    console.error('Failed to run CLI:', error);
    process.exit(1);
  });
}

export { DocumentManagementCLI };
