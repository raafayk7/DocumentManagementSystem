#Carbonteq Hexapp

Repository: https://github.com/carbonteq/hexapp


# README
---
# Hexagonal Architecture boilerplate

## Installation

```sh
pnpm i @carbonteq/hexapp
```

```sh
npm i @carbonteq/hexapp
```

```sh
yarn add @carbonteq/hexapp
```

## Usage

### Entity Declaration

```typescript
import { BaseEntity } from "@carbonteq/hexapp/domain/base.entity.js";

class User extends BaseEntity {
  constructor(readonly name: string) {
    super();
  }

  serialize() {
    return {
      ...super._serialize(),
      name: this.name,
    };
  }
}
```
---

# Configuration Files

```
// hexapp/package.json
{
  "name": "@carbonteq/hexapp",
  "version": "0.20.1",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "license": "MIT",
  "type": "module",
  "exports": {
    "node": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.cjs",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "/dist"
  ],
  "scope": "@carbonteq",
  "repository": {
    "type": "git",
    "url": "https://github.com/carbonteq/hexapp"
  },
  "bugs": {
    "url": "https://github.com/carbonteq/hexapp/issues"
  },
  "homepage": "https://github.com/carbonteq/hexapp#readme",
  "sideEffects": false,
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "scripts": {
    "lint": "biome check src tests",
    "lint:fix": "biome check src tests --write --unsafe",
    "fmt:dry": "biome format src tests",
    "fmt": "biome format src tests --write",
    "tc": "tsc --pretty --noEmit  --project tsconfig.build.json",
    "build": "tsdown",
    "dev": "tsdown --watch",
    "test": "tsx --test tests/**/*.spec.ts",
    "test:debug": "tsx --test --inspect-brk tests/**/*.spec.ts",
    "release": "changeset publish",
    "tag": "changeset tag"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.8.3",
    "@changesets/cli": "^2.29.4",
    "@microsoft/api-extractor": "^7.52.8",
    "@swc/core": "^1.11.24",
    "@tsconfig/node22": "^22.0.1",
    "@types/node": "22.15.17",
    "changesets": "^1.0.2",
    "jsr": "^0.13.4",
    "tsdown": "^0.11.7",
    "tsx": "^4.19.4",
    "typescript": "5.8.3"
  },
  "dependencies": {
    "@carbonteq/fp": "^0.7.0",
    "zod": "^3.24.4",
    "zod-validation-error": "^3.4.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0",
    "yarn": ">=1.22.0"
  },
  "packageManager": "pnpm@10.10.0+sha512.d615db246fe70f25dcfea6d8d73dee782ce23e2245e3c4f6f888249fb568149318637dca73c2c5c8ef2a4ca0d5657fb9567188bfab47f566d1ee6ce987815c39"
}
```


```
// hexapp/tsconfig.json
{
  "extends": "@tsconfig/node22/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "moduleResolution": "nodenext",
    "module": "NodeNext",
    "composite": false,
    "declarationMap": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSources": false,
    "isolatedModules": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "preserveWatchOutput": true,
    "allowJs": false,
    "strict": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "declaration": true,
    "resolveJsonModule": true,
    "exactOptionalPropertyTypes": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@": ["./src"],
      "@/*": ["./src/*"],
      "@carbonteq/hexapp": ["./src"],
      "@carbonteq/hexapp/*": ["./src/*"]
    }
  },
  "exclude": [
    "node_modules",
    "jest.config.js",
    "lib",
    "tsup.config.ts",
    "rollup.config.ts"
  ]
}
```

# Application

```
// hexapp/src/app/index.ts
export { AppError, AppErrStatus, AppResult } from "./result/index.js";
export type { EmptyResult } from "./result/index.ts";
export { BaseDto, DtoValidationError } from "./dto/index.js";
export type { DtoValidationResult } from "./dto/index.ts";
```

## DTO

```
// hexapp/src/app/dto/dto.base.ts
import type { Result } from "@carbonteq/fp";
import type { z } from "zod";
import { safeParseResult } from "../../shared/zod.utils.js";
import { DtoValidationError } from "./dto.error.js";

export type DtoValidationResult<T> = Result<T, DtoValidationError>;

export abstract class BaseDto {
  protected constructor() {}

  protected static validate<T = unknown, U extends z.ZodType<T> = z.ZodType<T>>(
    schema: U,
    data: unknown,
  ): DtoValidationResult<z.infer<U>> {
    return safeParseResult(schema, data, DtoValidationError.fromZodError);
  }
}
```

```
// hexapp/src/app/dto/dto.error.ts
import type { ZodError } from "zod";
import { fromZodError as zodErrTransform } from "zod-validation-error";
import { ValidationError } from "../../domain/base.errors.js";

export class DtoValidationError extends ValidationError {
  constructor(msg: string, err?: Error) {
    super(msg);

    this.name = "DTOValidationError";
    this.message = msg;
    if (err) {
      this.stack = err.stack as string;
    }
  }

  static fromZodError(err: ZodError): DtoValidationError {
    const prettyErrMsg = zodErrTransform(err).message;

    return new DtoValidationError(prettyErrMsg, err);
  }
}
```

```
// hexapp/src/app/dto/index.ts
export { BaseDto, type DtoValidationResult } from "./dto.base.js";
export { DtoValidationError } from "./dto.error.js";
```

## AppResult

