import { Kind } from 'graphql/language/kinds';
import type { GraphQLResolveInfo } from '../../../types';

// Helper to create a field node with selections
export function createFieldNode(
  name: string,
  selections: any[] = []
): any {
  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: name,
    },
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

// Main factory function to create mock GraphQLResolveInfo
// fieldNodes should be the actual field selections (e.g., [id, email])
// They will be wrapped in a parent field node with a selectionSet
export function createMockGraphQLInfo(
  fieldNodes: any[],
  fragments: Record<string, any> = {}
): GraphQLResolveInfo {
  // Wrap fieldNodes in a parent field node with selectionSet
  // This represents the query field (e.g., "user") that contains the selections
  const parentFieldNode = {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: 'query',
    },
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: fieldNodes,
    },
  };

  return {
    fieldName: 'query',
    fieldNodes: [parentFieldNode],
    fragments,
    returnType: {} as any,
    parentType: {} as any,
    path: {
      key: 'query',
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

