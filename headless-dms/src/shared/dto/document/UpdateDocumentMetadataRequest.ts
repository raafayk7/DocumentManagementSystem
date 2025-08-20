import { z } from 'zod';

export const UpdateDocumentMetadataRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    metadata: z.record(z.string(), z.string()).optional(),
    userId: z.string().uuid('Invalid user ID'),
});

export type UpdateDocumentMetadataRequest = z.infer<typeof UpdateDocumentMetadataRequestSchema>;

