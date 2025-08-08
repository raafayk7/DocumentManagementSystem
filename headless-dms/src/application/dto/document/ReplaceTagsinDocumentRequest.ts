import { z } from 'zod';

export const ReplaceTagsinDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

export type ReplaceTagsinDocumentRequest = z.infer<typeof ReplaceTagsinDocumentRequestSchema>;

    