```
// hexapp/src/app/result/result.ts
import { Result, type UNIT } from "@carbonteq/fp";
import { AppError } from "./error.js";

type InnerResult<T> = Result<T, AppError>;

export type EmptyResult = typeof AppResult.EMPTY;

export class AppResult<T> {
  readonly _isOk: boolean;

  static readonly EMPTY: AppResult<UNIT> = new AppResult(Result.UNIT_RESULT);

  private constructor(private readonly inner_result: InnerResult<T>) {
    this._isOk = inner_result.isOk();
  }

  isOk(): this is AppResult<T> {
    return this.inner_result.isOk();
  }

  isErr(): this is AppResult<never> {
    return this.inner_result.isErr();
  }

  static Ok<T>(val: T): AppResult<T> {
    return new AppResult(Result.Ok(val));
  }

  static Err(err: Error): AppResult<never> {
    const e = AppError.fromErr(err);

    return new AppResult<never>(Result.Err(e));
  }

  static fromResult<T, E extends Error>(result: Result<T, E>): AppResult<T> {
    const r = result.mapErr((e) => AppError.fromErr(e));

    return new AppResult(r);
  }

  toResult(): Result<T, AppError> {
    return this.inner_result;
  }

  and<U>(other: AppResult<U>): AppResult<readonly [T, U]> {
    return new AppResult(this.inner_result.and(other.inner_result));
  }

  tap(f: (val: T) => void): AppResult<T> {
    this.inner_result.tap(f);

    return this;
  }

  async tapAsync(f: (val: T) => Promise<void>): Promise<AppResult<T>> {
    await this.inner_result.tapAsync(f);

    return this;
  }

  static fromOther<T>(result: AppResult<T>): AppResult<T> {
    return new AppResult(result.inner_result);
  }

  zip<U>(fn: (r: T) => U): AppResult<[T, U]> {
    return new AppResult(this.inner_result.zip(fn));
  }

  flatZip<U>(f: (r: T) => Result<U, AppError>): AppResult<[T, U]> {
    return new AppResult(this.inner_result.flatZip(f));
  }

  flatMap<U>(f: (r: T) => Result<U, AppError>): AppResult<U> {
    return new AppResult(this.inner_result.flatMap(f));
  }

  unwrap(): T {
    return this.inner_result.unwrap();
  }

  unwrapErr(): AppError {
    return this.inner_result.unwrapErr();
  }

  unwrapOr(def: T): T {
    return this.inner_result.unwrapOr(def);
  }

  unwrapOrElse(fn: () => T): T;
  unwrapOrElse(fn: () => Promise<T>): Promise<T>;
  unwrapOrElse(fn: () => T | Promise<T>): T | Promise<T> {
    return this.inner_result.unwrapOrElse(fn as () => T); // type patch
  }

  map<U>(fn: (val: T) => U): AppResult<U> {
    const newResult = this.inner_result.map(fn);

    return new AppResult(newResult);
  }

  mapErr(fn: (err: AppError) => AppError): AppResult<T> {
    return new AppResult(this.inner_result.mapErr(fn));
  }

  safeUnwrap(): T | null {
    return this.inner_result.safeUnwrap();
  }
}
```

```
// hexapp/src/app/result/error.ts
import {
  AlreadyExistsError,
  InvalidOperation,
  NotFoundError,
  UnauthorizedOperation,
  ValidationError,
} from "@/domain/base.errors.js";
import { AppErrStatus } from "./status.js";

export class AppError extends Error {
  private constructor(
    readonly status: AppErrStatus,
    message?: string,
  ) {
    let msg: string;
    if (message) {
      msg = message;
    } else {
      msg = `AppError<${status}>`;
    }

    super(msg);
  }

  static NotFound = (msg?: string): AppError =>
    new AppError(AppErrStatus.NotFound, msg);

  static Unauthorized = (msg?: string): AppError =>
    new AppError(AppErrStatus.Unauthorized, msg);

  static InvalidData = (msg?: string): AppError =>
    new AppError(AppErrStatus.InvalidData, msg);

  static InvalidOperation = (msg?: string): AppError =>
    new AppError(AppErrStatus.InvalidOperation, msg);

  static AlreadyExists = (msg?: string): AppError =>
    new AppError(AppErrStatus.AlreadyExists, msg);

  static GuardViolation = (msg?: string): AppError =>
    new AppError(AppErrStatus.GuardViolation, msg);

  static Generic = (msg: string): AppError =>
    new AppError(AppErrStatus.Generic, msg);

  static fromErr = (e: Error): AppError => {
    if (e instanceof AppError) {
      return new AppError(e.status, e.message);
    }

    if (e instanceof NotFoundError) {
      return AppError.NotFound(e.message);
    }

    if (e instanceof AlreadyExistsError) {
      return AppError.AlreadyExists(e.message);
    }

    if (e instanceof InvalidOperation) {
      return AppError.InvalidOperation(e.message);
    }

    if (e instanceof UnauthorizedOperation) {
      return AppError.Unauthorized(e.message);
    }

    if (e instanceof ValidationError) {
      return AppError.InvalidData(e.message);
    }

    return AppError.Generic(e.message);
  };
}
```

```
// hexapp/src/app/result/status.ts
export enum AppErrStatus {
  NotFound = "NotFound",
  Unauthorized = "Unauthorized",
  InvalidData = "InvalidData",
  InvalidOperation = "InvalidOperation",
  AlreadyExists = "AlreadyExists",
  GuardViolation = "GuardViolation",
  Generic = "Generic",
}
```

```
// hexapp/src/app/result/index.ts
export { AppResult } from "./result.js";
export type { EmptyResult } from "./result.ts";
export { AppErrStatus } from "./status.js";
export { AppError } from "./error.js";
```

# Domain

