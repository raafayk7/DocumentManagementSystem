import { z } from 'zod';

export const UpdateDocumentNameRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    name: z.string().min(1, 'Document name cannot be empty'),
});

export type UpdateDocumentNameRequest = z.infer<typeof UpdateDocumentNameRequestSchema>;

