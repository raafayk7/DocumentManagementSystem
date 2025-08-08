import { z } from 'zod';

export const GetDocumentsByTagsRequestSchema = z.object({
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
});

export type GetDocumentsByTagsRequest = z.infer<typeof GetDocumentsByTagsRequestSchema>;

