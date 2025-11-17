import type { FieldTransform, TransformContext } from './GQLPrismaSelect';

/**
 * Built-in field transformers for common field name transformations
 */
export class FieldTransformers {
  /**
   * Converts camelCase to snake_case
   */
  static camelToSnake(value: string): string {
    return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Converts snake_case to camelCase
   */
  static snakeToCamel(value: string): string {
    return value.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Converts a word to its plural form (basic implementation)
   */
  static pluralize(value: string): string {
    if (value.endsWith('y') && !/[aeiou]y$/i.test(value)) {
      return value.slice(0, -1) + 'ies';
    } else if (value.endsWith('s') || value.endsWith('sh') || value.endsWith('ch') || value.endsWith('x') || value.endsWith('z')) {
      return value + 'es';
    } else {
      return value + 's';
    }
  }

  /**
   * Converts a word to its singular form (basic implementation)
   */
  static singularize(value: string): string {
    if (value.endsWith('ies') && !/[aeiou]ies$/.test(value)) {
      return value.slice(0, -3) + 'y';
    } else if (value.endsWith('es')) {
      const base = value.slice(0, -2);
      if (base.endsWith('s') || base.endsWith('sh') || base.endsWith('ch') || base.endsWith('x') || base.endsWith('z')) {
        return base;
      }
    } else if (value.endsWith('s') && !value.endsWith('ss')) {
      return value.slice(0, -1);
    }
    return value;
  }

  /**
   * Adds a prefix to a field name
   */
  static prefix(prefix: string): (value: string) => string {
    return (value: string) => `${prefix}${value}`;
  }

  /**
   * Adds a suffix to a field name
   */
  static suffix(suffix: string): (value: string) => string {
    return (value: string) => `${value}${suffix}`;
  }

  /**
   * Converts field name to uppercase
   */
  static uppercase(value: string): string {
    return value.toUpperCase();
  }

  /**
   * Converts field name to lowercase
   */
  static lowercase(value: string): string {
    return value.toLowerCase();
  }
}

/**
 * Transformation engine for applying field transformations to selections
 */
export class TransformationEngine {
  private transforms: Map<string, FieldTransform> = new Map();
  private defaultTransforms: string[] = [];
  private caseSensitive = true;

  constructor(options: {
    fieldTransforms?: Record<string, FieldTransform>;
    defaultTransforms?: string[];
    caseSensitive?: boolean;
  } = {}) {
    this.caseSensitive = options.caseSensitive ?? true;

    if (options.fieldTransforms) {
      Object.entries(options.fieldTransforms).forEach(([field, transform]) => {
        this.transforms.set(this.normalizeKey(field), transform);
      });
    }

    this.defaultTransforms = options.defaultTransforms || [];
  }

  /**
   * Transforms field selections
   */
  transformSelections(selections: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(selections)) {
      const transformedKey = this.transformFieldName(key);
      if (typeof value === 'object' && value !== null) {
        result[transformedKey] = this.transformSelections(value);
      } else {
        result[transformedKey] = value;
      }
    }

    return result;
  }

  /**
   * Transforms a single field name
   */
  transformFieldName(graphqlName: string): string {
    // First check for explicit field transform
    const normalizedKey = this.normalizeKey(graphqlName);
    const explicitTransform = this.transforms.get(normalizedKey);

    if (explicitTransform) {
      if (typeof explicitTransform === 'string') {
        return explicitTransform;
      } else {
        // Function transform - return original name, will be applied during result transformation
        return graphqlName;
      }
    }

    // Apply default transforms
    let result = graphqlName;
    for (const transformName of this.defaultTransforms) {
      result = this.applyDefaultTransform(result, transformName);
    }

    return result;
  }

  /**
   * Transforms field values during result transformation
   */
  transformFieldValue(value: any, context: TransformContext): any {
    const normalizedKey = this.normalizeKey(context.fieldName);
    const transform = this.transforms.get(normalizedKey);

    if (typeof transform === 'function') {
      return transform(value, context);
    }

    return value;
  }

  /**
   * Transforms results back to GraphQL format
   */
  reverseTransform(result: any, selections: Record<string, any>): any {
    if (!result || typeof result !== 'object') {
      return result;
    }

    if (Array.isArray(result)) {
      return result.map(item => this.reverseTransform(item, selections));
    }

    const reversed: Record<string, any> = {};

    for (const [transformedKey, value] of Object.entries(result)) {
      // Find the original GraphQL field name
      const originalKey = this.findOriginalKey(transformedKey, selections) || transformedKey;

      // Check if there's a function transform for this field
      const normalizedKey = this.normalizeKey(originalKey);
      const transform = this.transforms.get(normalizedKey);

      let finalValue = value;

      // Apply function transform if it exists
      if (typeof transform === 'function') {
        const context: TransformContext = {
          fieldName: originalKey,
          modelName: '',
          selectionPath: [],
          originalValue: value
        };
        finalValue = transform(value, context);
      }

      if (typeof finalValue === 'object' && finalValue !== null) {
        // Check if this field has nested selections
        const nestedSelections = selections[originalKey];
        if (typeof nestedSelections === 'object') {
          reversed[originalKey] = this.reverseTransform(finalValue, nestedSelections);
        } else {
          reversed[originalKey] = finalValue;
        }
      } else {
        reversed[originalKey] = finalValue;
      }
    }

    return reversed;
  }

  private normalizeKey(key: string): string {
    return this.caseSensitive ? key : key.toLowerCase();
  }

  private applyDefaultTransform(value: string, transformName: string): string {
    switch (transformName) {
      case 'camelToSnake':
        return FieldTransformers.camelToSnake(value);
      case 'snakeToCamel':
        return FieldTransformers.snakeToCamel(value);
      case 'pluralize':
        return FieldTransformers.pluralize(value);
      case 'singularize':
        return FieldTransformers.singularize(value);
      default:
        return value;
    }
  }

  private findOriginalKey(transformedKey: string, selections: Record<string, any>): string | null {
    // Find the original key that maps to this transformed key
    for (const [originalKey, value] of Object.entries(selections)) {
      const transformed = this.transformFieldName(originalKey);
      if (transformed === transformedKey) {
        return originalKey;
      }
    }
    // If no exact match found, check if the transformed key matches any original key after transformation
    for (const [originalKey, value] of Object.entries(selections)) {
      if (originalKey === transformedKey) {
        return originalKey;
      }
    }
    return null;
  }
}

/**
 * Result transformer for bidirectional transformation
 */
export class ResultTransformer {
  private engine: TransformationEngine;

  constructor(engine: TransformationEngine) {
    this.engine = engine;
  }

  /**
   * Transforms result data back to GraphQL format
   */
  transform(result: any, selections: Record<string, any>): any {
    return this.engine.reverseTransform(result, selections);
  }

  /**
   * Transforms a single field value
   */
  transformField(value: any, fieldName: string, context: Partial<TransformContext> = {}): any {
    const fullContext: TransformContext = {
      fieldName,
      modelName: context.modelName || '',
      selectionPath: context.selectionPath || [],
      originalValue: value
    };

    return this.engine.transformFieldValue(value, fullContext);
  }

  /**
   * Transforms nested result data
   */
  transformNested(value: any, nestedSelections: Record<string, any>): any {
    return this.transform(value, nestedSelections);
  }
}
