import type { GraphQLSchema } from 'graphql';

// Phase 8: Type-Safe Integration

/**
 * Infer selection types from GraphQL schema
 * Recursively builds a type that represents the selection structure
 */
export type InferSelection<T> = NonNullable<T> extends (infer U)[]
  ? InferSelection<U>
  : NonNullable<T> extends object
  ? { [K in keyof NonNullable<T>]?: NonNullable<T>[K] extends object ? boolean | InferSelection<NonNullable<T>[K]> : boolean }
  : boolean;

/**
 * Infer Prisma select types from Prisma model names
 * This assumes the presence of a Prisma client type
 */
export type PrismaSelect<TModel extends string> =
  Record<string, boolean | Record<string, boolean | Record<string, any>>>;

/**
 * Combine GraphQL and Prisma types for safe selections
 * Ensures that the selection structure matches both GraphQL schema and Prisma types
 */
export type SafeSelect<TGraphQL, TPrisma extends string> =
  InferSelection<TGraphQL> & PrismaSelect<TPrisma>;

/**
 * Type-safe options for TypedGQLPrismaSelect
 */
export interface TypedOptions<TGraphQL, TPrisma extends string> {
  excludeFields?: string[];
  get?: string | string[];
  transforms?: import('./GQLPrismaSelect').TransformOptions;
  fragments?: import('./fragments').FragmentOptions;
  typeValidation?: TypeValidationOptions;
}

/**
 * Runtime type validation options
 */
export interface TypeValidationOptions {
  strict?: boolean;                  // Throw on type mismatches
  warnOnMissing?: boolean;          // Warn on missing fields
  validateEnums?: boolean;          // Validate enum values
  validateRelations?: boolean;      // Validate relation types
  customValidators?: Record<string, (value: any) => boolean | string>; // Custom validation functions
}

/**
 * Type generation options for schema type generation
 */
export interface TypeGenerationOptions {
  output: string;                    // Output directory
  schema: string;                   // GraphQL schema path
  prismaClient: string;             // Prisma client path
  generateQueries: boolean;         // Generate query types
  generateMutations: boolean;       // Generate mutation types
  generateSubscriptions: boolean;   // Generate subscription types
  customScalars?: Record<string, string>; // Custom scalar mappings
  namespace?: string;              // Namespace for generated types
}

/**
 * Validation result from type validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Type validation error
 */
export interface ValidationError {
  field: string;
  expectedType: string;
  actualType: string;
  message: string;
  path: string[];
}

/**
 * Type validation warning
 */
export interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
  path: string[];
}

/**
 * Type-safe query builder options
 */
export interface TypedQueryBuilderOptions<TModel extends string> {
  model: TModel;
  schema?: GraphQLSchema;
  typeValidation?: boolean;
}

/**
 * IntelliSense support types
 */
export interface IntelliSenseSupport {
  /**
   * Type-safe selection getter
   * @template TModel Prisma model name
   */
  getTypedSelect<TModel extends string>(): PrismaSelect<TModel>;

  /**
   * Type-safe include getter
   * @template TModel Prisma model name
   */
  getTypedInclude<TModel extends string>(): Record<string, any>;
}

/**
 * Integration helpers for popular GraphQL libraries
 */
export interface LibraryIntegration {
  /**
   * Nexus integration helper
   */
  nexus?: any;
}

/**
 * Nexus query field configuration
 */
export interface NexusQueryFieldConfig<TModel extends string> {
  type: string;
  args?: Record<string, any>;
  resolve: (
    root: any,
    args: any,
    ctx: { prisma: any },
    info: import('types').GraphQLResolveInfo
  ) => Promise<any>;
  model: TModel;
}

/**
 * Type generation result
 */
export interface TypeGenerationResult {
  types: string;                    // Generated TypeScript types
  schema: string;                   // Generated GraphQL schema
  metadata: TypeGenerationMetadata;
}

/**
 * Type generation metadata
 */
export interface TypeGenerationMetadata {
  generatedAt: Date;
  schemaVersion: string;
  prismaVersion: string;
  modelsCount: number;
  typesCount: number;
  warnings: string[];
}

/**
 * Runtime type checking context
 */
export interface TypeCheckContext {
  schema: GraphQLSchema;
  prismaClient: any;
  strict: boolean;
  path: string[];
}
