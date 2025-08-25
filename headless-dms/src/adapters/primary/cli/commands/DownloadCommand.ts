import { Command } from 'commander';
import { injectable, inject } from 'tsyringe';
import { BulkDownloadUseCase, BulkDownloadOptions } from '../../../../application/use-cases/document/BulkDownloadUseCase.js';

/**
 * CLI command for bulk downloading documents
 * Integrates with existing application services for business logic
 */
@injectable()
export class DownloadCommand {
  constructor(
    @inject(BulkDownloadUseCase) private bulkDownloadUseCase: BulkDownloadUseCase
  ) {}

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
          // Parse and validate options
          const downloadOptions: BulkDownloadOptions = {
            folder: options.folder,
            outputPath: options.output,
            concurrent: parseInt(options.concurrent) || 5,
            resume: options.resume || false,
            format: options.format === 'csv' ? 'csv' : 'json'
          };

          console.log('Starting bulk download operation...');
          console.log('Options:', downloadOptions);

          // Execute bulk download use case
          const result = await this.bulkDownloadUseCase.execute(downloadOptions);

          if (result.isOk()) {
            const downloadResult = result.unwrap();
            console.log('\n✅ Bulk download completed successfully!');
            console.log(`📊 Summary:`);
            console.log(`   Total documents: ${downloadResult.totalDocuments}`);
            console.log(`   Downloaded: ${downloadResult.downloadedDocuments}`);
            console.log(`   Failed: ${downloadResult.failedDocuments}`);
            console.log(`   Success rate: ${downloadResult.successRate.toFixed(1)}%`);
            console.log(`   Duration: ${(downloadResult.duration / 1000).toFixed(1)}s`);
            console.log(`   Output directory: ${downloadResult.outputPath}`);
          } else {
            console.error('❌ Bulk download failed:', result.unwrapErr?.()?.message || 'Unknown error');
            process.exit(1);
          }

        } catch (error) {
          console.error('❌ Download failed:', error);
          process.exit(1);
        }
      });
  }
}
