import { GQLPrismaSelect } from '../GQLPrismaSelect';
import {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLBoolean,
  GraphQLNonNull,
  GraphQLList,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLScalarType,
  Kind,
  GraphQLDirective,
  DirectiveLocation,
} from 'graphql';
import {
  createMockGraphQLInfo,
  createFieldNode,
} from './helpers/mockGraphQLInfo';
import {
  buildSimpleSelection,
  buildNestedSelection,
} from './helpers/testBuilders';

describe('Phase 1.2: GraphQL Schema Validation', () => {
  describe('Schema evolution scenarios (field additions/removals)', () => {
    it('should handle field additions in schema evolution', () => {
      // Original schema
      const originalUserType = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      });

      const originalSchema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: originalUserType },
          },
        }),
      });

      // Create GraphQL info based on original schema
      const fieldNodes = buildSimpleSelection(['id', 'name', 'email']); // email doesn't exist in original
      const info = createMockGraphQLInfo(fieldNodes);

      // Should handle gracefully when schema evolves
      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.select?.id).toBe(true);
      expect(result.select?.name).toBe(true);
      expect(result.select?.email).toBe(true); // Should still include even if not in current schema
    });

    it('should handle field removals in schema evolution', () => {
      // Schema with deprecated field
      const userTypeWithDeprecated = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
          deprecatedField: {
            type: GraphQLString,
            deprecationReason: 'Field removed in v2.0',
          },
        },
      });

      const schemaWithDeprecated = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: userTypeWithDeprecated },
          },
        }),
      });

      // Query includes deprecated field
      const fieldNodes = buildSimpleSelection(['id', 'name', 'deprecatedField']);
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.select?.id).toBe(true);
      expect(result.select?.name).toBe(true);
      expect(result.select?.deprecatedField).toBe(true); // Should still process deprecated fields
    });

    it('should handle type changes in schema evolution', () => {
      // Original: age as string, evolved: age as int
      const userTypeV1 = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          age: { type: GraphQLString }, // Originally a string
        },
      });

      const schemaV1 = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: userTypeV1 },
          },
        }),
      });

      // Query expecting string age
      const fieldNodes = buildSimpleSelection(['id', 'age']);
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.select?.id).toBe(true);
      expect(result.select?.age).toBe(true); // Should work regardless of type changes
    });
  });

  describe('Union type handling in selections', () => {
    it('should handle union type selections', () => {
      const userType = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
        },
      });

      const postType = new GraphQLObjectType({
        name: 'Post',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          title: { type: new GraphQLNonNull(GraphQLString) },
        },
      });

      const searchResultUnion = new GraphQLUnionType({
        name: 'SearchResult',
        types: [userType, postType],
        resolveType: (value: any) => {
          return value.__typename === 'User' ? 'User' : 'Post';
        },
      });

      const schemaWithUnion = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            search: { type: new GraphQLList(searchResultUnion) },
          },
        }),
      });

      // Query union type fields
      const fieldNodes = [
        createFieldNode('search', [
          createFieldNode('...on User', [createFieldNode('id'), createFieldNode('name')]),
          createFieldNode('...on Post', [createFieldNode('id'), createFieldNode('title')]),
        ]),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result).toBeDefined();
      expect(result.select || result.include).toBeDefined();
    });

    it('should handle inline fragment spreads on union types', () => {
      const mediaType = new GraphQLUnionType({
        name: 'Media',
        types: [
          new GraphQLObjectType({
            name: 'Image',
            fields: { url: { type: GraphQLString }, width: { type: GraphQLInt } },
          }),
          new GraphQLObjectType({
            name: 'Video',
            fields: { url: { type: GraphQLString }, duration: { type: GraphQLInt } },
          }),
        ],
        resolveType: (value) => value.type === 'image' ? 'Image' : 'Video',
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            media: { type: mediaType },
          },
        }),
      });

      // Complex union query with inline fragments
      const fieldNodes = [
        createFieldNode('media', [
          createFieldNode('url'), // Common field
          {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'Image' } },
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [createFieldNode('width')],
            },
          },
          {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'Video' } },
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [createFieldNode('duration')],
            },
          },
        ]),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.include?.media || result.select?.media).toBeDefined();
    });
  });

  describe('Interface implementation validation', () => {
    it('should handle interface implementations correctly', () => {
    const nodeInterface = new GraphQLInterfaceType({
      name: 'Node',
      fields: {
        id: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolveType: (value: any) => {
        if (value.__typename === 'User') return 'User';
        if (value.__typename === 'Post') return 'Post';
        return undefined;
      },
    });

      const userType = new GraphQLObjectType({
        name: 'User',
        interfaces: [nodeInterface],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: GraphQLString },
        },
      });

      const postType = new GraphQLObjectType({
        name: 'Post',
        interfaces: [nodeInterface],
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          title: { type: new GraphQLNonNull(GraphQLString) },
          content: { type: GraphQLString },
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            node: { type: nodeInterface },
            nodes: { type: new GraphQLList(nodeInterface) },
          },
        }),
      });

      // Query interface fields
      const fieldNodes = [
        createFieldNode('node', [createFieldNode('id')]),
        createFieldNode('nodes', [createFieldNode('id')]),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      // Interface queries result in include objects
      expect(result.include?.node || result.select?.node).toBeDefined();
      expect(result.include?.nodes || result.select?.nodes).toBeDefined();
    });

    it('should handle interface inline fragments', () => {
      const searchableInterface = new GraphQLInterfaceType({
        name: 'Searchable',
        fields: {
          searchPreview: { type: GraphQLString },
        },
      });

      const userType = new GraphQLObjectType({
        name: 'User',
        interfaces: [searchableInterface],
        fields: {
          searchPreview: { type: GraphQLString },
          name: { type: new GraphQLNonNull(GraphQLString) },
          email: { type: GraphQLString },
        },
      });

      const documentType = new GraphQLObjectType({
        name: 'Document',
        interfaces: [searchableInterface],
        fields: {
          searchPreview: { type: GraphQLString },
          title: { type: new GraphQLNonNull(GraphQLString) },
          content: { type: GraphQLString },
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            search: { type: new GraphQLList(searchableInterface) },
          },
        }),
      });

      // Query with interface inline fragments
      const fieldNodes = [
        createFieldNode('search', [
          createFieldNode('searchPreview'),
          {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'User' } },
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [createFieldNode('name'), createFieldNode('email')],
            },
          },
          {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: 'Document' } },
            selectionSet: {
              kind: Kind.SELECTION_SET,
              selections: [createFieldNode('title'), createFieldNode('content')],
            },
          },
        ]),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.include?.search || result.select?.search).toBeDefined();
    });
  });

  describe('Custom scalar type handling', () => {
    it('should handle custom scalar types', () => {
      const dateScalar = new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        serialize: (value: any) => value.toISOString(),
        parseValue: (value: any) => new Date(value),
        parseLiteral: (ast) => {
          if (ast.kind === Kind.STRING) {
            return new Date(ast.value);
          }
          return null;
        },
      });

      const jsonScalar = new GraphQLScalarType({
        name: 'JSON',
        description: 'JSON custom scalar type',
        serialize: (value: any) => JSON.stringify(value),
        parseValue: (value: any) => JSON.parse(value),
        parseLiteral: (ast) => {
          if (ast.kind === Kind.STRING) {
            return JSON.parse(ast.value);
          }
          return null;
        },
      });

      const userType = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          createdAt: { type: dateScalar },
          metadata: { type: jsonScalar },
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: userType },
          },
        }),
      });

      // Query custom scalar fields
      const fieldNodes = buildSimpleSelection(['id', 'createdAt', 'metadata']);
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.select?.id).toBe(true);
      expect(result.select?.createdAt).toBe(true);
      expect(result.select?.metadata).toBe(true);
    });

    it('should handle complex custom scalars in nested structures', () => {
      const uuidScalar = new GraphQLScalarType({
        name: 'UUID',
        serialize: (value) => value,
        parseValue: (value) => value,
        parseLiteral: (ast) => ast.kind === Kind.STRING ? ast.value : null,
      });

      const pointScalar = new GraphQLScalarType({
        name: 'Point',
        description: 'Geographic point as [longitude, latitude]',
        serialize: (value) => value,
        parseValue: (value) => value,
        parseLiteral: (ast) => {
          if (ast.kind === Kind.LIST) {
            return ast.values.map(v => v.kind === Kind.FLOAT ? v.value : null);
          }
          return null;
        },
      });

      const locationType = new GraphQLObjectType({
        name: 'Location',
        fields: {
          id: { type: uuidScalar },
          coordinates: { type: pointScalar },
          address: { type: GraphQLString },
        },
      });

      const userType = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          homeLocation: { type: locationType },
          workLocation: { type: locationType },
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: userType },
          },
        }),
      });

      // Query nested custom scalars
      const fieldNodes = [
        createFieldNode('user', [
          createFieldNode('id'),
          createFieldNode('homeLocation', [
            createFieldNode('id'),
            createFieldNode('coordinates'),
            createFieldNode('address'),
          ]),
          createFieldNode('workLocation', [
            createFieldNode('id'),
            createFieldNode('coordinates'),
            createFieldNode('address'),
          ]),
        ]),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.include?.user || result.select?.user).toBeDefined();
      expect(typeof (result.include?.user || result.select?.user)).toBe('object');
    });
  });

  describe('Directive processing and validation', () => {
    it('should handle schema with directives', () => {
      const deprecatedDirective = new GraphQLDirective({
        name: 'deprecated',
        locations: [DirectiveLocation.FIELD_DEFINITION],
        args: {
          reason: { type: GraphQLString },
        },
      });

      const userType = new GraphQLObjectType({
        name: 'User',
        fields: {
          id: { type: new GraphQLNonNull(GraphQLString) },
          oldField: {
            type: GraphQLString,
            deprecationReason: 'Use newField instead',
          },
          newField: { type: GraphQLString },
        },
      });

      const schema = new GraphQLSchema({
        query: new GraphQLObjectType({
          name: 'Query',
          fields: {
            user: { type: userType },
          },
        }),
        directives: [deprecatedDirective],
      });

      // Query deprecated and regular fields
      const fieldNodes = buildSimpleSelection(['id', 'oldField', 'newField']);
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      expect(result.select || result.include).toBeDefined();
      expect(result.select?.id).toBe(true);
      expect(result.select?.oldField).toBe(true); // Should still process deprecated fields
      expect(result.select?.newField).toBe(true);
    });
  });
});
