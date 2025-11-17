import { GraphQLResolveInfo } from 'types';
import { TypedGQLPrismaSelect } from '../typed/TypedGQLPrismaSelect';
import { TypedQueryBuilder } from '../typed/TypedQueryBuilder';
import { TypedOptions, TypedQueryBuilderOptions, ValidationResult } from '../types';
import { createMockGraphQLInfo } from './helpers/mockGraphQLInfo';

// Phase 8: Type-Safe Integration - TypedGQLPrismaSelect Tests

describe('TypedGQLPrismaSelect', () => {
  let mockInfo: GraphQLResolveInfo;

  beforeEach(() => {
    mockInfo = createMockGraphQLInfo({
      fieldName: 'user',
      selections: `
        id
        name
        email
        posts {
          id
          title
          content
        }
      `
    });
  });

  describe('Constructor', () => {
    it('should create instance with type parameters', () => {
      interface GraphQLUser {
        id: string;
        name: string;
        email: string;
        posts: {
          id: string;
          title: string;
          content: string;
        };
      }

      const selector = new TypedGQLPrismaSelect<GraphQLUser, 'User'>(mockInfo);

      expect(selector).toBeInstanceOf(TypedGQLPrismaSelect);
    });

    it('should accept typed options', () => {
      interface GraphQLUser {
        id: string;
        name: string;
      }

      const options: TypedOptions<GraphQLUser, 'User'> = {
        excludeFields: ['__typename'],
        typeValidation: {
          strict: true,
          validateEnums: true
        }
      };

      const selector = new TypedGQLPrismaSelect<GraphQLUser, 'User'>(mockInfo, options);

      expect(selector).toBeDefined();
    });
  });

  describe('getTypedSelect', () => {
    it('should return type-safe select object', () => {
      interface GraphQLUser {
        id: string;
        name: string;
        posts: {
          id: string;
          title: string;
        };
      }

      const selector = new TypedGQLPrismaSelect<GraphQLUser, 'User'>(mockInfo);
      const select = selector.getTypedSelect();

      expect(select).toBeDefined();
      expect(typeof select).toBe('object');
    });

    it('should allow safe field access', () => {
      interface GraphQLUser {
        id: string;
        name: string;
        email: string;
      }

      const selector = new TypedGQLPrismaSelect<GraphQLUser, 'User'>(mockInfo);
      const select = selector.getTypedSelect();

      // This should compile without TypeScript errors
      const safeAccess = select.id && select.name && select.email;
      expect(safeAccess).toBeDefined();
    });
  });

  describe('getTypedInclude', () => {
    it('should return type-safe include object', () => {
      interface GraphQLUser {
        id: string;
        posts: {
          id: string;
          title: string;
        };
      }

      const selector = new TypedGQLPrismaSelect<GraphQLUser, 'User'>(mockInfo);
      const include = selector.getTypedInclude();

      expect(include).toBeDefined();
      expect(typeof include).toBe('object');
    });
  });

  describe('validateTypes', () => {
    it('should return valid result when no schema provided', () => {
      const selector = new TypedGQLPrismaSelect(mockInfo);
      const result = selector.validateTypes();

      expect(result).toEqual({
        isValid: true,
        errors: [],
        warnings: []
      });
    });

    it('should perform validation when schema provided', () => {
      // Mock schema - in real implementation this would be a proper GraphQL schema
      const mockSchema = {} as any;

      const selector = new TypedGQLPrismaSelect(mockInfo, {
        typeValidation: { strict: true }
      });

      const result = selector.validateTypes(mockSchema);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });
  });

  describe('transformResultTyped', () => {
    it('should transform result with validation', () => {
      const selector = new TypedGQLPrismaSelect(mockInfo);
      const mockResult = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const transformed = selector.transformResultTyped(mockResult);

      expect(transformed).toEqual(mockResult);
    });

    it('should handle validation errors in strict mode', () => {
      const mockSchema = {} as any;

      const selector = new TypedGQLPrismaSelect(mockInfo, {
        typeValidation: { strict: true }
      });

      const mockResult = {
        id: '1',
        name: 'John Doe'
      };

      // Should not throw in this test environment
      const transformed = selector.transformResultTyped(mockResult);
      expect(transformed).toBeDefined();
    });
  });
});

describe('TypedQueryBuilder', () => {
  describe('Constructor', () => {
    it('should create instance with model name', () => {
      const options: TypedQueryBuilderOptions<'User'> = {
        model: 'User',
        typeValidation: true
      };

      const builder = new TypedQueryBuilder(options);

      expect(builder).toBeInstanceOf(TypedQueryBuilder);
      expect(builder.getModel()).toBe('User');
    });
  });

  describe('select', () => {
    it('should add fields to select with type safety', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.select({
        id: true,
        name: true,
        email: true
      });

      expect(result).toBe(builder);
    });

    it('should allow nested selections', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.select({
        id: true,
        posts: {
          id: true,
          title: true
        }
      });

      expect(result).toBe(builder);
    });
  });

  describe('include', () => {
    it('should add relations to include', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.include({
        posts: true,
        profile: true
      });

      expect(result).toBe(builder);
    });

    it('should allow nested includes', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.include({
        posts: {
          include: {
            comments: true
          }
        }
      });

      expect(result).toBe(builder);
    });
  });

  describe('where', () => {
    it('should add where conditions', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.where({
        id: '123',
        active: true
      });

      expect(result).toBe(builder);
    });
  });

  describe('orderBy', () => {
    it('should add ordering', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      const result = builder.orderBy({
        createdAt: 'desc'
      });

      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should build complete query object', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });

      builder
        .select({ id: true, name: true })
        .include({ posts: true })
        .where({ active: true })
        .orderBy({ createdAt: 'desc' });

      const query = builder.build();

      expect(query).toEqual({
        select: { id: true, name: true },
        include: { posts: true },
        where: { active: true },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should handle empty builder', () => {
      const builder = new TypedQueryBuilder({ model: 'User' });
      const query = builder.build();

      expect(query).toEqual({});
    });
  });

  describe('getModel', () => {
    it('should return the model name', () => {
      const builder = new TypedQueryBuilder({ model: 'Post' });
      expect(builder.getModel()).toBe('Post');
    });
  });
});
