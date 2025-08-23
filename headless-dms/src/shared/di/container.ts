import 'reflect-metadata';
import { container } from 'tsyringe';
import { IDocumentRepository } from '../../ports/output/IDocumentRepository.js';
import { DrizzleDocumentRepository } from '../../adapters/secondary/database/implementations/drizzle-document.repository.js';
import { IUserRepository } from '../../ports/output/IUserRepository.js';
import { DrizzleUserRepository } from '../../adapters/secondary/database/implementations/drizzle-user.repository.js';
import { IFileService } from '../../ports/output/IFileService.js';
import { LocalFileService } from '../../adapters/secondary/file-storage/local-file.service.js';
// DocumentService removed - now using DocumentApplicationService
import { AuthApplicationService } from '../../application/services/AuthApplicationService.js';
import { UserApplicationService } from '../../application/services/UserApplicationService.js';
import { DocumentApplicationService } from '../../application/services/DocumentApplicationService.js';
import { IAuthApplicationService } from '../../ports/input/IAuthApplicationService.js';
import { IUserApplicationService } from '../../ports/input/IUserApplicationService.js';
import { IDocumentApplicationService } from '../../ports/input/IDocumentApplicationService.js';
import { ILogger } from '../../ports/output/ILogger.js';
import { ConsoleLogger } from '../../adapters/secondary/logging/console-logger.service.js';
import { FileLogger } from '../../adapters/secondary/logging/file-logger.service.js';
import {UserValidator, DocumentValidator, EmailValidator} from '../../domain/validators/index.js';
import { AuthDomainService, UserDomainService, DocumentDomainService } from '../../domain/services/index.js';
import { IAuthStrategy } from '../../ports/output/IAuthStrategy.js';
import { JwtAuthStrategy, LocalAuthStrategy } from '../../adapters/secondary/auth/index.js';
import { IAuthHandler } from '../../ports/output/IAuthHandler.js';
import { AuthHandler } from '../../adapters/secondary/auth/implementations/AuthHandler.js';

// Import all use cases
import { 
  AuthenticateUserUseCase,
  CreateUserUseCase,
  GetUsersUseCase,
  GetUserByIdUseCase,
  ChangeUserRoleUseCase,
  DeleteUserUseCase,
  ChangeUserPasswordUseCase,
  ValidateUserCredentialsUseCase
} from '../../application/use-cases/user/index.js';

import {
  GetDocumentsUseCase,
  GetDocumentByIdUseCase,
  UpdateDocumentNameUseCase,
  UpdateDocumentMetadataUseCase,
  DeleteDocumentUseCase,
  UploadDocumentUseCase,
  GenerateDownloadLinkUseCase,
  DownloadDocumentByTokenUseCase,
  ReplaceTagsInDocumentUseCase
} from '../../application/use-cases/document/index.js';

// Register repositories
container.registerSingleton<IDocumentRepository>('IDocumentRepository', DrizzleDocumentRepository);
container.registerSingleton<IUserRepository>('IUserRepository', DrizzleUserRepository);
container.registerSingleton<IFileService>('IFileService', LocalFileService);
container.registerSingleton<IFileService>('IFileStorage', LocalFileService); // Alias for compatibility

// Register loggers
container.registerSingleton<ILogger>('ILogger', ConsoleLogger);
// Uncomment to use FileLogger instead:
// container.registerSingleton<ILogger>('ILogger', FileLogger);

// Register authentication strategies
// Use JWT strategy for production, Local strategy for testing
if (process.env.NODE_ENV === 'test') {
  container.registerSingleton<IAuthStrategy>('IAuthStrategy', LocalAuthStrategy);
} else {
  container.registerSingleton<IAuthStrategy>('IAuthStrategy', JwtAuthStrategy);
}

// Register authentication handler
container.registerSingleton<IAuthHandler>('IAuthHandler', AuthHandler);

// Register application services (both concrete classes and interfaces)
container.registerSingleton('AuthApplicationService', AuthApplicationService);
container.registerSingleton('UserApplicationService', UserApplicationService);
container.registerSingleton('DocumentApplicationService', DocumentApplicationService);

// Register application service interfaces for use case injection
container.registerSingleton<IAuthApplicationService>('IAuthApplicationService', AuthApplicationService);
container.registerSingleton<IUserApplicationService>('IUserApplicationService', UserApplicationService);
container.registerSingleton<IDocumentApplicationService>('IDocumentApplicationService', DocumentApplicationService);

// Register validators
container.registerSingleton('UserValidator', UserValidator);
container.registerSingleton('DocumentValidator', DocumentValidator);
container.registerSingleton('EmailValidator', EmailValidator);

// Register domain services
container.registerSingleton('AuthDomainService', AuthDomainService);
container.registerSingleton('UserDomainService', UserDomainService);
container.registerSingleton('DocumentDomainService', DocumentDomainService);

// Register all use cases
container.registerSingleton(AuthenticateUserUseCase);
container.registerSingleton(CreateUserUseCase);
container.registerSingleton(GetUsersUseCase);
container.registerSingleton(GetUserByIdUseCase);
container.registerSingleton(ChangeUserRoleUseCase);
container.registerSingleton(DeleteUserUseCase);
container.registerSingleton(ChangeUserPasswordUseCase);
container.registerSingleton(ValidateUserCredentialsUseCase);

container.registerSingleton(GetDocumentsUseCase);
container.registerSingleton(GetDocumentByIdUseCase);
container.registerSingleton(UpdateDocumentNameUseCase);
container.registerSingleton(UpdateDocumentMetadataUseCase);
container.registerSingleton(DeleteDocumentUseCase);
container.registerSingleton(UploadDocumentUseCase);
container.registerSingleton(GenerateDownloadLinkUseCase);
container.registerSingleton(DownloadDocumentByTokenUseCase);
container.registerSingleton(ReplaceTagsInDocumentUseCase);

export { container }; 