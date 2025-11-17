import { GraphQLResolveInfo } from 'types';
import { TypedOptions, TypedQueryBuilderOptions, TypeValidationOptions, ValidationResult, PrismaSelect, SafeSelect, InferSelection } from './types';
import { TransformOptions } from './GQLPrismaSelect';
import { FragmentOptions } from './fragments';
import { FragmentRegistry, FragmentStats, FragmentAnalysis } from './fragments';

// Phase 8: Type-Safe Integration - IntelliSense Support

/**
 * Declaration merging for enhanced IntelliSense support
 */
declare module './GQLPrismaSelect' {
  export interface GQLPrismaSelect<S = any, I = any> {
    /**
     * Type-safe selection getter with full IntelliSense support
     * @template TModel Prisma model name
     * @returns Type-safe select object
     */
    getTypedSelect<TModel extends string>(): PrismaSelect<TModel>;

    /**
     * Type-safe include getter for relations
     * @template TModel Prisma model name
     * @returns Type-safe include object
     */
    getTypedInclude<TModel extends string>(): Record<string, any>;

    /**
     * Validate selections against GraphQL schema at runtime
     * @param schema GraphQL schema for validation
     * @returns Validation result with errors and warnings
     */
    validateTypes(schema?: any): ValidationResult;

    /**
     * Transform result data with type validation
     * @param result Raw result data from Prisma
     * @returns Transformed and validated result data
     */
    transformResultTyped(result: any): any;
  }

  /**
   * Type-safe GQLPrismaSelect class with enhanced IntelliSense
   */
  export class TypedGQLPrismaSelect<
    TGraphQL = any,
    TPrisma extends string = string
  > extends GQLPrismaSelect<InferSelection<TGraphQL>, PrismaSelect<TPrisma>> {
    constructor(
      info: GraphQLResolveInfo,
      options?: TypedOptions<TGraphQL, TPrisma>
    );

    /**
     * Get type-safe select object with IntelliSense for GraphQL fields
     */
    getTypedSelect(): SafeSelect<TGraphQL, TPrisma>;

    /**
     * Get type-safe include object for Prisma relations
     */
    getTypedInclude(): PrismaSelect<TPrisma>;

    /**
     * Validate selections against GraphQL schema
     */
    validateTypes(schema?: any): ValidationResult;

    /**
     * Transform result with type validation
     */
    transformResultTyped(result: any): any;
  }

  /**
   * Type-safe query builder with IntelliSense
   */
  export class TypedQueryBuilder<TModel extends string> {
    constructor(options: TypedQueryBuilderOptions<TModel>);

    /**
     * Add fields to select with type safety
     */
    select<T extends Partial<PrismaSelect<TModel>>>(
      fields: T
    ): this;

    /**
     * Add relations to include with type safety
     */
    include<T extends Record<string, any>>(
      relations: T
    ): this;

    /**
     * Add where conditions
     */
    where(conditions: any): this;

    /**
     * Add ordering
     */
    orderBy(order: any): this;

    /**
     * Build the final query object
     */
    build(): {
      select?: Partial<PrismaSelect<TModel>>;
      include?: Partial<Record<string, any>>;
      where?: any;
      orderBy?: any;
    };

    /**
     * Get the model name for type safety
     */
    getModel(): TModel;
  }

  /**
   * Static methods with IntelliSense support
   */
  export namespace GQLPrismaSelect {
    /**
     * Create type-safe selector with fragment handling
     */
    function withFragments(
      info: GraphQLResolveInfo,
      fragments: FragmentOptions,
      params?: { excludeFields?: string[]; get?: string | string[]; transforms?: TransformOptions }
    ): GQLPrismaSelect;

    /**
     * Get fragment usage statistics
     */
    function getFragmentStats(): FragmentStats;

    /**
     * Analyze fragments for optimization opportunities
     */
    function analyzeFragments(): FragmentAnalysis;

    /**
     * Create typed selector with type safety
     */
    function createTyped<
      TGraphQL = any,
      TPrisma extends string = string
    >(
      info: GraphQLResolveInfo,
      options?: TypedOptions<TGraphQL, TPrisma>
    ): TypedGQLPrismaSelect<TGraphQL, TPrisma>;

    /**
     * Create typed query builder
     */
    function createQueryBuilder<TModel extends string>(
      options: TypedQueryBuilderOptions<TModel>
    ): TypedQueryBuilder<TModel>;
  }
}

/**
 * Global IntelliSense helpers
 */
declare global {
  /**
   * Utility type for inferring GraphQL selections
   */
  type GraphQLSelection<T> = T extends object
    ? { [K in keyof T]?: T[K] extends object ? boolean | GraphQLSelection<T[K]> : boolean }
    : boolean;

  /**
   * Utility type for Prisma select operations
   */
  type PrismaSelection<TModel extends string> = Record<string, boolean | Record<string, boolean | Record<string, any>>>;

  /**
   * Combined type-safe selection
   */
  type SafeSelection<TGraphQL, TPrisma extends string> = GraphQLSelection<TGraphQL> & PrismaSelection<TPrisma>;
}

/**
 * IntelliSense for common GraphQL patterns
 */
export interface GraphQLPatterns {
  /**
   * User selection pattern
   */
  User: {
    id?: boolean;
    email?: boolean;
    name?: boolean;
    posts?: boolean | {
      id?: boolean;
      title?: boolean;
      content?: boolean;
      published?: boolean;
    };
    profile?: boolean | {
      bio?: boolean;
      avatar?: boolean;
    };
  };

  /**
   * Post selection pattern
   */
  Post: {
    id?: boolean;
    title?: boolean;
    content?: boolean;
    published?: boolean;
    author?: boolean | {
      id?: boolean;
      name?: boolean;
      email?: boolean;
    };
    comments?: boolean | {
      id?: boolean;
      text?: boolean;
      author?: boolean | {
        id?: boolean;
        name?: boolean;
      };
    };
  };

  /**
   * Comment selection pattern
   */
  Comment: {
    id?: boolean;
    text?: boolean;
    author?: boolean | {
      id?: boolean;
      name?: boolean;
    };
    post?: boolean | {
      id?: boolean;
      title?: boolean;
    };
  };
}

/**
 * IntelliSense for common Prisma patterns
 */
export interface PrismaPatterns {
  /**
   * Common select patterns
   */
  select: {
    user: {
      id: boolean;
      email: boolean;
      name: boolean;
    };
    post: {
      id: boolean;
      title: boolean;
      content: boolean;
      published: boolean;
    };
    comment: {
      id: boolean;
      text: boolean;
    };
  };

  /**
   * Common include patterns
   */
  include: {
    user: {
      posts: boolean | {
        include: {
          author: boolean;
          comments: boolean;
        };
      };
      profile: boolean;
    };
    post: {
      author: boolean | {
        include: {
          profile: boolean;
        };
      };
      comments: boolean | {
        include: {
          author: boolean;
        };
      };
    };
  };
}
