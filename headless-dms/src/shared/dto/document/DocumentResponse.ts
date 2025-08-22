import { z } from 'zod';
import { AppResult } from '@carbonteq/hexapp';
import { nestWithKey, extractId, toSerialized } from '@carbonteq/hexapp';
import { BaseDto, type DtoValidationResult } from '../base/index.js';

// Reusing existing DocumentSchema from src/documents/dto/documents.dto.ts
// 1
export const DocumentResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  size: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()),
  metadata: z.record(z.string(), z.string()),
});

export type DocumentResponse = z.infer<typeof DocumentResponseSchema>;

/**
 * Document Response DTO that extends BaseDto
 * Provides structured response for document data
 */
export class DocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDocument = nestWithKey('document');
  private readonly nestDocumentData = nestWithKey('data');

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly filePath: string,
    public readonly mimeType: string,
    public readonly size: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly tags: string[],
    public readonly metadata: Record<string, string>
  ) {
    super();
  }

  /**
   * Create DocumentResponseDto from document entity using hexapp composition
   */
  static fromEntity(document: any): DocumentResponseDto {
    const serialized = toSerialized(document) as any;
    return new DocumentResponseDto(
      extractId(document),
      serialized.name,
      serialized.filePath,
      serialized.mimeType,
      serialized.size,
      serialized.createdAt,
      serialized.updatedAt,
      serialized.tags || [],
      serialized.metadata || {}
    );
  }

  /**
   * Create DocumentResponseDto from document entity data
   */
  static create(
    id: string,
    name: string,
    filePath: string,
    mimeType: string,
    size: string,
    createdAt: Date,
    updatedAt: Date,
    tags: string[] = [],
    metadata: Record<string, string> = {}
  ): DocumentResponseDto {
    return new DocumentResponseDto(
      id,
      name,
      filePath,
      mimeType,
      size,
      createdAt,
      updatedAt,
      tags,
      metadata
    );
  }

  /**
   * Create nested document response using nestWithKey
   */
  toNestedResponse() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestDocumentData(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DocumentResponse {
    return {
      id: this.id,
      name: this.name,
      filePath: this.filePath,
      mimeType: this.mimeType,
      size: this.size,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tags: this.tags,
      metadata: this.metadata
    };
  }

  /**
   * Validate document response structure
   */
  static validateStructure(data: unknown): DtoValidationResult<DocumentResponse> {
    return BaseDto.validate(DocumentResponseSchema, data);
  }
}

// 2
export const PaginationResponseSchema=z.object({
  page:z.number(),
  limit:z.number(),
  total:z.number(),
});

export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;

// 3
export const GetDocumentsResponseSchema = z.object({
  document: z.array(DocumentResponseSchema),
  pagination:PaginationResponseSchema,
});

export type GetDocumentsResponse = z.infer<typeof GetDocumentsResponseSchema>;

/**
 * Get Documents Response DTO that extends BaseDto
 * Provides structured response for document listing with pagination
 */
