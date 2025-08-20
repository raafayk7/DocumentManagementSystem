import { z } from 'zod';

export const GetDocumentsByIdRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
});

export type GetDocumentsByIdRequest = z.infer<typeof GetDocumentsByIdRequestSchema>;

