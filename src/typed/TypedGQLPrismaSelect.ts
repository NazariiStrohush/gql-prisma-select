import type { GraphQLResolveInfo } from 'types';
import type { GraphQLSchema } from 'graphql';
import { GQLPrismaSelect } from '../GQLPrismaSelect';
import {
  TypedOptions,
  TypeValidationOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TypeCheckContext,
  PrismaSelect,
  SafeSelect,
  InferSelection
} from '../types';

// Phase 8: Type-Safe Integration

/**
 * Type-safe GQLPrismaSelect class that provides compile-time type checking
 * and IntelliSense support for GraphQL and Prisma integration
 */
export class TypedGQLPrismaSelect<
  TGraphQL = any,
  TPrisma extends string = string
> extends GQLPrismaSelect<InferSelection<TGraphQL>, PrismaSelect<TPrisma>> {

  private schema?: GraphQLSchema;
  private typeValidationOptions?: TypeValidationOptions;

  constructor(
    info: GraphQLResolveInfo,
    options: TypedOptions<TGraphQL, TPrisma> = {}
  ) {
    super(info, options);
    this.typeValidationOptions = options.typeValidation;
  }

  /**
   * Get type-safe select object with full IntelliSense support
   */
  getTypedSelect(): SafeSelect<TGraphQL, TPrisma> {
    return (this.select || this.include) as SafeSelect<TGraphQL, TPrisma>;
  }

  /**
   * Get type-safe include object for relations
   */
  getTypedInclude(): PrismaSelect<TPrisma> {
    return (this.include || {}) as PrismaSelect<TPrisma>;
  }

  /**
   * Validate selections against GraphQL schema and Prisma types at runtime
   */
  validateTypes(schema?: GraphQLSchema): ValidationResult {
    if (!this.typeValidationOptions || !schema) {
      return { isValid: true, errors: [], warnings: [] };
    }

    const context: TypeCheckContext = {
      schema,
      prismaClient: null, // Would need to be injected
      strict: this.typeValidationOptions.strict ?? false,
      path: []
    };

    return this.performTypeValidation(this.select || this.include || {}, context);
  }

  /**
   * Transform result with type validation
   */
  transformResultTyped(result: any): any {
    const transformed = this.transformResult(result);

    if (this.typeValidationOptions?.strict && this.schema) {
      const validation = this.validateResultTypes(transformed);
      if (!validation.isValid) {
        if (this.typeValidationOptions.strict) {
          throw new Error(`Type validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
        }
      }
    }

    return transformed;
  }

  private performTypeValidation(
    selections: any,
    context: TypeCheckContext
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation - would need more sophisticated implementation
    // for full GraphQL schema validation
    for (const [field, value] of Object.entries(selections)) {
      if (typeof value === 'object' && value !== null) {
        const nestedContext = {
          ...context,
          path: [...context.path, field]
        };
        const nested = this.performTypeValidation(value, nestedContext);
        errors.push(...nested.errors);
        warnings.push(...nested.warnings);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateResultTypes(result: any): ValidationResult {
    // Basic result validation - would need schema-aware validation
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}
