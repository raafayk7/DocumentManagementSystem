// src/commander/cli.ts
import { Command } from 'commander';
import { z } from 'zod';

// CLI argument validation schema
const CliArgsSchema = z.object({
  mode: z.enum(['dev', 'prod', 'test']).default('dev'),
  port: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(65535)).optional(),
  host: z.string().optional(),
  help: z.boolean().optional(),
});

export type CliArgs = z.infer<typeof CliArgsSchema>;

// Mode configuration
export const modeConfig = {
  dev: {
    logging: 'debug',
    healthChecks: true,
    shutdownDelay: 10000,
    validation: 'relaxed'
  },
  prod: {
    logging: 'info',
    healthChecks: true,
    shutdownDelay: 0,
    validation: 'strict'
  },
  test: {
    logging: 'error',
    healthChecks: false,
    shutdownDelay: 0,
    validation: 'minimal'
  }
} as const;

export type StartupMode = keyof typeof modeConfig;

// Parse CLI arguments
export function parseCliArgs(): CliArgs {
  const program = new Command();

  program
    .name('headless-dms')
    .description('Headless Document Management System')
    .version('1.0.0')
    .option('-m, --mode <mode>', 'Startup mode (dev, prod, test)', 'dev')
    .option('-p, --port <port>', 'Server port', '3000')
    .option('-h, --host <host>', 'Server host', '0.0.0.0')
    .helpOption('-H, --help', 'Display help information');

  program.parse();

  const options = program.opts();

  try {
    // Validate CLI arguments
    const validatedArgs = CliArgsSchema.parse({
      mode: options.mode,
      port: options.port,
      host: options.host,
      help: options.help,
    });

    console.log('CLI arguments parsed successfully:', {
      mode: validatedArgs.mode,
      port: validatedArgs.port,
      host: validatedArgs.host,
    });

    return validatedArgs;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid CLI arguments:');
      error.issues.forEach((err: any) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    } else {
      console.error('CLI argument parsing failed:', error);
    }
    process.exit(1);
  }
}

// Get mode configuration
export function getModeConfig(mode: StartupMode) {
  return modeConfig[mode];
}

// Validate mode-specific configuration
export function validateModeConfig(mode: StartupMode, config: any): void {
  const modeSettings = getModeConfig(mode);
  
  console.log(`Validating ${mode} mode configuration:`, modeSettings);
  
  // Mode-specific validation rules
  switch (mode) {
    case 'dev':
      // Development mode is more permissive
      break;
    case 'prod':
      // Production mode requires stricter validation
      if (!config.JWT_SECRET || config.JWT_SECRET === 'supersecretkey') {
        throw new Error('Production mode requires secure JWT secrets');
      }
      break;
    case 'test':
      // Test mode allows insecure settings
      break;
  }
} 