```
//hexapp/src/domain/base.entity.ts
import { DateTime, UUID } from "./refined.types.js";

export interface IEntity {
  readonly id: UUID;
  readonly createdAt: DateTime;
  readonly updatedAt: DateTime;
}

export interface SerializedEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type IEntityForUpdate = Pick<IEntity, "updatedAt">;

export abstract class BaseEntity implements IEntity {
  #id: UUID;
  #createdAt: DateTime;
  #updatedAt: DateTime;

  protected constructor() {
    this.#id = UUID.init();
    this.#createdAt = DateTime.now();
    this.#updatedAt = this.#createdAt;
  }

  get id(): UUID {
    return this.#id;
  }

  get createdAt(): DateTime {
    return this.#createdAt;
  }

  get updatedAt(): DateTime {
    return this.#updatedAt;
  }

  protected markUpdated(): void {
    this.#updatedAt = DateTime.now();
  }

  protected forUpdate(): IEntityForUpdate {
    return { updatedAt: this.#updatedAt };
  }

  // for construction within safe boundaries of the domain
  protected _copyBaseProps(other: IEntity): void {
    this.#id = other.id;
    this.#createdAt = DateTime.from(other.createdAt);
    this.#updatedAt = DateTime.from(other.updatedAt);
  }

  protected _fromSerialized(other: Readonly<SerializedEntity>): this {
    this.#id = UUID.fromTrusted(other.id); // only to simplify fromSerialized implementation on developer side
    this.#createdAt = DateTime.from(other.createdAt);
    this.#updatedAt = DateTime.from(other.updatedAt);

    return this;
  }

  protected _serialize(): SerializedEntity {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  //@ts-ignore
  abstract serialize();
}

export type SimpleSerialized<
  EntityInterface extends IEntity,
  T extends keyof EntityInterface = keyof IEntity,
> = SerializedEntity & Omit<EntityInterface, T | keyof IEntity>;
```

```
//hexapp/src/domain/base.vo.ts
import { Result } from "@carbonteq/fp";
import { type ZodObject, z } from "zod";
import { ValidationError } from "./base.errors.js";
import { DateTime } from "./refined.types.js";

export abstract class BaseValueObject<T> {
  abstract serialize(): T;

  /** Util method to use associated parser in boundary validators */
  //@ts-ignore
  getParser?();
}

export interface IDateRange {
  startDate: DateTime;
  endDate: DateTime;
}

type TDateTime = typeof DateTime;
type DateRangeParser = ZodObject<{ startDate: TDateTime; endDate: TDateTime }>;
const dateRangeParser: DateRangeParser = z.object({
  startDate: DateTime,
  endDate: DateTime,
});

// Can be Domain Error
export class InvalidDateRange extends ValidationError {}

export class DateRange extends BaseValueObject<IDateRange> {
  private constructor(
    readonly start: DateTime,
    readonly end: DateTime,
  ) {
    super();
  }

  private ensureValidRange(): Result<DateRange, InvalidDateRange> {
    if (this.intervalMs() < 0)
      return Result.Err(
        new InvalidDateRange(
          `Start Date <${this.start}> must be <= End Date <${this.end}>`,
        ),
      );

    return Result.Ok(this);
  }

  static create(data: unknown): Result<DateRange, InvalidDateRange> {
    const parseRes = dateRangeParser.safeParse(data);

    if (!parseRes.success)
      return Result.Err(new InvalidDateRange(`Invalid Date Range: <${data}>`));

    const range = new DateRange(parseRes.data.startDate, parseRes.data.endDate);

    return range.ensureValidRange();
  }

  static from(other: IDateRange): DateRange {
    return new DateRange(other.startDate, other.endDate);
  }

  intervalMs(): number {
    return this.end.getTime() - this.start.getTime();
  }

  serialize(): IDateRange {
    return { startDate: this.start, endDate: this.end };
  }

  getParser(): DateRangeParser {
    return dateRangeParser;
  }
}
```

```
//hexapp/src/domain/aggregate-root.entity.ts
import { BaseEntity } from "./base.entity.js";

export abstract class AggregateRoot extends BaseEntity {}
```

```
//hexapp/src/domain/base.errors.ts
export class DomainError extends Error {
  protected constructor(msg: string) {
    super();

    this.name = this.constructor.name;
    this.message = msg;
  }
}

export class GenericDomainError extends DomainError {}

export class NotFoundError extends DomainError {}

export class AlreadyExistsError extends DomainError {}

export class UnauthorizedOperation extends DomainError {}
export class InvalidOperation extends DomainError {}

export class ValidationError extends DomainError {
  // biome-ignore lint/complexity/noUselessConstructor: Need to make the constructor public
  public constructor(message: string) {
    super(message);
  }
}

export class GuardViolationError extends DomainError {}

export type DomainErr =
  | AlreadyExistsError
  | GenericDomainError
  | InvalidOperation
  | NotFoundError
  | UnauthorizedOperation
  | ValidationError
  | GuardViolationError;
```

```
//hexapp/src/domain/base.repository.ts
import type { Result } from "@carbonteq/fp";
import type { BaseEntity } from "../domain/base.entity.ts";
import type {
  AlreadyExistsError,
  InvalidOperation,
  NotFoundError,
} from "../domain/base.errors.ts";
import type { Paginated, PaginationOptions } from "../domain/pagination.ts";

export type RepositoryError =
  | NotFoundError
  | AlreadyExistsError
  | InvalidOperation;

type CommonRepoErrors = InvalidOperation;

export type RepositoryResult<T, E = CommonRepoErrors> = Result<
  T,
  E | CommonRepoErrors
>;

export abstract class BaseRepository<T extends BaseEntity> {
  abstract insert(entity: T): Promise<RepositoryResult<T, AlreadyExistsError>>;
  abstract update(entity: T): Promise<RepositoryResult<T, NotFoundError>>;

  fetchAll?(): Promise<RepositoryResult<T[]>>;
  fetchPaginated?(
    options: PaginationOptions,
  ): Promise<RepositoryResult<Paginated<T>>>;
  fetchById?(id: BaseEntity["id"]): Promise<RepositoryResult<T, NotFoundError>>;
  deleteById?(
    Id: BaseEntity["id"],
  ): Promise<RepositoryResult<T, NotFoundError>>;
  fetchBy?<U extends keyof T>(
    prop: U,
    val: T[U],
  ): Promise<RepositoryResult<T, NotFoundError>>; // val: ValueForProp<T, U>
  existsBy?<U extends keyof T>(
    prop: U,
    val: T[U],
  ): Promise<RepositoryResult<boolean>>;
  deleteBy?<U extends keyof T>(
    prop: U,
    val: T[U],
  ): Promise<RepositoryResult<T, NotFoundError>>;
}
```

