/**
 * Common DTO utilities and transformation patterns using Hexapp composition
 */

export {
  transformEntityToDto,
  transformEntitiesToDtos,
  createNestedResponse,
  createPaginatedResponse,
  UserTransformations,
  DocumentTransformations,
  TransformationPipeline,
  CompositionHelpers
} from './transformation.utils.js';

export type {
  EntityTransformer,
  BatchTransformer,
  ResponseWrapper,
  PaginatedWrapper
} from './transformation.utils.js';

/**
 * Example usage patterns for the transformation utilities:
 * 
 * // Transform single entity to DTO
 * const userDto = UserTransformations.entityToDto(userEntity);
 * 
 * // Transform array of entities
 * const userDtos = UserTransformations.entitiesToDtos(userEntities);
 * 
 * // Create nested response
 * const nestedResponse = UserTransformations.toNestedResponse(userDto);
 * 
 * // Create paginated response
 * const paginatedResponse = UserTransformations.toPaginatedResponse(userDtos, paginationData);
 * 
 * // Use transformation pipeline
 * const result = TransformationPipeline
 *   .from(userEntity)
 *   .transform(UserTransformations.entityToDto)
 *   .transform(dto => dto.toPlain())
 *   .nest('user')
 *   .result();
 * 
 * // Compose multiple transformations
 * const complexTransform = CompositionHelpers.compose(
 *   UserTransformations.entityToDto,
 *   dto => dto.toPlain(),
 *   data => createNestedResponse('user', data)
 * );
 */
