import { z } from 'zod';


export const AddTagsToDocumentRequestSchema = z.object({
    documentId: z.string().uuid('Invalid document ID'),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
    userId: z.string().uuid('Invalid user ID'),
});

export type AddTagsToDocumentRequest = z.infer<typeof AddTagsToDocumentRequestSchema>;

