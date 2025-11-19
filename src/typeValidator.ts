import { GraphQLSchema, GraphQLType, GraphQLObjectType, isObjectType, isScalarType, isEnumType, isNonNullType, isListType, GraphQLError } from 'graphql';
import { TypeValidationOptions, ValidationResult, ValidationError, ValidationWarning, TypeCheckContext } from './types';

// Phase 8: Type-Safe Integration - Runtime Type Validation

/**
 * Runtime type validator for GraphQL and Prisma integration
 */
export class TypeValidator {
  private schema: GraphQLSchema;
  private options: Required<TypeValidationOptions>;

  constructor(schema: GraphQLSchema, options: TypeValidationOptions = {}) {
    this.schema = schema;
    this.options = {
      strict: false,
      warnOnMissing: true,
      validateEnums: true,
      validateRelations: true,
      customValidators: {},
      ...options
    };
  }

  /**
   * Validate a value against expected GraphQL type
   */
  static validate<T>(
    value: any,
    type: T,
    options: TypeValidationOptions,
    schema?: GraphQLSchema
  ): ValidationResult {
    if (!schema) {
      return {
        isValid: true,
        errors: [],
        warnings: [{
          field: 'schema',
          message: 'No GraphQL schema provided for validation',
          suggestion: 'Provide a GraphQL schema for comprehensive type validation',
          path: []
        }]
      };
    }

    const validator = new TypeValidator(schema, options);
    return validator.validateValue(value, type as any, []);
  }

  /**
   * Validate GraphQL selections against schema
   */
  static validateSelection(
    selection: any,
    expectedType: GraphQLType,
    schema: GraphQLSchema,
    path: string[] = []
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isObjectType(expectedType)) {
      if (selection && typeof selection === 'object') {
        errors.push({
          field: path.join('.'),
          expectedType: expectedType.toString(),
          actualType: typeof selection,
          message: `Expected scalar type ${expectedType.toString()}, got object`,
          path
        });
      }
      return errors;
    }

    const fields = expectedType.getFields();

    for (const [fieldName, fieldValue] of Object.entries(selection)) {
      const fieldDef = fields[fieldName];

      if (!fieldDef) {
        if (!path.includes(fieldName)) { // Avoid duplicate errors
          errors.push({
            field: fieldName,
            expectedType: 'Field',
            actualType: 'undefined',
            message: `Field '${fieldName}' does not exist on type ${expectedType.name}`,
            path: [...path, fieldName]
          });
        }
        continue;
      }

      if (typeof fieldValue === 'object' && fieldValue !== null) {
        const nestedErrors = this.validateSelection(
          fieldValue,
          fieldDef.type,
          schema,
          [...path, fieldName]
        );
        errors.push(...nestedErrors);
      }
    }

