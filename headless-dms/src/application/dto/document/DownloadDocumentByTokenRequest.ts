import { z } from 'zod';

export const DownloadDocumentByTokenRequestSchema = z.object({
    token: z.string().min(1, 'Token cannot be empty'),
});

export type DownloadDocumentByTokenRequest = z.infer<typeof DownloadDocumentByTokenRequestSchema>;