export class GetDocumentsResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDocuments = nestWithKey('documents');
  private readonly nestData = nestWithKey('data');
  private readonly nestPaginated = nestWithKey('paginated');

  constructor(
    public readonly document: DocumentResponseDto[],
    public readonly pagination: { page: number; limit: number; total: number }
  ) {
    super();
  }

  /**
   * Create GetDocumentsResponseDto from documents and pagination data
   */
  static create(
    documents: DocumentResponseDto[],
    pagination: { page: number; limit: number; total: number }
  ): GetDocumentsResponseDto {
    return new GetDocumentsResponseDto(documents, pagination);
  }

  /**
   * Create nested documents response using nestWithKey
   */
  toNestedDocuments() {
    return this.nestDocuments(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  /**
   * Create nested paginated response using nestWithKey
   */
  toNestedPaginated() {
    return this.nestPaginated(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetDocumentsResponse {
    return {
      document: this.document.map(doc => doc.toPlain()),
      pagination: this.pagination
    };
  }
}

// 4
export const GetDocumentByIdResponseSchema=z.object({
  document:DocumentResponseSchema,
});

export type GetDocumentByIdResponse = z.infer<typeof GetDocumentByIdResponseSchema>;

/**
 * Get Document By ID Response DTO that extends BaseDto
 * Provides structured response for single document lookup
 */
export class GetDocumentByIdResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDocument = nestWithKey('document');
  private readonly nestData = nestWithKey('data');
  private readonly nestLookup = nestWithKey('lookup');

  constructor(
    public readonly document: DocumentResponseDto
  ) {
    super();
  }

  /**
   * Create GetDocumentByIdResponseDto from document data
   */
  static create(document: DocumentResponseDto): GetDocumentByIdResponseDto {
    return new GetDocumentByIdResponseDto(document);
  }

  /**
   * Create nested document response using nestWithKey
   */
  toNestedDocument() {
    return this.nestDocument(this.toPlain());
  }

  /**
   * Create nested data response using nestWithKey
   */
  toNestedData() {
    return this.nestData(this.toPlain());
  }

  /**
   * Create nested lookup response using nestWithKey
   */
  toNestedLookup() {
    return this.nestLookup(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GetDocumentByIdResponse {
    return {
      document: this.document.toPlain()
    };
  }
}

// 5
export const DeleteDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});

export type DeleteDocumentResponse = z.infer<typeof DeleteDocumentResponseSchema>;

/**
 * Delete Document Response DTO that extends BaseDto
 * Provides structured response for document deletion operations
 */
export class DeleteDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDelete = nestWithKey('delete');
  private readonly nestRemoval = nestWithKey('removal');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create DeleteDocumentResponseDto from operation result
   */
  static create(success: boolean, message: string): DeleteDocumentResponseDto {
    return new DeleteDocumentResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Document deleted successfully'): DeleteDocumentResponseDto {
    return new DeleteDocumentResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): DeleteDocumentResponseDto {
    return new DeleteDocumentResponseDto(false, message);
  }

  /**
   * Create nested delete response using nestWithKey
   */
  toNestedDelete() {
    return this.nestDelete(this.toPlain());
  }

  /**
   * Create nested removal response using nestWithKey
   */
  toNestedRemoval() {
    return this.nestRemoval(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DeleteDocumentResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}
  
// 6
export const UploadDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UploadDocumentResponse = z.infer<typeof UploadDocumentResponseSchema>;

/**
 * Upload Document Response DTO that extends BaseDto
 * Provides structured response for document upload operations
 */
export class UploadDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestUpload = nestWithKey('upload');
  private readonly nestFile = nestWithKey('file');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create UploadDocumentResponseDto from operation result
   */
  static create(success: boolean, message: string): UploadDocumentResponseDto {
    return new UploadDocumentResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Document uploaded successfully'): UploadDocumentResponseDto {
    return new UploadDocumentResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): UploadDocumentResponseDto {
    return new UploadDocumentResponseDto(false, message);
  }

  /**
   * Create nested upload response using nestWithKey
   */
  toNestedUpload() {
    return this.nestUpload(this.toPlain());
  }

  /**
   * Create nested file response using nestWithKey
   */
  toNestedFile() {
    return this.nestFile(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UploadDocumentResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// 7
export const DownloadDocumentResponseSchema = z.object({
  filePath: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export type DownloadDocumentResponse = z.infer<typeof DownloadDocumentResponseSchema>;

/**
 * Download Document Response DTO that extends BaseDto
 * Provides structured response for document download operations
 */
export class DownloadDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestDownload = nestWithKey('download');
  private readonly nestFile = nestWithKey('file');
  private readonly nestContent = nestWithKey('content');

  constructor(
    public readonly filePath: string,
    public readonly filename: string,
    public readonly mimeType: string,
    public readonly size: number
  ) {
    super();
  }

  /**
   * Create DownloadDocumentResponseDto from file data
   */
  static create(
    filePath: string,
    filename: string,
    mimeType: string,
    size: number
  ): DownloadDocumentResponseDto {
    return new DownloadDocumentResponseDto(filePath, filename, mimeType, size);
  }

  /**
   * Create nested download response using nestWithKey
   */
  toNestedDownload() {
    return this.nestDownload(this.toPlain());
  }

  /**
   * Create nested file response using nestWithKey
   */
  toNestedFile() {
    return this.nestFile(this.toPlain());
  }

  /**
   * Create nested content response using nestWithKey
   */
  toNestedContent() {
    return this.nestContent(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DownloadDocumentResponse {
    return {
      filePath: this.filePath,
      filename: this.filename,
      mimeType: this.mimeType,
      size: this.size
    };
  }
}

// 8
export const GenerateDownloadLinkResponseSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.date(),
  token: z.string(),
});

export type GenerateDownloadLinkResponse = z.infer<typeof GenerateDownloadLinkResponseSchema>;

/**
 * Generate Download Link Response DTO that extends BaseDto
 * Provides structured response for download link generation
 */
export class GenerateDownloadLinkResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestLink = nestWithKey('link');
  private readonly nestGenerate = nestWithKey('generate');
  private readonly nestTemporary = nestWithKey('temporary');

  constructor(
    public readonly downloadUrl: string,
    public readonly expiresAt: Date,
    public readonly token: string
  ) {
    super();
  }

  /**
   * Create GenerateDownloadLinkResponseDto from link data
   */
  static create(
    downloadUrl: string,
    expiresAt: Date,
    token: string
  ): GenerateDownloadLinkResponseDto {
    return new GenerateDownloadLinkResponseDto(downloadUrl, expiresAt, token);
  }

  /**
   * Create nested link response using nestWithKey
   */
  toNestedLink() {
    return this.nestLink(this.toPlain());
  }

  /**
   * Create nested generate response using nestWithKey
   */
  toNestedGenerate() {
    return this.nestGenerate(this.toPlain());
  }

  /**
   * Create nested temporary response using nestWithKey
   */
  toNestedTemporary() {
    return this.nestTemporary(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): GenerateDownloadLinkResponse {
    return {
      downloadUrl: this.downloadUrl,
      expiresAt: this.expiresAt,
      token: this.token
    };
  }
}

// 9
export const DownloadDocumentByTokenResponseSchema=z.object({
  document:DocumentResponseSchema,
  file: z.instanceof(Buffer), // Include the actual file content
});

export type DownloadDocumentByTokenResponse = z.infer<typeof DownloadDocumentByTokenResponseSchema>;

/**
 * Download Document By Token Response DTO that extends BaseDto
 * Provides structured response for token-based document downloads with file content
 */
export class DownloadDocumentByTokenResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestToken = nestWithKey('token');
  private readonly nestSecure = nestWithKey('secure');
  private readonly nestDownload = nestWithKey('download');

  constructor(
    public readonly document: DocumentResponseDto,
    public readonly file: Buffer
  ) {
    super();
  }

  /**
   * Create DownloadDocumentByTokenResponseDto from document and file data
   */
  static create(
    document: DocumentResponseDto,
    file: Buffer
  ): DownloadDocumentByTokenResponseDto {
    return new DownloadDocumentByTokenResponseDto(document, file);
  }

  /**
   * Create nested token response using nestWithKey
   */
  toNestedToken() {
    return this.nestToken(this.toPlain());
  }

  /**
   * Create nested secure response using nestWithKey
   */
  toNestedSecure() {
    return this.nestSecure(this.toPlain());
  }

  /**
   * Create nested download response using nestWithKey
   */
  toNestedDownload() {
    return this.nestDownload(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): DownloadDocumentByTokenResponse {
    return {
      document: this.document.toPlain(),
      file: this.file
    };
  }
}




// 10
export const UpdateDocumentNameResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UpdateDocumentNameResponse = z.infer<typeof UpdateDocumentNameResponseSchema>;

/**
 * Update Document Name Response DTO that extends BaseDto
 * Provides structured response for document name update operations
 */
export class UpdateDocumentNameResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestName = nestWithKey('name');
  private readonly nestUpdate = nestWithKey('update');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create UpdateDocumentNameResponseDto from operation result
   */
  static create(success: boolean, message: string): UpdateDocumentNameResponseDto {
    return new UpdateDocumentNameResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Document name updated successfully'): UpdateDocumentNameResponseDto {
    return new UpdateDocumentNameResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): UpdateDocumentNameResponseDto {
    return new UpdateDocumentNameResponseDto(false, message);
  }

  /**
   * Create nested name response using nestWithKey
   */
  toNestedName() {
    return this.nestName(this.toPlain());
  }

  /**
   * Create nested update response using nestWithKey
   */
  toNestedUpdate() {
    return this.nestUpdate(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UpdateDocumentNameResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// 11
export const AddTagsToDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type AddTagsToDocumentResponse = z.infer<typeof AddTagsToDocumentResponseSchema>;

/**
 * Add Tags to Document Response DTO that extends BaseDto
 * Provides structured response for adding tags to document operations
 */
export class AddTagsToDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestAdd = nestWithKey('add');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create AddTagsToDocumentResponseDto from operation result
   */
  static create(success: boolean, message: string): AddTagsToDocumentResponseDto {
    return new AddTagsToDocumentResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Tags added to document successfully'): AddTagsToDocumentResponseDto {
    return new AddTagsToDocumentResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): AddTagsToDocumentResponseDto {
    return new AddTagsToDocumentResponseDto(false, message);
  }

  /**
   * Create nested tags response using nestWithKey
   */
  toNestedTags() {
    return this.nestTags(this.toPlain());
  }

  /**
   * Create nested add response using nestWithKey
   */
  toNestedAdd() {
    return this.nestAdd(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): AddTagsToDocumentResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// 12
export const RemoveTagsFromDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type RemoveTagsFromDocumentResponse = z.infer<typeof RemoveTagsFromDocumentResponseSchema>;

/**
 * Remove Tags from Document Response DTO that extends BaseDto
 * Provides structured response for removing tags from document operations
 */
export class RemoveTagsFromDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestRemove = nestWithKey('remove');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create RemoveTagsFromDocumentResponseDto from operation result
   */
  static create(success: boolean, message: string): RemoveTagsFromDocumentResponseDto {
    return new RemoveTagsFromDocumentResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Tags removed from document successfully'): RemoveTagsFromDocumentResponseDto {
    return new RemoveTagsFromDocumentResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): RemoveTagsFromDocumentResponseDto {
    return new RemoveTagsFromDocumentResponseDto(false, message);
  }

  /**
   * Create nested tags response using nestWithKey
   */
  toNestedTags() {
    return this.nestTags(this.toPlain());
  }

  /**
   * Create nested remove response using nestWithKey
   */
  toNestedRemove() {
    return this.nestRemove(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): RemoveTagsFromDocumentResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// 13
export const ReplaceTagsinDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type ReplaceTagsinDocumentResponse = z.infer<typeof ReplaceTagsinDocumentResponseSchema>;

/**
 * Replace Tags in Document Response DTO that extends BaseDto
 * Provides structured response for replacing tags in document operations
 */
export class ReplaceTagsinDocumentResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestTags = nestWithKey('tags');
  private readonly nestReplace = nestWithKey('replace');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create ReplaceTagsinDocumentResponseDto from operation result
   */
  static create(success: boolean, message: string): ReplaceTagsinDocumentResponseDto {
    return new ReplaceTagsinDocumentResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Tags replaced in document successfully'): ReplaceTagsinDocumentResponseDto {
    return new ReplaceTagsinDocumentResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): ReplaceTagsinDocumentResponseDto {
    return new ReplaceTagsinDocumentResponseDto(false, message);
  }

  /**
   * Create nested tags response using nestWithKey
   */
  toNestedTags() {
    return this.nestTags(this.toPlain());
  }

  /**
   * Create nested replace response using nestWithKey
   */
  toNestedReplace() {
    return this.nestReplace(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): ReplaceTagsinDocumentResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}

// 14
export const UpdateDocumentMetadataResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UpdateDocumentMetadataResponse = z.infer<typeof UpdateDocumentMetadataResponseSchema>;

/**
 * Update Document Metadata Response DTO that extends BaseDto
 * Provides structured response for updating document metadata operations
 */
export class UpdateDocumentMetadataResponseDto extends BaseDto {
  // Hexapp composition utilities
  private readonly nestMetadata = nestWithKey('metadata');
  private readonly nestUpdate = nestWithKey('update');
  private readonly nestResult = nestWithKey('result');

  constructor(
    public readonly success: boolean,
    public readonly message: string
  ) {
    super();
  }

  /**
   * Create UpdateDocumentMetadataResponseDto from operation result
   */
  static create(success: boolean, message: string): UpdateDocumentMetadataResponseDto {
    return new UpdateDocumentMetadataResponseDto(success, message);
  }

  /**
   * Create success response
   */
  static success(message: string = 'Document metadata updated successfully'): UpdateDocumentMetadataResponseDto {
    return new UpdateDocumentMetadataResponseDto(true, message);
  }

  /**
   * Create error response
   */
  static error(message: string): UpdateDocumentMetadataResponseDto {
    return new UpdateDocumentMetadataResponseDto(false, message);
  }

  /**
   * Create nested metadata response using nestWithKey
   */
  toNestedMetadata() {
    return this.nestMetadata(this.toPlain());
  }

  /**
   * Create nested update response using nestWithKey
   */
  toNestedUpdate() {
    return this.nestUpdate(this.toPlain());
  }

  /**
   * Create nested result response using nestWithKey
   */
  toNestedResult() {
    return this.nestResult(this.toPlain());
  }

  /**
   * Convert to plain object for use with existing code
   */
  toPlain(): UpdateDocumentMetadataResponse {
    return {
      success: this.success,
      message: this.message
    };
  }
}






