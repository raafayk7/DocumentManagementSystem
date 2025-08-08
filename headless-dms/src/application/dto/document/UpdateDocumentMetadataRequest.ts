import { z } from 'zod';

export const UpdateDocumentMetadataRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    metadata: z.record(z.string(), z.string()).optional(),
});

export type UpdateDocumentMetadataRequest = z.infer<typeof UpdateDocumentMetadataRequestSchema>;

