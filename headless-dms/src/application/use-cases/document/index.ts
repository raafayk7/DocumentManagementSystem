// Document use cases
export { AddTagstoDocumentUseCase } from './AddTagstoDocumentUseCase.js';
export { CreateDocumentUseCase } from './CreateDocumentUseCase.js';
export { DeleteDocumentUseCase } from './DeleteDocumentUseCase.js';
export { DownloadDocumentByTokenUseCase } from './DownloadDocumentByTokenUseCase.js';
export { DownloadDocumentUseCase } from './DownloadDocumentUseCase.js';
export { GenerateDownloadLinkUseCase } from './GenerateDownloadLinkUseCase.js';
export { GetDocumentByIdUseCase } from './GetDocumentByIdUseCase.js';
export { GetDocumentsUseCase } from './GetDocumentsUseCase.js';
export { RemoveTagsFromDocumentUseCase } from './RemoveTagsFromDocumentUseCase.js';
export { ReplaceTagsInDocumentUseCase } from './ReplaceTagsInDocumentUseCase.js';
export { UpdateDocumentMetadataUseCase } from './UpdateDocumentMetadataUseCase.js';
export { UpdateDocumentNameUseCase } from './UpdateDocumentNameUseCase.js';
export { UploadDocumentUseCase } from './UploadDocumentUseCase.js';

// Bulk operations
export { BulkDownloadUseCase } from './BulkDownloadUseCase.js';
export { BulkUploadUseCase } from './BulkUploadUseCase.js';
export type { BulkDownloadOptions, BulkDownloadResult, DocumentDownloadInfo } from './BulkDownloadUseCase.js';
export type { BulkUploadOptions, BulkUploadResult, FileUploadInfo } from './BulkUploadUseCase.js';