```
//hexapp/src/domain/pagination.ts
import { Result } from "@carbonteq/fp";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ValidationError } from "./base.errors.js";

export class PaginationOptionsValidationError extends ValidationError {
  constructor(issues: string) {
    super(`Invalid pagination options: ${issues}`);
  }
}

const DEFAULT_PAGINATION_OPTS = {
  pageNum: 1,
  pageSize: 100,
} as const;

const DISCRIMINANT = Symbol("PaginationOptions");

export class PaginationOptions {
  static readonly DEFAULT_PAGE_NUM = DEFAULT_PAGINATION_OPTS.pageNum;
  static readonly DEFAULT_PAGE_SIZE = DEFAULT_PAGINATION_OPTS.pageSize;

  /** Offset (Assumes page 0 is your first page) */
  readonly offset: number;

  /** Offset (Assumes page 1 is your first page) */
  // readonly offset1: number;

  private static readonly schema = z.object({
    pageNum: z.coerce
      .number()
      .positive()
      .default(DEFAULT_PAGINATION_OPTS.pageNum),
    pageSize: z.coerce
      .number()
      .positive()
      .default(DEFAULT_PAGINATION_OPTS.pageSize),
  });
  private readonly _DISCRIMINATOR = DISCRIMINANT;

  private constructor(
    readonly pageNum: number,
    readonly pageSize: number,
  ) {
    this.offset = pageSize * pageNum;
    // this.offset1 = pageSize * (pageNum - 1);
  }

  /**
   * Validate the passed options to create `PaginationOptions` instance
   * @param options - Pagination Options
   * @param {number} options.pageNum - Page Number (default = 1)
   * @param {number} options.pageSize - Page Size (default = 100)
   * @returns {PaginationOptions} PaginationOptions instance
   */
  static create(
    options: unknown,
  ): Result<PaginationOptions, PaginationOptionsValidationError> {
    const r = PaginationOptions.schema.safeParse(options);

    if (r.success) {
      return Result.Ok(new PaginationOptions(r.data.pageNum, r.data.pageSize));
    }

    const err = fromZodError(r.error);
    return Result.Err(new PaginationOptionsValidationError(err.message));
  }
}

export interface Paginated<T> {
  data: T[];
  readonly pageNum: number;
  readonly pageSize: number;
  readonly totalPages: number;
}

export const Paginator: {
  paginate: <T>(coll: T[], opts: PaginationOptions) => Paginated<T>;
  // paginate1: <T>(coll: T[], opts: PaginationOptions) => Paginated<T>;
} = {
  paginate<T>(
    coll: T[],
    { pageNum, pageSize, offset: offset0 }: PaginationOptions,
  ): Paginated<T> {
    const totalPages = Math.ceil(coll.length / pageSize) || 1;
    const collSlice = coll.slice(offset0, offset0 + pageSize);

    return { data: collSlice, pageNum, pageSize, totalPages };
  },
  // paginate1<T>(
  // 	coll: T[],
  // 	{ pageNum, pageSize, offset1 }: PaginationOptions,
  // ): Paginated<T> {
  // 	const totalPages = Math.ceil(coll.length / pageSize) || 1;
  // 	const collSlice = coll.slice(offset1, offset1 + pageSize);
  //
  // 	return { data: collSlice, pageNum, pageSize, totalPages };
  // },
} as const;
```

