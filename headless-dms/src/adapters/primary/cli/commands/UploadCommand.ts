import { Command } from 'commander';
import { injectable, inject } from 'tsyringe';
import { BulkUploadUseCase, BulkUploadOptions } from '../../../../application/use-cases/document/BulkUploadUseCase.js';

/**
 * CLI command for bulk uploading documents
 * Integrates with existing application services for business logic
 */
@injectable()
export class UploadCommand {
  constructor(
    @inject(BulkUploadUseCase) private bulkUploadUseCase: BulkUploadUseCase
  ) {}

  /**
   * Register the upload command with the CLI program
   */
  public register(program: Command): void {
    program
      .command('upload')
      .description('Bulk upload documents to the system')
      .option('-d, --directory <path>', 'Directory containing documents to upload')
      .option('-c, --concurrent <number>', 'Number of concurrent uploads', '3')
      .option('-t, --tags <tags>', 'Comma-separated tags for all documents')
      .option('--metadata <json>', 'JSON metadata for all documents')
      .option('--dry-run', 'Show what would be uploaded without actually uploading')
      .action(async (options) => {
        try {
          // Parse and validate options
          const uploadOptions: BulkUploadOptions = {
            directory: options.directory,
            concurrent: parseInt(options.concurrent) || 3,
            tags: options.tags ? options.tags.split(',').map((tag: string) => tag.trim()) : [],
            metadata: options.metadata ? JSON.parse(options.metadata) : {},
            dryRun: options.dryRun || false
          };

          console.log('Starting bulk upload operation...');
          console.log('Options:', uploadOptions);

          // Execute bulk upload use case
          const result = await this.bulkUploadUseCase.execute(uploadOptions);

          if (result.isOk()) {
            const uploadResult = result.unwrap();
            console.log('\n✅ Bulk upload completed successfully!');
            console.log(`📊 Summary:`);
            console.log(`   Total files: ${uploadResult.totalFiles}`);
            console.log(`   Uploaded: ${uploadResult.uploadedFiles}`);
            console.log(`   Failed: ${uploadResult.failedFiles}`);
            console.log(`   Skipped: ${uploadResult.skippedFiles}`);
            console.log(`   Success rate: ${uploadResult.successRate.toFixed(1)}%`);
            console.log(`   Duration: ${(uploadResult.duration / 1000).toFixed(1)}s`);
          } else {
            console.error('❌ Bulk upload failed:', result.unwrapErr?.()?.message || 'Unknown error');
            process.exit(1);
        }
        } catch (error) {
          console.error('❌ Upload failed:', error);
          process.exit(1);
        }
      });
  }
}
