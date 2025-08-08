import { z } from 'zod';

export const DeleteDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
});

export type DeleteDocumentRequest = z.infer<typeof DeleteDocumentRequestSchema>;

