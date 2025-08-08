import { z } from 'zod';

export const GenerateDownloadLinkRequestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  expiresInMinutes: z.number().min(1).max(1440).default(5), // 1 minute to 24 hours, default 5 minutes
});

export type GenerateDownloadLinkRequest = z.infer<typeof GenerateDownloadLinkRequestSchema>; 