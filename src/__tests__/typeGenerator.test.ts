import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLNonNull, GraphQLList } from 'graphql';
import { TypeGenerator, TypeGeneratorCLI } from '../typeGenerator';
import { TypeGenerationOptions, TypeGenerationResult } from '../types';

// Phase 8: Type-Safe Integration - Type Generator Tests

describe('TypeGenerator', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    // Create a test schema
    const UserType = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLString },
        age: { type: GraphQLInt }
      }
    });

    const PostType = new GraphQLObjectType({
      name: 'Post',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        title: { type: new GraphQLNonNull(GraphQLString) },
        content: { type: GraphQLString },
        author: { type: UserType }
      }
    });

    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: { type: UserType },
          users: { type: new GraphQLList(UserType) },
          post: { type: PostType }
        }
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: {
          createUser: { type: UserType },
          updateUser: { type: UserType }
        }
      })
    });
  });

  describe('generateTypes', () => {
    it('should generate TypeScript types from schema', () => {
      const options: TypeGenerationOptions = {
        output: './generated',
        schema: './schema.graphql',
        prismaClient: './prisma-client',
        generateQueries: true,
        generateMutations: true,
        generateSubscriptions: false
      };

      const generator = new TypeGenerator(schema, options);
      const result = generator.generateTypes();

      expect(result).toBeDefined();
      expect(result.types).toContain('export namespace');
      expect(result.metadata).toBeDefined();
      expect(result.metadata.modelsCount).toBeGreaterThan(0);
    });

    it('should generate query types', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: true,
        generateMutations: false,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.types).toContain('Queries');
      expect(result.types).toContain('user:');
      expect(result.types).toContain('users:');
      expect(result.types).toContain('post:');
    });

    it('should generate mutation types', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: true,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.types).toContain('Mutations');
      expect(result.types).toContain('createUser:');
      expect(result.types).toContain('updateUser:');
    });

    it('should generate model types', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: false,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.types).toContain('interface User');
      expect(result.types).toContain('interface Post');
      expect(result.types).toContain('id?: string;');
      expect(result.types).toContain('name?: string;');
    });

    it('should generate utility types', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: false,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.types).toContain('InferSelection');
      expect(result.types).toContain('SafeSelect');
    });

    it('should generate IntelliSense declarations', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: false,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.types).toContain('declare module');
      expect(result.types).toContain('getTypedSelect');
      expect(result.types).toContain('getTypedInclude');
    });
  });

  describe('generateForModel', () => {
    it('should generate types for specific model', () => {
      const types = TypeGenerator.generateForModel('User', schema);

      expect(types).toContain('interface User');
      expect(types).toContain('id?: string;');
      expect(types).toContain('name?: string;');
      expect(types).toContain('email?: string;');
    });

    it('should handle unknown model', () => {
      const types = TypeGenerator.generateForModel('UnknownModel', schema);

      expect(types).toContain('// Type not found');
    });
  });

  describe('generateQueryTypes', () => {
    it('should generate query type signatures', () => {
      const queryTypes = TypeGenerator.generateQueryTypes(schema);

      expect(queryTypes).toContain('user:');
      expect(queryTypes).toContain('users:');
      expect(queryTypes).toContain('Promise<User>');
      expect(queryTypes).toContain('Promise<User[]>');
    });
  });

  describe('graphQLTypeToTypeScript', () => {
    let generator: TypeGenerator;

    beforeEach(() => {
      generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: false,
        generateSubscriptions: false
      });
    });

    it('should convert scalar types', () => {
      expect(generator['graphQLTypeToTypeScript'](GraphQLString)).toBe('string');
      expect(generator['graphQLTypeToTypeScript'](GraphQLInt)).toBe('number');
    });

    it('should handle non-null types', () => {
      const nonNullString = new GraphQLNonNull(GraphQLString);
      expect(generator['graphQLTypeToTypeScript'](nonNullString)).toBe('string');
    });

    it('should handle list types', () => {
      const listOfStrings = new GraphQLList(GraphQLString);
      expect(generator['graphQLTypeToTypeScript'](listOfStrings)).toBe('string[]');
    });

    it('should handle object types', () => {
      const userType = schema.getType('User')!;
      expect(generator['graphQLTypeToTypeScript'](userType)).toBe('User');
    });
  });

  describe('Integration with metadata', () => {
    it('should include generation metadata', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: true,
        generateMutations: true,
        generateSubscriptions: false
      });

      const result = generator.generateTypes();

      expect(result.metadata.generatedAt).toBeInstanceOf(Date);
      expect(result.metadata.modelsCount).toBeGreaterThan(0);
      expect(result.metadata.typesCount).toBeGreaterThan(0);
      expect(Array.isArray(result.metadata.warnings)).toBe(true);
    });

    it('should count models correctly', () => {
      const generator = new TypeGenerator(schema, {
        output: '',
        schema: '',
        prismaClient: '',
        generateQueries: false,
        generateMutations: false,
        generateSubscriptions: false
      });

      const count = generator['countModels']();

      // Should count User and Post types
      expect(count).toBe(2);
    });
  });
});

describe('TypeGeneratorCLI', () => {
  describe('generateFromConfig', () => {
    it('should be defined', () => {
      expect(TypeGeneratorCLI.generateFromConfig).toBeDefined();
      expect(typeof TypeGeneratorCLI.generateFromConfig).toBe('function');
    });
  });

  describe('generateFromSchema', () => {
    it('should be defined', () => {
      expect(TypeGeneratorCLI.generateFromSchema).toBeDefined();
      expect(typeof TypeGeneratorCLI.generateFromSchema).toBe('function');
    });
  });
});

// Mock fs for testing
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => true)
}));
