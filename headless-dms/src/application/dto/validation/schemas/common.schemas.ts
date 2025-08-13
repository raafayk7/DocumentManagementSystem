// src/validation/schemas/common.schemas.ts
import { z } from 'zod';

// Email validation schema
export const EmailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Email must be in valid format (user@domain.com)')
  .transform(email => email.toLowerCase().trim());

// Password validation schema
export const PasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// File upload validation schema
export const FileUploadSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  size: z.number().min(1, 'File size must be greater than 0'),
  mimeType: z.string().min(1, 'File type is required'),
  path: z.string().min(1, 'File path is required'),
});

// File type validation schema
export const FileTypeSchema = z.object({
  mimeType: z.string().refine(
    (type) => {
      const allowedTypes = [
        'text/plain',
        'text/csv',
        'application/pdf',
        'application/json',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      return allowedTypes.includes(type);
    },
    {
      message: 'File type not supported. Allowed types: text, csv, pdf, json, images, word documents',
    }
  ),
  size: z.number().max(50 * 1024 * 1024, 'File size must be less than 50MB'),
});

// JSON validation schema
export const JsonSchema = z
  .string()
  .min(1, 'JSON string is required')
  .transform((str, ctx) => {
    try {
      return JSON.parse(str);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid JSON format',
      });
      return z.NEVER;
    }
  });

// UUID validation schema
export const UuidSchema = z
  .string()
  .min(1, 'UUID is required')
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid UUID format'
  );

// Date validation schema
export const DateSchema = z
  .string()
  .min(1, 'Date is required')
  .transform((str, ctx) => {
    const date = new Date(str);
    if (isNaN(date.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid date format',
      });
      return z.NEVER;
    }
    return date;
  });

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit must be at most 100').default(10),
});

// Tags schema (array of strings)
export const TagsSchema = z
  .string()
  .optional()
  .transform((str) => {
    if (!str) return [];
    try {
      return JSON.parse(str) as string[];
    } catch {
      return str.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
  });

// Metadata schema (JSON object)
export const MetadataSchema = z
  .string()
  .optional()
  .transform((str) => {
    if (!str) return {};
    try {
      return JSON.parse(str) as Record<string, string>;
    } catch {
      return {};
    }
  });

// Export types
export type EmailInput = z.infer<typeof EmailSchema>;
export type PasswordInput = z.infer<typeof PasswordSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type FileTypeInput = z.infer<typeof FileTypeSchema>;
export type JsonInput = z.infer<typeof JsonSchema>;
export type UuidInput = z.infer<typeof UuidSchema>;
export type DateInput = z.infer<typeof DateSchema>;
export type PaginationInput = z.infer<typeof PaginationSchema>;
export type TagsInput = z.infer<typeof TagsSchema>;
export type MetadataInput = z.infer<typeof MetadataSchema>; 