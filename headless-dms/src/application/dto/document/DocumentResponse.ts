import { z } from 'zod';

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

// 4
export const GetDocumentByIdResponseSchema=z.object({
  document:DocumentResponseSchema,
});

export type GetDocumentByIdResponse = z.infer<typeof GetDocumentByIdResponseSchema>;

// 5
export const DeleteDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});

export type DeleteDocumentResponse = z.infer<typeof DeleteDocumentResponseSchema>;
  
// 6
export const UploadDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UploadDocumentResponse = z.infer<typeof UploadDocumentResponseSchema>;

// 7
export const DownloadDocumentResponseSchema = z.object({
  filePath: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export type DownloadDocumentResponse = z.infer<typeof DownloadDocumentResponseSchema>;

// 8
export const GenerateDownloadLinkResponseSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.date(),
  token: z.string(),
});

export type GenerateDownloadLinkResponse = z.infer<typeof GenerateDownloadLinkResponseSchema>;

// 9
export const DownloadDocumentByTokenResponseSchema=z.object({
  document:DocumentResponseSchema,
});

export type DownloadDocumentByTokenResponse = z.infer<typeof DownloadDocumentByTokenResponseSchema>;




// 10
export const UpdateDocumentNameResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UpdateDocumentNameResponse = z.infer<typeof UpdateDocumentNameResponseSchema>;

// 11
export const AddTagsToDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type AddTagsToDocumentResponse = z.infer<typeof AddTagsToDocumentResponseSchema>;

// 12
export const RemoveTagsFromDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type RemoveTagsFromDocumentResponse = z.infer<typeof RemoveTagsFromDocumentResponseSchema>;

// 13
export const ReplaceTagsinDocumentResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type ReplaceTagsinDocumentResponse = z.infer<typeof ReplaceTagsinDocumentResponseSchema>;

// 14
export const UpdateDocumentMetadataResponseSchema=z.object({
  success:z.boolean(),
  message:z.string(),
});
export type UpdateDocumentMetadataResponse = z.infer<typeof UpdateDocumentMetadataResponseSchema>;






