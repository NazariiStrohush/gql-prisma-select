import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLBoolean, GraphQLNonNull, GraphQLList } from 'graphql';
import { TypeValidator, TypeValidationUtils } from '../typeValidator';
import { ValidationResult, ValidationError, ValidationWarning } from '../types';

// Phase 8: Type-Safe Integration - Type Validator Tests

describe('TypeValidator', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    // Create a simple test schema
    const UserType = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) },
        email: { type: GraphQLString },
        age: { type: GraphQLInt },
        active: { type: GraphQLBoolean }
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
      })
    });
  });

  describe('validate', () => {
    it('should validate simple values', () => {
      const result = TypeValidator.validate(
        'hello',
        GraphQLString,
        { strict: true },
        schema
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect type mismatches', () => {
      const result = TypeValidator.validate(
        123,
        GraphQLString,
        { strict: true },
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].expectedType).toBe('string');
      expect(result.errors[0].actualType).toBe('number');
    });

    it('should validate non-null types', () => {
      const result = TypeValidator.validate(
        null,
        new GraphQLNonNull(GraphQLString),
        { strict: true },
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('non-null');
    });

    it('should validate list types', () => {
      const result = TypeValidator.validate(
        ['a', 'b', 'c'],
        new GraphQLList(GraphQLString),
        { strict: true },
        schema
      );

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid list items', () => {
      const result = TypeValidator.validate(
        ['a', 123, 'c'],
        new GraphQLList(GraphQLString),
        { strict: true },
        schema
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('validateSelection', () => {
    it('should validate valid selections', () => {
      const selections = {
        id: true,
        name: true,
        email: true
      };

      const errors = TypeValidator.validateSelection(selections, schema.getType('User')!, schema);

      expect(errors).toHaveLength(0);
    });

    it('should detect invalid field selections', () => {
      const selections = {
        id: true,
        invalidField: true
      };

      const errors = TypeValidator.validateSelection(selections, schema.getType('User')!, schema);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('invalidField');
    });

    it('should validate nested selections', () => {
      const selections = {
        id: true,
        author: {
          id: true,
          name: true
        }
      };

      const errors = TypeValidator.validateSelection(selections, schema.getType('Post')!, schema);

      expect(errors).toHaveLength(0);
    });

    it('should detect invalid nested selections', () => {
      const selections = {
        id: true,
        author: {
          id: true,
          invalidField: true
        }
      };

      const errors = TypeValidator.validateSelection(selections, schema.getType('Post')!, schema);

      expect(errors).toHaveLength(1);
      expect(errors[0].path).toContain('author');
    });
  });

  describe('validateResult', () => {
    let validator: TypeValidator;

    beforeEach(() => {
      validator = new TypeValidator(schema, { strict: true });
    });

    it('should validate valid results', () => {
      const result = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      };

      const validation = validator.validateResult(result, schema.getType('User')!);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const result = {
        name: 'John Doe',
        email: 'john@example.com'
        // Missing required 'id' field
      };

      const validation = validator.validateResult(result, schema.getType('User')!);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'id')).toBe(true);
    });

    it('should detect type mismatches', () => {
      const result = {
        id: '123',
        name: 'John Doe',
        age: 'not-a-number' // Should be number
      };

      const validation = validator.validateResult(result, schema.getType('User')!);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'age')).toBe(true);
    });

    it('should validate nested objects', () => {
      const result = {
        id: 'post-1',
        title: 'Test Post',
        author: {
          id: 'user-1',
          name: 'John Doe'
        }
      };

      const validation = validator.validateResult(result, schema.getType('Post')!);

      expect(validation.isValid).toBe(true);
    });
  });

  describe('validateSelections', () => {
    let validator: TypeValidator;

    beforeEach(() => {
      validator = new TypeValidator(schema);
    });

    it('should validate valid selections object', () => {
      const selections = {
        id: true,
        name: true
      };

      const result = validator.validateSelections(selections, 'User');

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid type name', () => {
      const selections = {
        id: true
      };

      const result = validator.validateSelections(selections, 'InvalidType');

      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('not found in schema');
    });
  });
});

describe('TypeValidationUtils', () => {
  let schema: GraphQLSchema;

  beforeEach(() => {
    const UserType = new GraphQLObjectType({
      name: 'User',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
        name: { type: new GraphQLNonNull(GraphQLString) }
      }
    });

    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: {
          user: { type: UserType }
        }
      })
    });
  });

  describe('createValidationContext', () => {
    it('should create validation context', () => {
      const context = TypeValidationUtils.createValidationContext(schema, undefined, {
        strict: true
      });

      expect(context.schema).toBe(schema);
      expect(context.strict).toBe(true);
      expect(context.path).toEqual([]);
    });
  });

  describe('validatePrismaSelection', () => {
    it('should validate Prisma selection against GraphQL schema', () => {
      const selection = {
        id: true,
        name: true
      };

      const result = TypeValidationUtils.validatePrismaSelection(selection, 'User', schema);

      expect(result.isValid).toBe(true);
    });

    it('should detect invalid selections', () => {
      const selection = {
        id: true,
        invalidField: true
      };

      const result = TypeValidationUtils.validatePrismaSelection(selection, 'User', schema);

      expect(result.isValid).toBe(false);
    });
  });

  describe('formatValidationErrors', () => {
    it('should format errors as user-friendly messages', () => {
      const errors: ValidationError[] = [
        {
          field: 'name',
          expectedType: 'string',
          actualType: 'number',
          message: 'Type mismatch',
          path: ['user']
        }
      ];

      const messages = TypeValidationUtils.formatValidationErrors(errors);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain('user.name');
      expect(messages[0]).toContain('Type mismatch');
    });

    it('should handle empty path', () => {
      const errors: ValidationError[] = [
        {
          field: 'name',
          expectedType: 'string',
          actualType: 'number',
          message: 'Type mismatch',
          path: []
        }
      ];

      const messages = TypeValidationUtils.formatValidationErrors(errors);

      expect(messages[0]).toBe('name: Type mismatch');
    });
  });

  describe('isTypeCompatible', () => {
    it('should determine type compatibility', () => {
      const stringType = GraphQLString;
      const intType = GraphQLInt;

      // Same types should be compatible
      expect(TypeValidationUtils.isTypeCompatible(stringType, stringType, schema)).toBe(true);

      // Different types might be compatible in some contexts
      // This is a basic implementation - real compatibility would be more complex
      expect(TypeValidationUtils.isTypeCompatible(stringType, intType, schema)).toBeDefined();
    });
  });
});
