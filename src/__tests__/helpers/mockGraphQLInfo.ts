import { Kind } from 'graphql/language/kinds';
import type { GraphQLResolveInfo } from '../../../types';

// Helper to create a field node with selections
export function createFieldNode(
  name: string,
  selections: any[] = [],
  args: any[] = []
): any {
  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    arguments: args.map(arg => {
      const createValueNode = (value: any): any => {
        if (typeof value === 'number') {
          return { kind: Kind.INT, value: value.toString() };
        } else if (typeof value === 'boolean') {
          return { kind: Kind.BOOLEAN, value: value };
        } else if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
             return {
               kind: Kind.LIST,
               values: value.map(createValueNode)
             };
          }
          return {
            kind: Kind.OBJECT,
            fields: Object.entries(value).map(([k, v]) => ({
              kind: Kind.OBJECT_FIELD,
              name: { kind: Kind.NAME, value: k },
              value: createValueNode(v)
            }))
          };
        }
        // Default to string (or enum if we want to be precise, but string is safer for generic tests)
        return { kind: Kind.STRING, value: value };
      };

      return {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: arg.name },
        value: createValueNode(arg.value)
      };
    }),
    selectionSet: selections.length > 0
      ? {
          kind: Kind.SELECTION_SET,
          selections,
        }
      : undefined,
  };
}

// Helper to create a fragment spread node
export function createFragmentSpreadNode(name: string): any {
  return {
    kind: Kind.FRAGMENT_SPREAD,
    name: {
      kind: Kind.NAME,
      value: name,
    },
  };
}

// Helper to create a fragment definition
export function createFragmentDefinition(
  name: string,
  selections: any[]
): any {
  return {
    kind: Kind.FRAGMENT_DEFINITION,
    name: {
      kind: Kind.NAME,
      value: name,
    },
    typeCondition: {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: 'User',
      },
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections,
    },
  };
}

// Helper to parse a simple selections string into field nodes
function parseSelectionsString(selectionsString: string): any[] {
  const lines = selectionsString.trim().split('\n').map(line => line.trim()).filter(line => line);
  const fieldNodes: any[] = [];

  for (const line of lines) {
    // Remove trailing commas and braces
    const cleanLine = line.replace(/[,\s]+$/, '').replace(/[{}]/g, '');

    if (cleanLine) {
      const fieldNode = {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: cleanLine,
        },
      };
      fieldNodes.push(fieldNode);
    }
  }

  return fieldNodes;
}

// Main factory function to create mock GraphQLResolveInfo
// Can accept either an array of field nodes or an options object
export function createMockGraphQLInfo(
  options: any[] | { fieldName: string; selections: string; fragments?: Record<string, any> },
  fragments?: Record<string, any>
): GraphQLResolveInfo {
  let fieldName = 'query';
  let fieldNodes: any[];

  // Handle different input formats
  if (Array.isArray(options)) {
    // Legacy format: array of field nodes
    fieldNodes = options;
  } else {
    // New format: options object
    fieldName = options.fieldName;
    fieldNodes = parseSelectionsString(options.selections);
    fragments = options.fragments || fragments || {};
  }

  // Wrap fieldNodes in a parent field node with selectionSet
  // This represents the query field (e.g., "user") that contains the selections
  const parentFieldNode = {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: fieldName,
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: fieldNodes,
    },
  };

  return {
    fieldName,
    fieldNodes: [parentFieldNode],
    fragments,
    returnType: {} as any,
    parentType: {} as any,
    path: {
      key: fieldName,
      prev: undefined,
      typename: 'Query',
    },
    schema: {} as any,
    rootValue: {},
    operation: {
      kind: Kind.OPERATION_DEFINITION,
      operation: 'query',
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [parentFieldNode],
      },
    } as any,
    variableValues: {},
    cacheControl: {
      cacheHint: {
        maxAge: undefined,
        scope: undefined,
        replace: () => {},
        restrict: () => {},
        policyIfCacheable: () => null,
      },
      setCacheHint: () => {},
      cacheHintFromType: () => undefined,
    },
  } as GraphQLResolveInfo;
}

