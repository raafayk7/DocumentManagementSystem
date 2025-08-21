import { z } from 'zod';

export const GetDocumentByIdRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
});

export type GetDocumentByIdRequest = z.infer<typeof GetDocumentByIdRequestSchema>;

