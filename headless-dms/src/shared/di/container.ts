import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../../ports/output/IDocumentRepository.js';
import { DrizzleDocumentRepository } from '../../adapters/secondary/database/implementations/drizzle-document.repository.js';
import { IUserRepository } from '../../ports/output/IUserRepository.js';
import { DrizzleUserRepository } from '../../adapters/secondary/database/implementations/drizzle-user.repository.js';
import { IFileService } from '../../ports/output/IFileService.js';
import { LocalFileService } from '../../adapters/secondary/file-storage/local-file.service.js';
import { IStorageStrategy } from '../../ports/output/IStorageStrategy.js';
import { LocalStorageStrategy } from '../../adapters/secondary/storage/strategies/LocalStorageStrategy.js';
import { IAuthHandler } from '../../ports/output/IAuthHandler.js';
import { AuthHandler } from '../../adapters/secondary/auth/implementations/AuthHandler.js';
import { IAuthStrategy } from '../../ports/output/IAuthStrategy.js';
import { LocalAuthStrategy } from '../../adapters/secondary/auth/implementations/LocalAuthStrategy.js';
import { JwtAuthStrategy } from '../../adapters/secondary/auth/implementations/JwtAuthStrategy.js';
import { ILogger } from '../../ports/output/ILogger.js';
import { ConsoleLogger } from '../../adapters/secondary/logging/console-logger.service.js';
import { FileLogger } from '../../adapters/secondary/logging/file-logger.service.js';
import { IAuthApplicationService } from '../../ports/input/IAuthApplicationService.js';
import { AuthApplicationService } from '../../application/services/AuthApplicationService.js';
import { IDocumentApplicationService } from '../../ports/input/IDocumentApplicationService.js';
import { DocumentApplicationService } from '../../application/services/DocumentApplicationService.js';
import { IUserApplicationService } from '../../ports/input/IUserApplicationService.js';
import { UserApplicationService } from '../../application/services/UserApplicationService.js';
import { BulkDownloadUseCase } from '../../application/use-cases/document/BulkDownloadUseCase.js';
import { BulkUploadUseCase } from '../../application/use-cases/document/BulkUploadUseCase.js';

// Domain Services
import { AuthDomainService } from '../../domain/services/AuthDomainService.js';
import { UserDomainService } from '../../domain/services/UserDomainService.js';
import { DocumentDomainService } from '../../domain/services/DocumentDomainService.js';

// CLI Services
import { ConcurrencyManager } from '../../adapters/primary/cli/services/ConcurrencyManager.js';
import { ProgressTracker } from '../../adapters/primary/cli/services/ProgressTracker.js';
import { BackgroundJobProcessor } from '../../adapters/primary/cli/services/BackgroundJobProcessor.js';
import { RateLimiter } from '../../adapters/primary/cli/services/RateLimiter.js';
import { ResourceManager } from '../../adapters/primary/cli/services/ResourceManager.js';

// Register repositories
container.registerSingleton<IDocumentRepository>('IDocumentRepository', DrizzleDocumentRepository);
container.registerSingleton<IUserRepository>('IUserRepository', DrizzleUserRepository);

// Register file services
container.registerSingleton<IFileService>('IFileService', LocalFileService);

// Register storage strategies
container.registerSingleton<IStorageStrategy>('IStorageStrategy', LocalStorageStrategy);

// Register auth services
container.registerSingleton<IAuthHandler>('IAuthHandler', AuthHandler);
container.registerSingleton<IAuthStrategy>('IAuthStrategy', LocalAuthStrategy);
container.registerSingleton<JwtAuthStrategy>('JwtAuthStrategy', JwtAuthStrategy);

// Register logging services
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
container.registerSingleton<FileLogger>('FileLoggerService', FileLogger);

// Register domain services
container.registerSingleton('AuthDomainService', AuthDomainService);
container.registerSingleton('UserDomainService', UserDomainService);
container.registerSingleton('DocumentDomainService', DocumentDomainService);

// Register application services
container.registerSingleton<IAuthApplicationService>('IAuthApplicationService', AuthApplicationService);
container.registerSingleton<IDocumentApplicationService>('IDocumentApplicationService', DocumentApplicationService);
container.registerSingleton<IUserApplicationService>('IUserApplicationService', UserApplicationService);

// Register use cases
container.registerSingleton(BulkDownloadUseCase);
container.registerSingleton(BulkUploadUseCase);

// Register CLI services
container.registerSingleton(ConcurrencyManager);
container.registerSingleton(ProgressTracker);
container.registerSingleton(BackgroundJobProcessor);
container.registerSingleton(RateLimiter);
container.registerSingleton(ResourceManager);

export { container }; 