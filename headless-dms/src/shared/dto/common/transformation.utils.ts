import { extractId, toSerialized, nestWithKey } from '@carbonteq/hexapp';
import { UserResponseDto } from '../user/UserResponse.js';
import { DocumentResponseDto } from '../document/DocumentResponse.js';

/**
 * Hexapp DTO Transformation Utilities
 * Provides functional composition patterns for DTO transformations
 */

// Type definitions for transformation patterns
export type EntityTransformer<T, R> = (entity: T) => R;
export type BatchTransformer<T, R> = (entities: T[]) => R[];
export type ResponseWrapper<T> = { data: T };
export type PaginatedWrapper<T> = { data: T[]; pagination: any };

/**
 * Transform single entity to DTO using toSerialized and extractId
 */
export const transformEntityToDto = <T extends { id: unknown }>(
  entity: T,
  dtoFactory: (serialized: any, id: string) => any
) => {
  const serialized = toSerialized(entity as any) as any;
  const id = extractId(entity) as string;
  return dtoFactory(serialized, id);
};

/**
 * Transform array of entities to DTOs using functional mapping
 */
export const transformEntitiesToDtos = <T, R>(
  entities: T[],
  transformer: EntityTransformer<T, R>
): R[] => {
  return entities.map(transformer);
};

/**
 * Create nested response using nestWithKey pattern
 */
export const createNestedResponse = <T>(
  key: string,
  data: T
): Record<string, any> => {
  const nestFn = nestWithKey(key);
  return nestFn(data) as Record<string, any>;
};

/**
 * Create paginated nested response
 */
export const createPaginatedResponse = <T>(
  dataKey: string,
  data: T[],
  pagination: any
): Record<string, any> => {
  const response = { data, pagination };
  const nestFn = nestWithKey(dataKey);
  return nestFn(response);
};

/**
 * User-specific transformation utilities
 */
export const UserTransformations = {
  /**
   * Transform User entity to UserResponseDto using composition
   */
  entityToDto: (user: any): UserResponseDto => {
    return transformEntityToDto(user, (serialized, id) => 
      new UserResponseDto(
        id,
        serialized.email,
        serialized.role,
        serialized.createdAt,
        serialized.updatedAt
      )
    );
  },

  /**
   * Transform array of User entities to DTOs
   */
  entitiesToDtos: (users: any[]): UserResponseDto[] => {
    return transformEntitiesToDtos(users, UserTransformations.entityToDto);
  },

  /**
   * Create nested user response
   */
  toNestedResponse: (user: UserResponseDto) => {
    return createNestedResponse('user', user.toPlain());
  },

  /**
   * Create paginated users response
   */
  toPaginatedResponse: (users: UserResponseDto[], pagination: any) => {
    const plainUsers = users.map(user => user.toPlain());
    return createPaginatedResponse('users', plainUsers, pagination);
  }
};

/**
 * Document-specific transformation utilities
 */
export const DocumentTransformations = {
  /**
   * Transform Document entity to DocumentResponseDto using composition
   */
  entityToDto: (document: any): DocumentResponseDto => {
    return transformEntityToDto(document, (serialized, id) => 
      new DocumentResponseDto(
        id,
        serialized.name,
        serialized.filePath,
        serialized.mimeType,
        serialized.size,
        serialized.createdAt,
        serialized.updatedAt,
        serialized.tags || [],
        serialized.metadata || {}
      )
    );
  },

  /**
   * Transform array of Document entities to DTOs
   */
  entitiesToDtos: (documents: any[]): DocumentResponseDto[] => {
    return transformEntitiesToDtos(documents, DocumentTransformations.entityToDto);
  },

  /**
   * Create nested document response
   */
  toNestedResponse: (document: DocumentResponseDto) => {
    return createNestedResponse('document', document.toPlain());
  },

  /**
   * Create paginated documents response
   */
  toPaginatedResponse: (documents: DocumentResponseDto[], pagination: any) => {
    const plainDocuments = documents.map(doc => doc.toPlain());
    return createPaginatedResponse('documents', plainDocuments, pagination);
  }
};

/**
 * Generic transformation pipeline builder
 */
export class TransformationPipeline<T> {
  constructor(private data: T) {}

  /**
   * Transform data using provided function
   */
  transform<R>(fn: (data: T) => R): TransformationPipeline<R> {
    return new TransformationPipeline(fn(this.data));
  }

  /**
   * Nest data under a key
   */
  nest(key: string): TransformationPipeline<Record<string, T>> {
    return new TransformationPipeline(createNestedResponse(key, this.data));
  }

  /**
   * Get the final result
   */
  result(): T {
    return this.data;
  }

  /**
   * Static factory method to start pipeline
   */
  static from<U>(data: U): TransformationPipeline<U> {
    return new TransformationPipeline(data);
  }
}

/**
 * Functional composition utilities for complex transformations
 */
export const CompositionHelpers = {
  /**
   * Compose multiple transformation functions
   */
  compose: <T>(...fns: Array<(data: any) => any>) => (initial: T) => {
    return fns.reduce((result, fn) => fn(result), initial);
  },

  /**
   * Create transformation pipeline for entities
   */
  pipeline: <T>(data: T) => TransformationPipeline.from(data),

  /**
   * Batch process entities with error handling
   */
  batchTransform: <T, R>(
    entities: T[],
    transformer: EntityTransformer<T, R>,
    onError?: (error: Error, entity: T) => R | null
  ): R[] => {
    return entities.reduce((results: R[], entity) => {
      try {
        const result = transformer(entity);
        results.push(result);
      } catch (error) {
        if (onError) {
          const fallbackResult = onError(error as Error, entity);
          if (fallbackResult !== null) {
            results.push(fallbackResult);
          }
        }
      }
      return results;
    }, []);
  }
};
