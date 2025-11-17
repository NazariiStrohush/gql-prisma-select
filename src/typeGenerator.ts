import { GraphQLSchema, GraphQLObjectType, GraphQLField, GraphQLType, isObjectType, isNonNullType, isListType, GraphQLNamedType, isScalarType, isEnumType } from 'graphql';
import * as fs from 'fs';
import * as path from 'path';
import { TypeGenerationOptions, TypeGenerationResult, TypeGenerationMetadata } from './types';

// Phase 8: Type-Safe Integration - Schema Type Generation

/**
 * Generates TypeScript types from GraphQL schemas for type-safe integration
 */
export class TypeGenerator {
  private schema: GraphQLSchema;
  private options: Required<TypeGenerationOptions>;
  private generatedTypes: Map<string, string> = new Map();

  constructor(schema: GraphQLSchema, options: Partial<TypeGenerationOptions> = {}) {
    this.schema = schema;
    this.options = {
      output: './generated',
      schema: '',
      prismaClient: '',
      generateQueries: true,
      generateMutations: true,
      generateSubscriptions: true,
      customScalars: {},
      namespace: 'Generated',
      ...options
    } as Required<TypeGenerationOptions>;
  }

  /**
   * Generate TypeScript types from the GraphQL schema
   */
  static async generate(options: TypeGenerationOptions): Promise<void> {
    // Read GraphQL schema
    const schemaContent = fs.readFileSync(options.schema, 'utf-8');

    // Parse schema - would need a GraphQL schema parser
    // For now, this is a placeholder implementation
    const schema = {} as GraphQLSchema;

    const generator = new TypeGenerator(schema, options);
    const result = generator.generateTypes();

    // Write generated types to file
    const outputPath = path.join(options.output, 'generated-types.ts');
    fs.writeFileSync(outputPath, result.types);

    console.log(`Generated types written to ${outputPath}`);
  }

  /**
   * Generate types for a specific model
   */
  static generateForModel(modelName: string, schema: GraphQLSchema): string {
    const generator = new TypeGenerator(schema, {
      output: '',
      schema: '',
      prismaClient: '',
      generateQueries: true,
      generateMutations: false,
      generateSubscriptions: false
    });

    return generator.generateModelType(modelName);
  }

  /**
   * Generate query types from schema
   */
  static generateQueryTypes(schema: GraphQLSchema): string {
    const generator = new TypeGenerator(schema, {
      output: '',
      schema: '',
      prismaClient: '',
      generateQueries: true,
      generateMutations: false,
      generateSubscriptions: false
    });

    return generator.generateQueryTypes();
  }

  /**
   * Main type generation method
   */
  generateTypes(): TypeGenerationResult {
    const types: string[] = [];
    const warnings: string[] = [];

    // Generate namespace
    types.push(`export namespace ${this.options.namespace} {`);

    // Generate type definitions
    if (this.options.generateQueries) {
      types.push(this.generateQueryTypes());
    }

    if (this.options.generateMutations) {
      types.push(this.generateMutationTypes());
    }

    if (this.options.generateSubscriptions) {
      types.push(this.generateSubscriptionTypes());
    }

    // Generate model types
    types.push(this.generateModelTypes());

    // Generate utility types
    types.push(this.generateUtilityTypes());

    types.push('}'); // Close namespace

    // Generate IntelliSense declarations
    types.push(this.generateIntelliSenseDeclarations());

    const result: TypeGenerationResult = {
      types: types.join('\n\n'),
      schema: this.generateGraphQLSchemaString(),
      metadata: {
        generatedAt: new Date(),
        schemaVersion: '1.0.0', // Would need to extract from schema
        prismaVersion: '4.0.0', // Would need to extract from prisma client
        modelsCount: this.countModels(),
        typesCount: this.generatedTypes.size,
        warnings
      }
    };

    return result;
  }

  private generateQueryTypes(): string {
    const queryType = this.schema.getQueryType();
    if (!queryType) return '';

    const types: string[] = [];
    types.push('  // Query Types');
    types.push('  export interface Queries {');

    const fields = queryType.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      const returnType = this.graphQLTypeToTypeScript(field.type);
      const argsType = this.generateFieldArgs(field);
      types.push(`    ${fieldName}: ${argsType} => Promise<${returnType}>;`);
    }