    return errors;
  }

  /**
   * Validate Prisma query result against GraphQL schema
   */
  validateResult(
    result: any,
    expectedType: GraphQLType,
    path: string[] = []
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateResultRecursive(result, expectedType, path, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate selections object
   */
  validateSelections(
    selections: any,
    typeName: string,
    path: string[] = []
  ): ValidationResult {
    const type = this.schema.getType(typeName);
    if (!type) {
      return {
        isValid: false,
        errors: [{
          field: typeName,
          expectedType: 'GraphQLType',
          actualType: 'undefined',
          message: `Type '${typeName}' not found in schema`,
          path
        }],
        warnings: []
      };
    }

    const errors = TypeValidator.validateSelection(selections, type, this.schema, path);

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateValue(
    value: any,
    expectedType: GraphQLType,
    path: string[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateValueRecursive(value, expectedType, path, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateValueRecursive(
    value: any,
    expectedType: GraphQLType,
    path: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Handle non-null types
    if (isNonNullType(expectedType)) {
      if (value === null || value === undefined) {
        errors.push({
          field: path.join('.'),
          expectedType: expectedType.toString(),
          actualType: 'null',
          message: `Expected non-null value for ${expectedType.toString()}`,
          path
        });
        return;
      }
      return this.validateValueRecursive(value, expectedType.ofType, path, errors, warnings);
    }

    // Handle null values for nullable types
    if (value === null || value === undefined) {
      return; // Valid for nullable types
    }

    // Handle list types
    if (isListType(expectedType)) {
      if (!Array.isArray(value)) {
        errors.push({
          field: path.join('.'),
          expectedType: expectedType.toString(),
          actualType: typeof value,
          message: `Expected array for ${expectedType.toString()}`,
          path
        });
        return;
      }

      for (let i = 0; i < value.length; i++) {
        this.validateValueRecursive(value[i], expectedType.ofType, [...path, i.toString()], errors, warnings);
      }
      return;
    }

    // Handle scalar types
    if (isScalarType(expectedType)) {
      this.validateScalarValue(value, expectedType.name, path, errors, warnings);
      return;
    }

    // Handle enum types
    if (isEnumType(expectedType)) {
      this.validateEnumValue(value, expectedType, path, errors, warnings);
      return;
    }

    // Handle object types
    if (isObjectType(expectedType)) {
      this.validateObjectValue(value, expectedType, path, errors, warnings);
      return;
    }

    // Unknown type - add warning
    warnings.push({
      field: path.join('.'),
      message: `Unknown GraphQL type: ${expectedType.toString()}`,
      suggestion: 'Check your GraphQL schema definition',
      path
    });
  }

  private validateScalarValue(
    value: any,
    scalarName: string,
    path: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (this.options.customValidators && this.options.customValidators[scalarName]) {
      const validator = this.options.customValidators[scalarName];
      const result = validator(value);
      
      if (result !== true) {
        const message = typeof result === 'string' ? result : `Invalid value for custom scalar ${scalarName}`;
        errors.push({
          field: path.join('.'),
          expectedType: scalarName,
          actualType: typeof value,
          message,
          path
        });
      }
      return;
    }

    const actualType = typeof value;

    switch (scalarName) {
      case 'ID':
      case 'String':
        if (actualType !== 'string') {
          errors.push({
            field: path.join('.'),
            expectedType: 'string',
            actualType,
            message: `Expected string for ${scalarName}`,
            path
          });
        }
        break;

      case 'Int':
        if (actualType !== 'number' || !Number.isInteger(value)) {
          errors.push({
            field: path.join('.'),
            expectedType: 'integer',
            actualType,
            message: `Expected integer for Int`,
            path
          });
        }
        break;

      case 'Float':
        if (actualType !== 'number') {
          errors.push({
            field: path.join('.'),
            expectedType: 'number',
            actualType,
            message: `Expected number for Float`,
            path
          });
        }
        break;

      case 'Boolean':
        if (actualType !== 'boolean') {
          errors.push({
            field: path.join('.'),
            expectedType: 'boolean',
            actualType,
            message: `Expected boolean for Boolean`,
            path
          });
        }
        break;

      default:
        // Custom scalar - add warning since we can't validate
        if (this.options.warnOnMissing) {
          warnings.push({
            field: path.join('.'),
            message: `Custom scalar '${scalarName}' validation not implemented`,
            suggestion: 'Implement custom scalar validation in TypeValidationOptions',
            path
          });
        }
    }
  }

  private validateEnumValue(
    value: any,
    enumType: any,
    path: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (!this.options.validateEnums) {
      return;
    }

    const values = enumType.getValues().map((v: any) => v.value);

    if (!values.includes(value)) {
      errors.push({
        field: path.join('.'),
        expectedType: enumType.name,
        actualType: typeof value,
        message: `Value '${value}' not valid for enum ${enumType.name}. Valid values: ${values.join(', ')}`,
        path
      });
    }
  }

  private validateObjectValue(
    value: any,
    objectType: GraphQLObjectType,
    path: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (typeof value !== 'object' || value === null) {
      errors.push({
        field: path.join('.'),
        expectedType: objectType.name,
        actualType: typeof value,
        message: `Expected object for ${objectType.name}`,
        path
      });
      return;
    }

    const fields = objectType.getFields();

    for (const [fieldName, fieldDef] of Object.entries(fields)) {
      const fieldValue = value[fieldName];

      if (fieldValue === undefined) {
        if (isNonNullType(fieldDef.type)) {
          errors.push({
            field: fieldName,
            expectedType: fieldDef.type.toString(),
            actualType: 'undefined',
            message: `Missing required field '${fieldName}'`,
            path: [...path, fieldName]
          });
        }
        continue;
      }

      this.validateValueRecursive(fieldValue, fieldDef.type, [...path, fieldName], errors, warnings);
    }

    // Check for extra fields not in schema
    for (const key of Object.keys(value)) {
      if (!fields[key] && this.options.strict) {
        warnings.push({
          field: key,
          message: `Extra field '${key}' not defined in ${objectType.name}`,
          suggestion: 'Remove extra fields or update GraphQL schema',
          path: [...path, key]
        });
      }
    }
  }

  private validateResultRecursive(
    result: any,
    expectedType: GraphQLType,
    path: string[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Similar to validateValueRecursive but focused on result validation
    this.validateValueRecursive(result, expectedType, path, errors, warnings);
  }
}

/**
 * Utility functions for type validation
 */
export class TypeValidationUtils {
  /**
   * Create a validation context for type checking
   */
  static createValidationContext(
    schema: GraphQLSchema,
    prismaClient?: any,
    options: TypeValidationOptions = {}
  ): TypeCheckContext {
    return {
      schema,
      prismaClient,
      strict: options.strict ?? false,
      path: []
    };
  }

  /**
   * Validate Prisma selection against GraphQL schema
   */
  static validatePrismaSelection(
    selection: any,
    graphqlTypeName: string,
    schema: GraphQLSchema
  ): ValidationResult {
    const validator = new TypeValidator(schema);
    return validator.validateSelections(selection, graphqlTypeName);
  }

  /**
   * Convert GraphQL validation errors to user-friendly messages
   */
  static formatValidationErrors(errors: ValidationError[]): string[] {
    return errors.map(error => {
      const path = error.path.length > 0 ? `${error.path.join('.')}.` : '';
      return `${path}${error.field}: ${error.message}`;
    });
  }

  /**
   * Check if a type is compatible with another type
   */
  static isTypeCompatible(
    actualType: GraphQLType,
    expectedType: GraphQLType,
    schema: GraphQLSchema
  ): boolean {
    // Basic compatibility check - could be enhanced
    if (actualType === expectedType) {
      return true;
    }

    // Handle non-null compatibility
    if (isNonNullType(actualType) && !isNonNullType(expectedType)) {
      return false; // Non-null cannot be assigned to nullable
    }

    if (!isNonNullType(actualType) && isNonNullType(expectedType)) {
      return false; // Nullable cannot be assigned to non-null
    }

    // For now, assume compatible if basic checks pass
    // More sophisticated type compatibility would require deeper analysis
    return true;
  }
}
