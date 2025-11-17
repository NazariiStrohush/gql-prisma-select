import type { GraphQLSchema } from 'graphql';
import { TypedQueryBuilderOptions, PrismaSelect } from '../types';

/**
 * Type-safe query builder for Prisma operations
 */
export class TypedQueryBuilder<TModel extends string> {
  private model: TModel;
  private selectObj: Partial<PrismaSelect<TModel>> = {};
  private includeObj: Partial<Record<string, any>> = {};
  private whereObj: any = {};
  private orderByObj: any = {};
  private schema?: GraphQLSchema;
  private typeValidation: boolean;

  constructor(options: TypedQueryBuilderOptions<TModel>) {
    this.model = options.model;
    this.schema = options.schema;
    this.typeValidation = (options.typeValidation ?? true) as boolean;
  }

  /**
   * Add fields to select
   */
  select<T extends Partial<PrismaSelect<TModel>>>(
    fields: T
  ): this {
    this.selectObj = { ...this.selectObj, ...fields };
    return this;
  }

  /**
   * Add relations to include
   */
  include<T extends Record<string, any>>(
    relations: T
  ): this {
    this.includeObj = { ...this.includeObj, ...relations };
    return this;
  }

  /**
   * Add where conditions
   */
  where(conditions: any): this {
    this.whereObj = { ...this.whereObj, ...conditions };
    return this;
  }

  /**
   * Add ordering
   */
  orderBy(order: any): this {
    this.orderByObj = order;
    return this;
  }

  /**
   * Build the final Prisma query object
   */
  build(): {
    select?: Partial<PrismaSelect<TModel>>;
    include?: Partial<Record<string, any>>;
    where?: any;
    orderBy?: any;
  } {
    const result: any = {};

    if (Object.keys(this.selectObj).length > 0) {
      result.select = this.selectObj;
    }

    if (Object.keys(this.includeObj).length > 0) {
      result.include = this.includeObj;
    }

    if (Object.keys(this.whereObj).length > 0) {
      result.where = this.whereObj;
    }

    if (Object.keys(this.orderByObj).length > 0) {
      result.orderBy = this.orderByObj;
    }

    return result;
  }

  /**
   * Get the model name for type safety
   */
  getModel(): TModel {
    return this.model;
  }
}