```
//hexapp/src/domain/refined.types.ts
import { randomUUID } from "node:crypto";
import { Result } from "@carbonteq/fp";
import z, { type ZodEnum, type ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { extend } from "../shared/misc.utils.js";
import { unsafeCast } from "../shared/type.utils.js";
import { type DomainError, ValidationError } from "./base.errors.js";

// type OverwriteValueOf<T, Schema extends z.ZodTypeAny> = Omit<T, "valueOf"> & {
// 	valueOf(): Schema["_output"];
// };
type Extensions<
  Schema extends z.ZodTypeAny,
  Tag extends string | symbol,
  Err extends DomainError,
> = {
  create: (data: unknown) => Result<Schema["_output"] & z.BRAND<Tag>, Err>;
  $infer: Schema["_output"] & z.BRAND<Tag>;
  $inferPrimitive: Schema["_output"];
  primitive(branded: Schema["_output"] & z.BRAND<Tag>): Schema["_output"];
};

type ZodBrandedWithFactory<
  Schema extends z.ZodTypeAny,
  Tag extends string | symbol,
  Err extends DomainError,
> = z.ZodBranded<Schema, Tag> & Extensions<Schema, Tag, Err>;

const defaultFromZodErr = (_data: unknown, err: z.ZodError) =>
  new ValidationError(fromZodError(err).message);

export function createRefinedType<
  Tag extends string | symbol,
  Schema extends z.ZodTypeAny,
>(
  _tag: Tag,
  schema: Schema,
): ZodBrandedWithFactory<Schema, Tag, ValidationError>;
export function createRefinedType<
  Tag extends string | symbol,
  Schema extends z.ZodTypeAny,
  Err extends DomainError,
>(
  _tag: Tag,
  schema: Schema,
  errTransformer: (data: Schema["_input"], err: z.ZodError) => Err,
): ZodBrandedWithFactory<Schema, Tag, Err>;
export function createRefinedType<
  sym extends string | symbol,
  U extends z.ZodTypeAny,
  E extends DomainError,
>(
  tag: sym,
  schema: U,
  errConst?: (data: U["_input"], err: z.ZodError) => E,
): ZodBrandedWithFactory<U, sym, E> {
  const errTransformer = errConst ?? defaultFromZodErr;
  const branded = schema.brand<sym>();

  const factory = (data: unknown): Result<U["_output"], E> => {
    const res = branded.safeParse(data);

    if (res.success) return Result.Ok(res.data);
    const err = errTransformer(data, res.error) as E;
    return Result.Err(err);
  };

  const extensions: Extensions<U, sym, E> = {
    create: factory,
    //@ts-expect-error
    $infer: tag,
    $inferPrimitive: tag,
    // get $infer(): U["_output"] & z.BRAND<sym> {
    // 	throw new Error("$infer not meant to be called at runtime");
    // },
    // get $inferInner(): U["_output"] {
    // 	throw new Error("$inferInner not meant to be called at runtime");
    // },
    primitive(branded) {
      return branded;
    },
  };
  const finalBranded = extend(branded, extensions);

  return finalBranded;
}

export type Unbrand<T> = T extends z.ZodType<unknown, z.ZodTypeDef, infer U>
  ? U
  : T;

export class InvalidUUID extends ValidationError {
  constructor(data: unknown) {
    super(`Invalid UUID: ${data}`);
  }
}

// Example of how to use refined branded types with Zod
// Custom error type not mandatory
export class InvalidEmail extends ValidationError {
  constructor(data: unknown) {
    super(`Invalid Email: ${data}`);
  }
}

type TEmail = ZodBrandedWithFactory<z.ZodString, "Email", InvalidEmail>;
export const Email: TEmail = createRefinedType(
  "Email",
  z.string().email(),

  (data, _err) => new InvalidEmail(data),
);
export type Email = typeof Email.$infer;

// Not a good example as I wanted to add some custom stuff
type TUUIDSchema = z.ZodString;
type TUUIDInner = ZodBrandedWithFactory<TUUIDSchema, "UUID", InvalidUUID>;
const UUIDInner: TUUIDInner = createRefinedType(
  "UUID",
  z.string().uuid(),
  (data, _err) => new InvalidUUID(data),
);
export type UUID = typeof UUIDInner.$infer;
type TUUID = TUUIDInner & {
  init: () => UUID;
  fromTrusted: (s: string) => UUID;
};
export const UUID: TUUID = extend(UUIDInner, {
  init: () => randomUUID() as UUID,
  fromTrusted: unsafeCast<UUID, string>,
});

export class InvalidDateTime extends ValidationError {
  constructor(data: unknown) {
    super(`Invalid DateTime: ${data}`);
  }
}

type TDTInnerSchema = z.ZodPipeline<
  z.ZodUnion<[z.ZodNumber, z.ZodString, z.ZodDate]>,
  z.ZodDate
>;
type TDTInner = ZodBrandedWithFactory<
  TDTInnerSchema,
  "DateTime",
  InvalidDateTime
>;
const DTInner: TDTInner = createRefinedType(
  "DateTime",
  z.union([z.number(), z.string(), z.date()]).pipe(z.coerce.date()),
  (data, _err) => new InvalidDateTime(data),
);
export type DateTime = typeof DTInner.$infer;
type TDateTime = TDTInner & {
  now: () => DateTime;
  from: (d: Date | DateTime) => DateTime;
};
export const DateTime: TDateTime = extend(DTInner, {
  now: () => new Date() as DateTime,
  from: unsafeCast<DateTime, Date | DateTime>,
});

// Enum types
export class EnumValidationError extends ValidationError {
  constructor(
    readonly tag: string | symbol,
    msg: string,
    readonly data: unknown,
    readonly err: ZodError,
  ) {
    super(msg);
  }
}

type EnumTypeUtil<
  Tag extends string | symbol,
  U extends string,
  T extends [U, ...U[]],
> = ZodBrandedWithFactory<
  z.ZodEnum<z.Writeable<T>>,
  Tag,
  EnumValidationError
> & {
  from: (v: T[number]) => z.Writeable<T>[number] & z.BRAND<Tag>;
  values: Readonly<T>;
  eq: (
    a: T[number] | (T[number] & z.BRAND<Tag>),
    b: T[number] | (T[number] & z.BRAND<Tag>),
  ) => boolean;
};

export const createEnumType = <
  Tag extends string | symbol,
  U extends string,
  T extends [U, ...U[]],
>(
  tag: Tag,
  enumValues: T,
): EnumTypeUtil<Tag, U, T> => {
  type InnerType = ZodBrandedWithFactory<
    z.ZodEnum<z.Writeable<T>>,
    Tag,
    EnumValidationError
  >;
  const innerType: InnerType = createRefinedType(
    tag,
    z.enum(enumValues),
    (data, err) =>
      new EnumValidationError(
        tag,
        `<${data.valueOf()}> must be one of ${enumValues.valueOf()}`,
        data,
        err,
      ),
  );

  type ExtendedType = InnerType & {
    from: (v: T[number]) => z.Writeable<T>[number] & z.BRAND<Tag>;
    values: Readonly<T>;
    eq: (
      a: T[number] | (T[number] & z.BRAND<Tag>),
      b: T[number] | (T[number] & z.BRAND<Tag>),
    ) => boolean;
  };

  const extended: ExtendedType = extend(innerType, {
    from: unsafeCast<typeof innerType.$infer, T[number]>,
    get values(): Readonly<T> {
      return enumValues;
    },
    eq(
      a: T[number] | (T[number] & z.BRAND<Tag>),
      b: T[number] | (T[number] & z.BRAND<Tag>),
    ): boolean {
      return a === b;
    },
  });

  return extended;
};

type MatchActions<T extends string | symbol | number, R> = {
  [K in T]: () => R;
};

export function matchEnum<
  Tag extends string | symbol,
  U extends string,
  T extends [U, ...U[]],
  EnumType extends ZodBrandedWithFactory<ZodEnum<T>, Tag, EnumValidationError>,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  Actions extends MatchActions<EnumType["$inferPrimitive"], any>,
>(
  value: EnumType["$infer"],
  _enumType: EnumType,
  actions: Actions,
): ReturnType<Actions[EnumType["$inferPrimitive"]]> {
  const key = value as unknown as keyof typeof actions;
  if (key in actions) {
    return actions[key]();
  }
  throw new Error(`Unhandled enum value: ${value.valueOf()}`);
}
```

