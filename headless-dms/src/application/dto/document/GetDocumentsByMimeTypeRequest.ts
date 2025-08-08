import { z } from 'zod';

export const GetDocumentsByMimeTypeRequestSchema = z.object({
    mimeType: z.string().min(1, 'Mime type cannot be empty'),
});

export type GetDocumentsByMimeTypeRequest = z.infer<typeof GetDocumentsByMimeTypeRequestSchema>;