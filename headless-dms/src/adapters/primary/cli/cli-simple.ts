#!/usr/bin/env node

import { Command } from 'commander';

/**
 * Simple CLI for testing without dependency injection
 */
class SimpleCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  private setupCLI(): void {
    this.program
      .name('dms-cli-simple')
      .description('Simple DMS CLI Tool (No DI)')
      .version('1.0.0');

    // Add a simple test command
    this.program
      .command('test')
      .description('Test command to verify CLI works')
      .action(() => {
        console.log('✅ CLI is working!');
        console.log('🚀 Phase 5 CLI tool is functional');
      });

    // Add help command
    this.program
      .command('help')
      .description('Show help')
      .action(() => {
        this.program.help();
      });
  }

  public async run(): Promise<void> {
    try {
      console.log('🚀 Starting Simple DMS CLI...');
      await this.program.parseAsync();
    } catch (error) {
      console.error('CLI Error:', error);
      process.exit(1);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SimpleCLI();
  cli.run().catch((error) => {
    console.error('Failed to run CLI:', error);
    process.exit(1);
  });
}

export { SimpleCLI };
