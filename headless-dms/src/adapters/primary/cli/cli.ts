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
  private downloadCommand: DownloadCommand;
  private uploadCommand: UploadCommand;
  private statusCommand: StatusCommand;

  constructor() {
    this.program = new Command();
    this.initializeCommands();
    this.setupCLI();
  }

  private initializeCommands(): void {
    // Initialize commands with dependency injection
    this.downloadCommand = container.resolve(DownloadCommand);
    this.uploadCommand = container.resolve(UploadCommand);
    this.statusCommand = container.resolve(StatusCommand);
  }

  private setupCLI(): void {
    this.program
      .name('dms-cli')
      .description('Document Management System CLI Tool');

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