    types.push('  }');
    return types.join('\n');
  }

  private generateMutationTypes(): string {
    const mutationType = this.schema.getMutationType();
    if (!mutationType) return '';

    const types: string[] = [];
    types.push('  // Mutation Types');
    types.push('  export interface Mutations {');

    const fields = mutationType.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      const returnType = this.graphQLTypeToTypeScript(field.type);
      const argsType = this.generateFieldArgs(field);
      types.push(`    ${fieldName}: ${argsType} => Promise<${returnType}>;`);
    }

    types.push('  }');
    return types.join('\n');
  }

  private generateSubscriptionTypes(): string {
    const subscriptionType = this.schema.getSubscriptionType();
    if (!subscriptionType) return '';

    const types: string[] = [];
    types.push('  // Subscription Types');
    types.push('  export interface Subscriptions {');

    const fields = subscriptionType.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
      const returnType = this.graphQLTypeToTypeScript(field.type);
      const argsType = this.generateFieldArgs(field);
      types.push(`    ${fieldName}: ${argsType} => AsyncIterable<${returnType}>;`);
    }

    types.push('  }');
    return types.join('\n');
  }

  private generateModelTypes(): string {
    const types: string[] = [];
    types.push('  // Model Types');

    const typeMap = this.schema.getTypeMap();
    for (const [typeName, type] of Object.entries(typeMap)) {
      if (isObjectType(type) && !typeName.startsWith('__')) {
        types.push(this.generateModelType(typeName));
      }
    }

    return types.join('\n\n');
  }

  private generateModelType(modelName: string): string {
    const type = this.schema.getType(modelName);
    if (!isObjectType(type)) {
      return `  export interface ${modelName} {\n    // Type not found or not an object type\n  }`;
    }

    const fields = type.getFields();
    const fieldDefinitions: string[] = [];

    for (const [fieldName, field] of Object.entries(fields)) {
      const tsType = this.graphQLTypeToTypeScript(field.type);
      const nullable = !isNonNullType(field.type) ? '?' : '';
      fieldDefinitions.push(`    ${fieldName}${nullable}: ${tsType};`);
    }

    return `  export interface ${modelName} {\n${fieldDefinitions.join('\n')}\n  }`;
  }

  private generateUtilityTypes(): string {
    return `  // Utility Types
  export type InferSelection<T> = T extends object
    ? { [K in keyof T]?: T[K] extends object ? boolean | InferSelection<T[K]> : boolean }
    : boolean;

  export type SafeSelect<TGraphQL, TPrisma extends string> =
    InferSelection<TGraphQL> & Record<string, boolean | Record<string, any>>;`;
  }

  private generateIntelliSenseDeclarations(): string {
    return `
/**
 * IntelliSense support for GQLPrismaSelect
 */
declare module '@nazariistrohush/gql-prisma-select' {
  export interface GQLPrismaSelect {
    /**
     * Type-safe selection getter
     * @template TModel Prisma model name
     */
    getTypedSelect<TModel extends string>(): import('./types').PrismaSelect<TModel>;

    /**
     * Type-safe include getter
     * @template TModel Prisma model name
     */
    getTypedInclude<TModel extends string>(): Record<string, any>;
  }
}`;
  }

  private graphQLTypeToTypeScript(type: GraphQLType): string {
    if (isNonNullType(type)) {
      return this.graphQLTypeToTypeScript(type.ofType);
    }

    if (isListType(type)) {
      return `${this.graphQLTypeToTypeScript(type.ofType)}[]`;
    }

    if (isScalarType(type)) {
      return this.scalarTypeToTypeScript(type.name);
    }

    if (isEnumType(type)) {
      return type.name;
    }

    if (isObjectType(type)) {
      return type.name;
    }

    return 'any';
  }

  private scalarTypeToTypeScript(scalarName: string): string {
    const customScalar = this.options.customScalars?.[scalarName];
    if (customScalar) {
      return customScalar;
    }

    switch (scalarName) {
      case 'ID':
      case 'String':
        return 'string';
      case 'Int':
      case 'Float':
        return 'number';
      case 'Boolean':
        return 'boolean';
      default:
        return 'any';
    }
  }

  private generateFieldArgs(field: GraphQLField<any, any>): string {
    const args = field.args;
    if (args.length === 0) {
      return '()';
    }

    const argTypes = args.map(arg => {
      const tsType = this.graphQLTypeToTypeScript(arg.type);
      return `${arg.name}: ${tsType}`;
    });

    return `(${argTypes.join(', ')})`;
  }

  private generateGraphQLSchemaString(): string {
    // Placeholder - would need to implement schema serialization
    return '# Generated GraphQL Schema\n# Implementation needed';
  }

  private countModels(): number {
    let count = 0;
    const typeMap = this.schema.getTypeMap();
    for (const [typeName, type] of Object.entries(typeMap)) {
      if (isObjectType(type) && !typeName.startsWith('__')) {
        count++;
      }
    }
    return count;
  }
}

/**
 * CLI helper for type generation
 */
export class TypeGeneratorCLI {
  static async generateFromConfig(configPath: string): Promise<void> {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    await TypeGenerator.generate(config);
  }

  static async generateFromSchema(schemaPath: string, outputPath: string): Promise<void> {
    const options: TypeGenerationOptions = {
      output: outputPath,
      schema: schemaPath,
      prismaClient: '', // Would need to be provided
      generateQueries: true,
      generateMutations: true,
      generateSubscriptions: true
    };

    await TypeGenerator.generate(options);
  }
}
