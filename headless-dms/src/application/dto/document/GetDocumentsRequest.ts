import { z } from 'zod';

export const GetDocumentsRequestSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    // Enhanced filter parameters
    name: z.string().optional(),
    mimeType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
    fromDate: z.string().optional(),
    toDate: z.string().optional(),
});

export type GetDocumentsRequest = z.infer<typeof GetDocumentsRequestSchema>;

