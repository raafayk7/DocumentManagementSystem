import { z } from 'zod';

export const DeleteDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    userId: z.string().uuid('Invalid user ID'),
});

export type DeleteDocumentRequest = z.infer<typeof DeleteDocumentRequestSchema>;