```
//hexapp/src/domain/index.ts
export { BaseEntity } from "./base.entity.js";
export type {
  IEntity,
  IEntityForUpdate,
  SerializedEntity,
  SimpleSerialized,
} from "./base.entity.ts";
export {
  InvalidEmail,
  UUID,
  InvalidDateTime,
  Email,
  DateTime,
  createRefinedType,
  createEnumType,
  matchEnum,
  EnumValidationError,
  InvalidUUID,
  type Unbrand,
} from "./refined.types.js";
export { AggregateRoot } from "./aggregate-root.entity.js";
export {
  BaseValueObject,
  DateRange,
  InvalidDateRange,
} from "./base.vo.js";
export type { IDateRange } from "./base.vo.ts";
export {
  AlreadyExistsError,
  DomainError,
  GenericDomainError,
  GuardViolationError,
  InvalidOperation,
  NotFoundError,
  UnauthorizedOperation,
  ValidationError,
} from "./base.errors.js";
export type { DomainErr } from "./base.errors.ts";
export { BaseRepository } from "./base.repository.js";
export type {
  RepositoryError,
  RepositoryResult,
} from "./base.repository.ts";
export {
  PaginationOptions,
  Paginator,
  PaginationOptionsValidationError,
} from "./pagination.js";
export type { Paginated } from "./pagination.ts";
```

# Infrastructure

## Database
// hexapp/src/infra/db/mock.repository.ts
```
import type { BaseEntity } from "@/domain/base.entity.js";
import { AlreadyExistsError, NotFoundError } from "@/domain/base.errors.js";
import {
  BaseRepository,
  type RepositoryResult,
} from "@/domain/base.repository.js";
import {
  type Paginated,
  type PaginationOptions,
  Paginator,
} from "@/domain/pagination.js";
import { Result } from "@carbonteq/fp";

export class MockNotFoundError extends NotFoundError {
  constructor(entityId: BaseEntity["id"]) {
    super(`entity with ID<${entityId}> not found by mock repository`);
  }
}

export class MockAlreadyExistsError extends AlreadyExistsError {
  constructor(entityId: BaseEntity["id"]) {
    super(`entity with ID<${entityId}> already exists in mock repository`);
  }
}

type GetSerialized<Ent extends BaseEntity> = ReturnType<Ent["serialize"]>;

export abstract class MockRepository<
  T extends BaseEntity,
> extends BaseRepository<T> {
  db: Map<T["id"], GetSerialized<T>>;

  protected constructor() {
    super();
    this.db = new Map();
  }

  fetchById(Id: T["id"]): Promise<RepositoryResult<T, MockNotFoundError>> {
    const optEnt = this.db.get(Id);
    let res: Result<GetSerialized<T>, MockNotFoundError>;

    if (optEnt) {
      res = Result.Ok(optEnt);
    } else {
      res = Result.Err(new MockNotFoundError(Id));
    }

    return Promise.resolve(res);
  }

  fetchAll(): Promise<RepositoryResult<T[]>> {
    return Promise.resolve(Result.Ok(Array.from(this.db.values())));
  }

  insert(entity: T): Promise<RepositoryResult<T, MockAlreadyExistsError>> {
    let res: Result<T, AlreadyExistsError>;

    if (this.db.has(entity.id)) {
      res = Result.Err(new MockAlreadyExistsError(entity.id));
    } else {
      this.db.set(entity.id, entity.serialize());
      res = Result.Ok(entity);
    }

    return Promise.resolve(res);
  }

  fetchPaginated(
    options: PaginationOptions,
  ): Promise<RepositoryResult<Paginated<T>>> {
    const all = Array.from(this.db.values());

    return Promise.resolve(Result.Ok(Paginator.paginate(all, options)));
  }

  update(entity: T): Promise<RepositoryResult<T, MockNotFoundError>> {
    let res: Result<T, MockNotFoundError>;

    if (this.db.has(entity.id)) {
      this.db.set(entity.id, entity.serialize());
      res = Result.Ok(entity);
    } else {
      res = Result.Err(new MockNotFoundError(entity.id));
    }

    return Promise.resolve(res);
  }

  async deleteById(
    Id: T["id"],
  ): Promise<RepositoryResult<T, MockNotFoundError>> {
    const res = await this.fetchById(Id);

    if (res.isOk()) {
      this.db.delete(Id);
    }

    return res;
  }

  existsById(Id: T["id"]): Promise<RepositoryResult<boolean>> {
    return Promise.resolve(Result.Ok(this.db.has(Id)));
  }
}
```

