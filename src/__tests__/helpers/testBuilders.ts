import {
  createFieldNode,
  createFragmentSpreadNode,
  createFragmentDefinition,
  createMockGraphQLInfo,
} from './mockGraphQLInfo';

// Builder for creating simple field selections
export function buildSimpleSelection(fields: string[]) {
  return fields.map((field) => createFieldNode(field));
}

// Builder for creating nested selections
export function buildNestedSelection(
  fieldName: string,
  nestedFields: string[]
) {
  const nestedSelections = buildSimpleSelection(nestedFields);
  return createFieldNode(fieldName, nestedSelections);
}

// Builder for creating complex nested structures
export function buildComplexSelection(
  structure: Record<string, string[] | Record<string, string[]>>
) {
  return Object.entries(structure).map(([fieldName, nested]) => {
    if (Array.isArray(nested)) {
      return createFieldNode(fieldName, buildSimpleSelection(nested));
    } else {
      const nestedSelections = Object.entries(nested).map(
        ([nestedFieldName, nestedFields]) =>
          createFieldNode(nestedFieldName, buildSimpleSelection(nestedFields))
      );
      return createFieldNode(fieldName, nestedSelections);
    }
  });
}

// Builder for creating GraphQL info with fragments
export function buildGraphQLInfoWithFragments(
  fieldNodes: any[],
  fragmentDefinitions: Array<{ name: string; selections: any[] }> = []
) {
  const fragments: Record<string, any> = {};
  fragmentDefinitions.forEach(({ name, selections }) => {
    fragments[name] = createFragmentDefinition(name, selections);
  });
  return createMockGraphQLInfo(fieldNodes, fragments);
}

// Helper to assert select/include structure
export function expectSelectStructure(
  result: any,
  expectedFields: string[]
) {
  expect(result.select).toBeDefined();
  expect(result.include).toBeUndefined();
  expectedFields.forEach((field) => {
    expect(result.select[field]).toBe(true);
  });
}

export function expectIncludeStructure(
  result: any,
  expectedStructure: Record<string, any>
) {
  expect(result.include).toBeDefined();
  expect(result.select).toBeUndefined();
  Object.entries(expectedStructure).forEach(([field, nested]) => {
    expect(result.include[field]).toBeDefined();
    if (typeof nested === 'object') {
      expect(result.include[field]).toEqual(nested);
    }
  });
}

