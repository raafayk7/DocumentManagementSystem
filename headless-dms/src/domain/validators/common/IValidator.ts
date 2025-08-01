import { Result } from '@carbonteq/fp';

export interface IValidator<T> {
  validate(value: T): Result<T, string>;
  getBusinessRule(): string;
} 