# Shared

```
// hexapp/src/shared/base.logger.ts
export const LOG_LEVEL = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

type TLogLevel = typeof LOG_LEVEL;
export type LogLevel = TLogLevel[keyof TLogLevel];

export abstract class Logger {
  static readonly DEFAULT_LEVEL: LogLevel = LOG_LEVEL.INFO;

  abstract error(...args: unknown[]): void;
  abstract warn(...args: unknown[]): void;
  abstract debug(...args: unknown[]): void;
  abstract info(...args: unknown[]): void;
  abstract log(level: LogLevel, ...args: unknown[]): void;

  abstract setContext(ctx: string): void;
  abstract setLevel(lvl: LogLevel): void;
}
```

```
// hexapp/src/shared/composition.utils.ts
import type { EnsureNotUnion, IsUnion } from "./type.utils.ts";

export const extractProp =
  <T, K extends keyof T = keyof T>(k: K) =>
  (actual: T): T[K] =>
    actual[k];

/* Create extractor for picking a subset of an object of type T. Not mean to be used as standalone */
export const extractProps =
  <T, K extends (keyof T)[]>(...keys: K) =>
  (obj: T): { [key in K[number]]: T[key] } => {
    const result = {} as { [key in K[number]]: T[key] };

    for (const key of keys) {
      result[key] = obj[key];
    }
    return result;
  };

export const extractId = <Id, T extends { id: Id }>(withId: T): T["id"] =>
  withId.id;

interface Serializable<R> {
  serialize(): R;
}

export const toSerialized = <Serialized>(
  serializable: Serializable<Serialized>,
): Serialized => serializable.serialize();

type WithKey<K extends string, T> = IsUnion<K> extends true
  ? never
  : { [P in K]: T };

export const nestWithKey =
  <K extends string, T>(key: EnsureNotUnion<K>) =>
  (obj: T): WithKey<K, T> => {
    type WK = WithKey<K, T>;
    return { [key]: obj } as WK;
  };
```

```
// hexapp/src/shared/misc.utils.ts
// Faster than .filter(...).map(...) # https://stackoverflow.com/a/47877054/2379922
export const filterMap = <T, U>(
  coll: T[],
  filter: (val: T) => boolean,
  map: (val: T) => U,
): Array<U> => {
  return coll.reduce(
    (acc, curr) => {
      if (filter(curr)) {
        acc.push(map(curr));
      }

      return acc;
    },
    [] as Array<U>,
  );
};

export const mapFilter = <T, U>(
  coll: T[],
  map: (val: T) => U,
  filter: (val: U) => boolean,
): Array<U> => {
  return coll.reduce(
    (acc, curr) => {
      const mapped = map(curr);
      if (filter(mapped)) {
        acc.push(mapped);
      }
      return acc;
    },
    [] as Array<U>,
  );
};

export const randomChoice = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

export const shuffleInplace = <T>(arr: T[]): T[] => {
  let currIdx = arr.length;
  let randomIdx: number;

  while (currIdx !== 0) {
    randomIdx = Math.floor(Math.random() * currIdx);
    currIdx--;

    const tmp = arr[currIdx];
    arr[currIdx] = arr[randomIdx];
    arr[randomIdx] = tmp;
  }

  return arr;
};

export const shuffle = <T>(arr: T[]): T[] => {
  const toShuffle = [...arr];

  return shuffleInplace(toShuffle);
};

export const counter = <T extends string | number | symbol>(
  arr: T[],
): Record<T, number> => {
  return arr.reduce(
    (acc: Record<T, number>, value: T) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<T, number>,
  );
};

export const extend = <T, U extends Record<string, unknown>>(
  original: T,
  extensions: U,
): T & U => {
  //@ts-expect-error
  return Object.assign(original, extensions);

  // const res = original as T & U;
  // //@ts-ignore
  // for (const [k, v] of Object.entries(extensions)) res[k] = v;
  //
  // return res;
};
```

```
// hexapp/src/shared/sort.utils.ts
import type { GetKeysWithSpecificTypeValue } from "./type.utils.ts";

type WithCreatedAt = { createdAt: Date };

export const sortByCreatedAt = (a: WithCreatedAt, b: WithCreatedAt): number =>
  a.createdAt.getTime() - b.createdAt.getTime();
export const sortByCreatedAtDesc = (
  a: WithCreatedAt,
  b: WithCreatedAt,
): number => b.createdAt.getTime() - a.createdAt.getTime();

type WithUpdatedAt = { updatedAt: Date };
export const sortByUpdatedAt = (a: WithUpdatedAt, b: WithUpdatedAt): number =>
  a.updatedAt.getTime() - b.updatedAt.getTime();
export const sortByUpdatedAtDesc = (
  a: WithUpdatedAt,
  b: WithUpdatedAt,
): number => b.updatedAt.getTime() - a.updatedAt.getTime();

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const sortByDatesAsc = <T extends Record<string, any>>(
  arr: T[],
  dateKey: GetKeysWithSpecificTypeValue<T, Date>,
): T[] => arr.sort((a, b) => a[dateKey].getTime() - b[dateKey].getTime());

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const sortByDatesDesc = <T extends Record<string, any>>(
  arr: T[],
  dateKey: GetKeysWithSpecificTypeValue<T, Date>,
): T[] => arr.sort((a, b) => b[dateKey].getTime() - a[dateKey].getTime());

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export const sortByDates = <T extends Record<string, any>>(
  arr: T[],
  dateKey: GetKeysWithSpecificTypeValue<T, Date>,
  order: "ASC" | "DESC",
): T[] =>
  order === "ASC"
    ? sortByDatesAsc(arr, dateKey)
    : sortByDatesDesc(arr, dateKey);
```

