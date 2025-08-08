import { z } from 'zod';

export const GetDocumentByNameRequestSchema = z.object({
    name: z.string().min(1, 'Document name cannot be empty'),
});

export type GetDocumentByNameRequest = z.infer<typeof GetDocumentByNameRequestSchema>;


