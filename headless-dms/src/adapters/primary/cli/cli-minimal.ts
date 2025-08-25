#!/usr/bin/env node

import { Command } from 'commander';

/**
 * Minimal CLI for testing basic functionality
 */
class MinimalCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCLI();
  }

  private setupCLI(): void {
    this.program
      .name('dms-cli-minimal')
      .description('Minimal DMS CLI Tool')
      .version('1.0.0');

    // Test command
    this.program
      .command('test')
      .description('Test command')
      .action(() => {
        console.log('✅ Minimal CLI is working!');
      });

    // Download command (simplified)
    this.program
      .command('download')
      .description('Bulk download documents')
      .option('-f, --folder <path>', 'Download from folder')
      .option('-o, --output <path>', 'Output directory', './downloads')
      .action((options) => {
        console.log('🚀 Download command executed!');
        console.log('Options:', options);
        console.log('✅ This proves the CLI command parsing works!');
      });

    // Upload command (simplified)
    this.program
      .command('upload')
      .description('Bulk upload documents')
      .option('-d, --directory <path>', 'Directory to upload')
      .action((options) => {
        console.log('🚀 Upload command executed!');
        console.log('Options:', options);
        console.log('✅ This proves the CLI command parsing works!');
      });
  }

  public async run(): Promise<void> {
    try {
      console.log('🚀 Starting Minimal DMS CLI...');
      await this.program.parseAsync();
    } catch (error) {
      console.error('CLI Error:', error);
      process.exit(1);
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new MinimalCLI();
  cli.run().catch((error) => {
    console.error('Failed to run CLI:', error);
    process.exit(1);
  });
}

export { MinimalCLI };
