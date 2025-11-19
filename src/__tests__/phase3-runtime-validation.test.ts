
import { buildSchema, GraphQLSchema, GraphQLError } from 'graphql';
import { TypeValidator } from '../typeValidator';
import { TypeValidationOptions } from '../types';

describe('Phase 3.2: Runtime Type Validation', () => {
  let schema: GraphQLSchema;

  beforeAll(() => {
    schema = buildSchema(`
      scalar CustomScalar

      enum UserRole {
        ADMIN
        USER
        GUEST
      }

      type Address {
        street: String!
        city: String
        zipCode: String
      }

      type User {
        id: ID!
        username: String!
        email: String
        age: Int
        score: Float
        isActive: Boolean!
        role: UserRole
        tags: [String!]
        address: Address
        friends: [User]
        meta: CustomScalar
      }

      type Query {
        user(id: ID!): User
        users: [User!]!
      }
    `);
  });

  describe('Enum Value Validation', () => {
    it('should validate correct enum values', () => {
      const result = TypeValidator.validate(
        'ADMIN',
        schema.getType('UserRole'),
        { validateEnums: true },
        schema
      );
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid enum values', () => {
      const result = TypeValidator.validate(
        'SUPER_ADMIN',
        schema.getType('UserRole'),
        { validateEnums: true },
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('not valid for enum UserRole');
    });

    it('should skip enum validation when disabled', () => {
      const result = TypeValidator.validate(
        'SUPER_ADMIN',
        schema.getType('UserRole'),
        { validateEnums: false },
        schema
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe('Type Coercion Scenarios', () => {
    it('should reject string for Int type', () => {
      const result = TypeValidator.validate(
        '25',
        schema.getType('Int'),
        {},
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Expected integer for Int');
    });

    it('should reject float for Int type', () => {
      const result = TypeValidator.validate(
        25.5,
        schema.getType('Int'),
        {},
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Expected integer for Int');
    });

    it('should accept integer for Float type', () => {
        // In GraphQL, Int can often be coerced to Float, but let's see strict validation behavior
      const result = TypeValidator.validate(
        25,
        schema.getType('Float'),
        {},
        schema
      );
      // Implementation says: if (actualType !== 'number') check. 25 is 'number'.
      expect(result.isValid).toBe(true);
    });

    it('should reject string for Boolean type', () => {
      const result = TypeValidator.validate(
        'true',
        schema.getType('Boolean'),
        {},
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Expected boolean for Boolean');
    });
  });

  describe('Null/Undefined Propagation', () => {
    it('should reject null for non-null scalar', () => {
      // User.id is ID!
      const userType = schema.getType('User') as any;
      const idField = userType.getFields().id;
      
      const result = TypeValidator.validate(
        null,
        idField.type,
        {},
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Expected non-null value');
    });

    it('should accept null for nullable scalar', () => {
      // User.age is Int
      const userType = schema.getType('User') as any;
      const ageField = userType.getFields().age;
      
      const result = TypeValidator.validate(
        null,
        ageField.type,
        {},
        schema
      );
      expect(result.isValid).toBe(true);
    });

    it('should validate nested object nullability', () => {
      const userType = schema.getType('User') as any;
      
      const validUser = {
        id: '1',
        username: 'test',
        isActive: true,
        address: null // Address is nullable
      };

      const result = TypeValidator.validate(
        validUser,
        userType,
        {},
        schema
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject missing required field in nested object', () => {
      const userType = schema.getType('User') as any;
      
      const invalidUser = {
        id: '1',
        // username missing
        isActive: true
      };

      const result = TypeValidator.validate(
        invalidUser,
        userType,
        {},
        schema
      );
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain("Missing required field 'username'");
    });
    
    it('should reject null in non-null list', () => {
        // tags: [String!]
        const userType = schema.getType('User') as any;
        const tagsField = userType.getFields().tags; // [String!] implies the list can be null, but items cannot be null if it was [String!]! but here it is [String!] -> List of Non-Null Strings.
        // Actually schema says [String!]. This means the list itself can be null, but if it exists, elements cannot be null.
        
        // Case 1: List is null (valid)
        let result = TypeValidator.validate(null, tagsField.type, {}, schema);
        expect(result.isValid).toBe(true);

        // Case 2: List contains null (invalid)
        result = TypeValidator.validate(['a', null], tagsField.type, {}, schema);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].message).toContain('Expected non-null value');
    });
  });

  describe('Custom Validation Rules', () => {
    // Since there is no direct "custom rule" injection in TypeValidator class, 
    // we test the extensibility or the warning behavior for custom scalars.
    
    it('should warn on custom scalar by default', () => {
      const userType = schema.getType('User') as any;
      const metaField = userType.getFields().meta;
      
      const result = TypeValidator.validate(
        "some-custom-value",
        metaField.type,
        { warnOnMissing: true },
        schema
      );
      
      expect(result.isValid).toBe(true); // Validation doesn't fail
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain('validation not implemented');
    });

    it('should not warn on custom scalar if warnings disabled', () => {
        const userType = schema.getType('User') as any;
        const metaField = userType.getFields().meta;
        
        const result = TypeValidator.validate(
          "some-custom-value",
          metaField.type,
          { warnOnMissing: false },
          schema
        );
        
        expect(result.warnings).toHaveLength(0);
    });

    it('should use custom validator if provided', () => {
      const userType = schema.getType('User') as any;
      const metaField = userType.getFields().meta;
      
      const result = TypeValidator.validate(
        "invalid-value",
        metaField.type,
        {
          customValidators: {
            'CustomScalar': (value: any) => value === 'valid-value' || 'Must be valid-value'
          }
        },
        schema
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Must be valid-value');
      
      const validResult = TypeValidator.validate(
        "valid-value",
        metaField.type,
        {
          customValidators: {
            'CustomScalar': (value: any) => value === 'valid-value' || 'Must be valid-value'
          }
        },
        schema
      );
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('Extra Fields Validation', () => {
    it('should warn about extra fields in strict mode', () => {
      const userType = schema.getType('User') as any;
      
      const userWithExtra = {
        id: '1',
        username: 'test',
        isActive: true,
        extraField: 'something'
      };

      const result = TypeValidator.validate(
        userWithExtra,
        userType,
        { strict: true },
        schema
      );
      
      expect(result.isValid).toBe(true); // Extra fields don't invalidate unless configured?
      // Logic: strict mode adds warnings for extra fields. Does it invalidate?
      // Looking at validateObjectValue: 
      // if (strict) warnings.push(...)
      // It does not push to errors. So isValid should be true, but warnings present.
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].message).toContain("Extra field 'extraField' not defined");
    });

    it('should ignore extra fields in non-strict mode', () => {
        const userType = schema.getType('User') as any;
        
        const userWithExtra = {
          id: '1',
          username: 'test',
          isActive: true,
          extraField: 'something'
        };
  
        const result = TypeValidator.validate(
          userWithExtra,
          userType,
          { strict: false },
          schema
        );
        
        expect(result.warnings).toHaveLength(0);
    });
  });
});

