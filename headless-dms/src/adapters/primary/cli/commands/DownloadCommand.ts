import { Command } from 'commander';
import { injectable } from 'tsyringe';
import { container } from '../../../../shared/di/container.js';

/**
 * CLI command for bulk downloading documents
 * Integrates with existing application services for business logic
 */
@injectable()
export class DownloadCommand {
  constructor() {}

  /**
   * Register the download command with the CLI program
   */
  public register(program: Command): void {
    program
      .command('download')
      .description('Bulk download documents from the system')
      .option('-f, --folder <path>', 'Download documents from specific folder')
      .option('-o, --output <path>', 'Output directory for downloads', './downloads')
      .option('-c, --concurrent <number>', 'Number of concurrent downloads', '5')
      .option('-r, --resume', 'Resume interrupted downloads')
      .option('--format <format>', 'Output format (json, csv)', 'json')
      .action(async (options) => {
        try {
          // TODO: Implement bulk download logic
          // This will call BulkDownloadUseCase from application layer
          console.log('Download command executed with options:', options);
          
          // Placeholder for actual implementation
          console.log('Bulk download functionality coming in next steps...');
        } catch (error) {
          console.error('Download failed:', error);
          process.exit(1);
        }
      });
  }
}