```
// hexapp/src/shared/type.utils.ts
import type { AppResult } from "../app/result/index.ts";

export type EmptyObject = Record<string | number | symbol, never>;

export type UnsafeCast<T, U> = T extends U ? T : U;
export const unsafeCast = <U, T = unknown>(val: T): U => val as unknown as U;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | Date
  | JsonValue[]
  | { [k: string]: JsonValue }; // JsonObject

type JsonObject = { [x: string]: JsonValue };
type JsonGuard<T> = T extends JsonValue ? T : never;

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type Omitt<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type Constructable<T> = new (...args: unknown[]) => T;

export type ExtractAppResultType<U> = U extends AppResult<infer X> ? X : never;

export type ArrType<T> = T extends Array<infer R> ? R : never;
export type IterType<T> = T extends { [Symbol.iterator](): infer I }
  ? I
  : never;

export type InferAppResult<
  T extends (...args: unknown[]) => Promise<AppResult<unknown>>,
> = ExtractAppResultType<Awaited<ReturnType<T>>>;

export type GetKeysWithSpecificTypeValue<
  T extends Record<string, unknown>,
  ValType,
> = {
  [K in keyof T]: T[K] extends ValType ? K : never;
}[keyof T];

type FooBar = { a: number; b: number; c: string; d: Date };
type KeyForNumber = GetKeysWithSpecificTypeValue<FooBar, number>; // is 'a' | 'b'

export type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

// BETTER TO COMPOSE THE UTILITIES LISTED ABOVE

// export type ExtractAsyncAppResultVal<
//   T extends (...args: any[]) => Promise<AppResult<any>>,
// > = ExtractAppResultVal<AsyncReturnType<T>>;
//
// export type ExtractAppResultAsyncVal<
//   T extends (...args: any[]) => AppResult<Promise<any>>,
// > = ExtractAppResultVal<ReturnType<T>>;
//
// ------------------------------------------------------------------------

/**
 * Is used to ensure that all cases are handled in a switch statement. Throws error on runtime
 * @internal
 * @see https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
 *
 * @param x {never} - This is a type that should never be used. It is used to ensure that the switch statement is exhaustive.
 */
export const assertUnreachable = (x: never): never => {
  throw new Error(`Unexpected object: ${x}`);
};

/**
 * Is used to ensure that all cases are handled in a switch statement. Passes through the value on runtime
 * @internal
 * @see https://www.typescriptlang.org/docs/handbook/advanced-types.html#exhaustiveness-checking
 *
 * @param x {never} - This is a type that should never be used. It is used to ensure that the switch statement is exhaustive.
 */
export const assertUnreachablePassthrough = (x: never): never => x;

export type AppendToTuple<T, U> = T extends [...infer Rest, infer L]
  ? [...Rest, L, U]
  : [T, U];

export type IsUnion<T, U extends T = T> = ( // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  T extends any
    ? U extends T
      ? false
      : true
    : never
) extends false
  ? false
  : true;
export type EnsureNotUnion<T> = IsUnion<T> extends true ? never : T;
```

```
// hexapp/src/shared/zod.utils.ts
import { Result } from "@carbonteq/fp";
import type { ZodType, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ValidationError } from "../domain/base.errors.js";

export type ParsedSchema<T extends ZodType> = Readonly<z.infer<T>>;

export const handleZodErr = (err: z.ZodError): ValidationError => {
  return new ValidationError(fromZodError(err).message);
};

export const safeParseResult = <
  E,
  T = unknown,
  U extends z.ZodType<T> = z.ZodType<T>,
>(
  schema: U,
  data: unknown,
  errConst: (err: z.ZodError) => E,
): Result<z.infer<U>, E> => {
  const r = schema.safeParse(data);

  if (r.success) {
    return Result.Ok(r.data);
  }
  const err = errConst(r.error);
  return Result.Err(err);
};
```

```
// hexapp/src/shared/index.ts
export {
  unsafeCast,
  assertUnreachable,
  assertUnreachablePassthrough,
} from "./type.utils.js";
export type {
  ArrType,
  Constructable,
  EmptyObject,
  ExtractAppResultType,
  GetKeysWithSpecificTypeValue,
  InferAppResult,
  IterType,
  Omitt,
  PartialBy,
  UnsafeCast,
  AppendToTuple,
  IsUnion,
  EnsureNotUnion,
} from "./type.utils.ts";
export {
  sortByCreatedAt,
  sortByCreatedAtDesc,
  sortByDates,
  sortByDatesAsc,
  sortByDatesDesc,
  sortByUpdatedAt,
  sortByUpdatedAtDesc,
} from "./sort.utils.js";
export {
  counter,
  extend,
  filterMap,
  mapFilter,
  randomChoice,
  shuffle,
  shuffleInplace,
} from "./misc.utils.js";
export {
  extractId,
  extractProp,
  extractProps,
  toSerialized,
  nestWithKey,
} from "./composition.utils.js";
export { safeParseResult, handleZodErr } from "./zod.utils.js";
export { LOG_LEVEL, Logger } from "./base.logger.js";
export type { LogLevel } from "./base.logger.js";
```

# Web

```
// hexapp/src/web/utils.ts
import { Buffer } from "node:buffer";

/* For data URI like `data:image/png;base64,...`
 */
export const dataURIToBuffer = async (uri: string): Promise<Buffer> => {
  const res = await fetch(uri);
  const arr = await res.arrayBuffer();

  return Buffer.from(arr);
};
```

```
// hexapp/src/index.ts
export * from "./app/index.js";
export * from "./shared/index.js";
export * from "./domain/index.js";
export * from "./web/index.js";
export * from "./infra/db/mock.repository.js";
```