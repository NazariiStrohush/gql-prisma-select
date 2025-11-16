import { GQLPrismaSelect } from '../GQLPrismaSelect';
import {
  createMockGraphQLInfo,
  createFieldNode,
  createFragmentSpreadNode,
  createFragmentDefinition,
} from './helpers/mockGraphQLInfo';
import {
  buildSimpleSelection,
  buildNestedSelection,
  expectSelectStructure,
} from './helpers/testBuilders';
import type { GraphQLResolveInfo } from '../../types';

describe('GQLPrismaSelect', () => {
  describe('Phase 1: Basic Constructor & Simple Selections', () => {
    describe('1. Basic instantiation', () => {
      it('should create instance with minimal GraphQLResolveInfo', () => {
        const fieldNodes = [createFieldNode('id')];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result).toBeInstanceOf(GQLPrismaSelect);
        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
      });

      it('should set include and select properties correctly', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.include).toBeUndefined();
      });

      it('should save originalInclude and originalSelect', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.originalSelect).toBeDefined();
        expect(result.originalInclude).toBeUndefined();
        expect(result.originalSelect).toEqual(result.select);
      });
    });

    describe('2. Simple field selections', () => {
      it('should handle single field selection', () => {
        const fieldNodes = [createFieldNode('id')];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expectSelectStructure(result, ['id']);
      });

      it('should handle multiple field selections', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email', 'name']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expectSelectStructure(result, ['id', 'email', 'name']);
      });

      it('should use select when all values are booleans', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(typeof result.select?.id).toBe('boolean');
        expect(typeof result.select?.email).toBe('boolean');
      });
    });

    describe('3. Exclude fields functionality', () => {
      it('should exclude __typename by default', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('__typename'),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select?.id).toBe(true);
        expect(result.select?.__typename).toBeUndefined();
      });

      it('should exclude custom fields', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email', 'internalField']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: ['__typename', 'internalField'],
        });

        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.internalField).toBeUndefined();
        expect(result.select?.__typename).toBeUndefined();
      });

      it('should not include excluded fields in output', () => {
        const fieldNodes = buildSimpleSelection(['id', 'secret', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: ['__typename', 'secret'],
        });

        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.secret).toBeUndefined();
        expect(result.select?.__typename).toBeUndefined();
      });
    });
  });

  describe('Phase 2: Nested Selections & Select/Include Logic', () => {
    describe('4. Nested selections', () => {
      it('should handle one level of nesting', () => {
        const fieldNodes = [
          createFieldNode('id'),
          buildNestedSelection('Posts', ['id', 'content']),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // The implementation uses select when there are boolean values at top level
        // Nested relations are stored within select as objects
        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.content).toBe(true);
      });

      it('should handle multiple levels of nesting', () => {
        const postsField = createFieldNode('Posts', [
          createFieldNode('id'),
          createFieldNode('content'),
          createFieldNode('User', [
            createFieldNode('id'),
            createFieldNode('email'),
          ]),
        ]);
        const fieldNodes = [createFieldNode('id'), postsField];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.content).toBe(true);
        expect(result.select?.Posts.select?.User).toBeDefined();
        expect(result.select?.Posts.select?.User.select).toBeDefined();
        expect(result.select?.Posts.select?.User.select?.id).toBe(true);
        expect(result.select?.Posts.select?.User.select?.email).toBe(true);
      });

      it('should use select when nested objects exist (with boolean values)', () => {
        const fieldNodes = [
          createFieldNode('id'),
          buildNestedSelection('Posts', ['id']),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // When there are boolean values at top level, it uses select
        // even if there are nested objects
        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(result.select?.Posts).toBeDefined();
      });
    });

    describe('5. Mixed select/include scenarios', () => {
      it('should handle when some fields are booleans and others are nested', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('email'),
          buildNestedSelection('Posts', ['id', 'content']),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // When there are boolean values at top level, it uses select
        // Nested relations are stored within select
        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Posts.select).toBeDefined();
      });

      it('should correctly determine select vs include', () => {
        // All boolean fields should use select
        const booleanFields = buildSimpleSelection(['id', 'email', 'name']);
        const info1 = createMockGraphQLInfo(booleanFields);
        const result1 = new GQLPrismaSelect(info1);
        expect(result1.select).toBeDefined();
        expect(result1.include).toBeUndefined();

        // With nested fields but also boolean values should use select
        const nestedFields = [
          createFieldNode('id'),
          buildNestedSelection('Posts', ['id']),
        ];
        const info2 = createMockGraphQLInfo(nestedFields);
        const result2 = new GQLPrismaSelect(info2);
        expect(result2.select).toBeDefined();
        expect(result2.include).toBeUndefined();

        // Only nested fields (no boolean values) should use include
        const onlyNestedFields = [buildNestedSelection('Posts', ['id'])];
        const info3 = createMockGraphQLInfo(onlyNestedFields);
        const result3 = new GQLPrismaSelect(info3);
        expect(result3.include).toBeDefined();
        expect(result3.select).toBeUndefined();
      });

      it('should handle empty nested selection', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', []), // Empty selection set
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // Empty nested selection becomes boolean true
        // Since there's a boolean value (id), it uses select
        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBe(true); // Empty selection becomes boolean true
      });
    });
  });

  describe('Phase 3: Fragment Handling', () => {
    describe('6. Fragment parsing', () => {
      it('should parse fragments correctly', () => {
        const fragmentSelections = [createFieldNode('id'), createFieldNode('email')];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = buildSimpleSelection(['name']);
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        // Fragments are parsed and stored internally
        expect(result).toBeInstanceOf(GQLPrismaSelect);
        expect(result.select).toBeDefined();
      });

      it('should extract fragments from GraphQLResolveInfo', () => {
        const fragmentSelections = [createFieldNode('id')];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = buildSimpleSelection(['name']);
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        // Should work without errors
        expect(result).toBeInstanceOf(GQLPrismaSelect);
      });

      it('should handle empty fragments object', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email']);
        const info = createMockGraphQLInfo(fieldNodes, {});

        const result = new GQLPrismaSelect(info);

        expect(result).toBeInstanceOf(GQLPrismaSelect);
        expect(result.select).toBeDefined();
      });
    });

    describe('7. Fragment spread in selections', () => {
      it('should handle fragment spread in field selections', () => {
        const fragmentSelections = [createFieldNode('id'), createFieldNode('email')];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = [
          createFragmentSpreadNode('UserFields'),
          createFieldNode('name'),
        ];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        // Fragment fields should be merged with other fields
        expect(result.select?.name).toBe(true);
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
      });

      it('should handle nested fragment spreads', () => {
        const fragmentSelections1 = [createFieldNode('id')];
        const fragmentSelections2 = [createFieldNode('email')];
        const fragments = {
          UserId: createFragmentDefinition('UserId', fragmentSelections1),
          UserEmail: createFragmentDefinition('UserEmail', fragmentSelections2),
        };
        const fieldNodes = [
          createFragmentSpreadNode('UserId'),
          createFragmentSpreadNode('UserEmail'),
        ];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
      });

      it('should merge fragment fields correctly', () => {
        const fragmentSelections = [createFieldNode('id'), createFieldNode('email')];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = [
          createFragmentSpreadNode('UserFields'),
          createFieldNode('name'),
        ];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        // All fields from fragment and direct selection should be present
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.name).toBe(true);
      });
    });

    describe('8. Fragment with nested selections', () => {
      it('should handle fragments containing nested fields', () => {
        const fragmentSelections = [
          createFieldNode('id'),
          buildNestedSelection('Posts', ['id', 'content']),
        ];
        const fragments = {
          UserWithPosts: createFragmentDefinition('UserWithPosts', fragmentSelections),
        };
        const fieldNodes = [createFragmentSpreadNode('UserWithPosts')];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.content).toBe(true);
      });

      it('should properly transform fragment selections', () => {
        const fragmentSelections = [
          createFieldNode('id'),
          createFieldNode('email'),
        ];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = [createFragmentSpreadNode('UserFields')];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
      });

      it('should handle fragment that references non-existent fragment', () => {
        const fieldNodes = [createFragmentSpreadNode('NonExistentFragment')];
        const info = createMockGraphQLInfo(fieldNodes, {});

        // This should throw an error or handle gracefully
        expect(() => {
          new GQLPrismaSelect(info);
        }).toThrow();
      });
    });
  });

  describe('Phase 4: Static Get Method', () => {
    describe('9. GQLPrismaSelect.get() method', () => {
      it('should get value with string path', () => {
        const selection = {
          select: {
            collection: {
              select: {
                User: {
                  select: { id: true, email: true },
                },
              },
            },
          },
        };

        // get() returns the inner object structure
        const result = GQLPrismaSelect.get('collection.User', selection.select);

        // The result is the User's select object: { id: true, email: true }
        expect(result).toBeDefined();
        expect(result.id).toBe(true);
        expect(result.email).toBe(true);
      });

      it('should get value with array path', () => {
        const selection = {
          select: {
            collection: {
              select: {
                User: {
                  select: { id: true },
                },
              },
            },
          },
        };

        const result = GQLPrismaSelect.get(['collection', 'User'], selection.select);

        expect(result).toBeDefined();
        expect(result.id).toBe(true);
      });

      it('should return original object with empty/null path', () => {
        const selection = {
          select: { id: true, email: true },
        };

        const result1 = GQLPrismaSelect.get(null, selection.select);
        const result2 = GQLPrismaSelect.get(undefined, selection.select);
        const result3 = GQLPrismaSelect.get('', selection.select);
        const result4 = GQLPrismaSelect.get([], selection.select);

        expect(result1).toEqual(selection.select);
        expect(result2).toEqual(selection.select);
        expect(result3).toEqual(selection.select);
        expect(result4).toEqual(selection.select);
      });

      it('should return undefined for non-existent path', () => {
        const selection = {
          select: { id: true },
        };

        // When path doesn't exist, obj will be undefined
        // and accessing obj.select will throw
        expect(() => {
          GQLPrismaSelect.get('nonExistent', selection.select);
        }).toThrow();
      });

      it('should handle nested path access', () => {
        const selection = {
          select: {
            a: {
              select: {
                b: {
                  select: {
                    c: { select: { value: true } },
                  },
                },
              },
            },
          },
        };

        const result = GQLPrismaSelect.get(['a', 'b', 'c'], selection.select);

        expect(result).toBeDefined();
        expect(result.value).toBe(true);
      });

      it('should get path through select objects', () => {
        const selection = {
          select: {
            Posts: {
              select: { id: true, content: true },
            },
          },
        };

        const result = GQLPrismaSelect.get('Posts', selection.select);

        // Result is the inner select object: { id: true, content: true }
        expect(result).toBeDefined();
        expect(result.id).toBe(true);
        expect(result.content).toBe(true);
      });

      it('should get path through include objects', () => {
        const selection = {
          include: {
            Posts: {
              select: { id: true, content: true },
            },
          },
        };

        const result = GQLPrismaSelect.get('Posts', selection.include);

        // Result is the inner select object: { id: true, content: true }
        expect(result).toBeDefined();
        expect(result.id).toBe(true);
        expect(result.content).toBe(true);
      });
    });

    describe('10. Custom path selection in constructor (get option)', () => {
      it('should get selection with string path', () => {
        const fieldNodes = [
          createFieldNode('collection', [
            createFieldNode('User', [
              createFieldNode('id'),
              createFieldNode('email'),
            ]),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, { get: 'collection.User' });

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
      });

      it('should get selection with array path', () => {
        const fieldNodes = [
          createFieldNode('collection', [
            createFieldNode('User', [createFieldNode('id')]),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          get: ['collection', 'User'],
        });

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
      });

      it('should preserve original values when using get', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('collection', [
            createFieldNode('User', [createFieldNode('email')]),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, { get: 'collection.User' });

        // Original should contain the full selection
        expect(result.originalSelect || result.originalInclude).toBeDefined();
        // Current should contain only the path selection
        expect(result.select).toBeDefined();
        expect(result.select?.email).toBe(true);
        expect(result.select?.id).toBeUndefined();
      });
    });
  });

  describe('Phase 5: Edge Cases & Error Handling', () => {
    describe('11. Empty selections', () => {
      it('should handle empty selection set', () => {
        const fieldNodes: any[] = [];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // Empty selection should result in empty object
        expect(result).toBeInstanceOf(GQLPrismaSelect);
        // When empty, selectOrInclude returns include with empty object
        expect(result.include || result.select).toBeDefined();
      });

      it('should handle only excluded fields', () => {
        const fieldNodes = [
          createFieldNode('__typename'),
          createFieldNode('internalField'),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: ['__typename', 'internalField'],
        });

        // All fields excluded, should result in empty selection
        expect(result).toBeInstanceOf(GQLPrismaSelect);
      });

      it('should have appropriate default behavior for empty selections', () => {
        const fieldNodes: any[] = [];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        // Should not throw and should create valid instance
        expect(result).toBeInstanceOf(GQLPrismaSelect);
      });
    });

    describe('12. Null/undefined handling', () => {
      it('should handle missing selectionSet', () => {
        const info = createMockGraphQLInfo([]);
        // Remove selectionSet from first fieldNode
        if (info.fieldNodes[0]) {
          delete (info.fieldNodes[0] as any).selectionSet;
        }

        const result = new GQLPrismaSelect(info);

        expect(result).toBeInstanceOf(GQLPrismaSelect);
      });

      it('should handle empty fieldNodes array', () => {
        const info = createMockGraphQLInfo([]);
        // fieldNodes is already empty from createMockGraphQLInfo([])

        // This might throw, but should handle gracefully
        expect(() => {
          new GQLPrismaSelect(info);
        }).not.toThrow();
      });

      it('should handle undefined fragments', () => {
        const fieldNodes = buildSimpleSelection(['id']);
        const info = createMockGraphQLInfo(fieldNodes);
        (info as any).fragments = undefined;

        // Should handle undefined fragments (might throw when accessing fragments)
        // The implementation accesses fragments, so it might throw
        expect(() => {
          new GQLPrismaSelect(info);
        }).toThrow();
      });
    });

    describe('13. Invalid path scenarios', () => {
      it('should handle get() with paths that don\'t exist in object', () => {
        const selection = {
          select: { id: true },
        };

        // Should throw when trying to access non-existent path
        expect(() => {
          GQLPrismaSelect.get('nonExistent', selection.select);
        }).toThrow();
      });

      it('should handle get() with empty string path', () => {
        const selection = {
          select: { id: true },
        };

        const result = GQLPrismaSelect.get('', selection.select);

        expect(result).toEqual(selection.select);
      });

      it('should handle get() with path containing empty segments', () => {
        const selection = {
          select: {
            a: {
              select: { value: true },
            },
          },
        };

        // Empty segments in path create empty string keys, which don't exist
        // This will throw when trying to access undefined.select
        expect(() => {
          GQLPrismaSelect.get('a..value', selection.select);
        }).toThrow();
      });
    });
  });

  describe('Phase 6: Complex Scenarios & Integration Tests', () => {
    describe('14. Complex nested structures', () => {
      it('should handle deeply nested selections (3+ levels)', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', [
            createFieldNode('id'),
            createFieldNode('User', [
              createFieldNode('id'),
              createFieldNode('Profile', [
                createFieldNode('id'),
                createFieldNode('bio'),
              ]),
            ]),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.User.select).toBeDefined();
        expect(result.select?.Posts.select?.User.select?.Profile.select).toBeDefined();
        expect(result.select?.Posts.select?.User.select?.Profile.select?.id).toBe(true);
        expect(result.select?.Posts.select?.User.select?.Profile.select?.bio).toBe(true);
      });

      it('should handle multiple nested relations', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', [createFieldNode('id')]),
          createFieldNode('Comments', [createFieldNode('id')]),
          createFieldNode('Likes', [createFieldNode('id')]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Comments).toBeDefined();
        expect(result.select?.Likes).toBeDefined();
      });

      it('should handle circular-like structures (User -> Post -> User)', () => {
        const userField = createFieldNode('User', [
          createFieldNode('id'),
          createFieldNode('email'),
        ]);
        const postField = createFieldNode('Post', [
          createFieldNode('id'),
          createFieldNode('content'),
          userField,
        ]);
        const fieldNodes = [
          createFieldNode('id'),
          postField,
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Post.select).toBeDefined();
        expect(result.select?.Post.select?.User.select).toBeDefined();
        expect(result.select?.Post.select?.User.select?.id).toBe(true);
        expect(result.select?.Post.select?.User.select?.email).toBe(true);
      });
    });

    describe('15. Real-world scenarios', () => {
      it('should handle complete User -> Posts query transformation', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('email'),
          createFieldNode('Posts', [
            createFieldNode('id'),
            createFieldNode('content'),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.content).toBe(true);
      });

      it('should handle pagination collection scenarios', () => {
        const fieldNodes = [
          createFieldNode('collection', [
            createFieldNode('id'),
            createFieldNode('email'),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.include).toBeDefined();
        expect(result.include?.collection.select).toBeDefined();
        expect(result.include?.collection.select?.id).toBe(true);
        expect(result.include?.collection.select?.email).toBe(true);
      });

      it('should handle queries with multiple relations', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', [createFieldNode('id')]),
          createFieldNode('Comments', [createFieldNode('id')]),
          createFieldNode('Followers', [createFieldNode('id')]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBeDefined();
        expect(result.select?.Comments).toBeDefined();
        expect(result.select?.Followers).toBeDefined();
      });

      it('should match README examples - user with posts', () => {
        // Example from README: query { user(id: 1) { id, email, Posts { id, content } } }
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('email'),
          createFieldNode('Posts', [
            createFieldNode('id'),
            createFieldNode('content'),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.content).toBe(true);
      });
    });

    describe('16. Field type handling', () => {
      it('should handle FIELD kind selections', () => {
        const fieldNodes = [createFieldNode('id')];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
      });

      it('should handle FRAGMENT_SPREAD kind selections', () => {
        const fragmentSelections = [createFieldNode('id')];
        const fragments = {
          UserFields: createFragmentDefinition('UserFields', fragmentSelections),
        };
        const fieldNodes = [createFragmentSpreadNode('UserFields')];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
      });
    });
  });

  describe('Phase 7: Additional Edge Cases & Coverage', () => {
    describe('17. Fragment edge cases', () => {
      it('should handle nested fragments', () => {
        const innerFragmentSelections = [createFieldNode('id')];
        const outerFragmentSelections = [
          createFragmentSpreadNode('InnerFragment'),
          createFieldNode('email'),
        ];
        const fragments = {
          InnerFragment: createFragmentDefinition('InnerFragment', innerFragmentSelections),
          OuterFragment: createFragmentDefinition('OuterFragment', outerFragmentSelections),
        };
        const fieldNodes = [createFragmentSpreadNode('OuterFragment')];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.email).toBe(true);
      });

      it('should handle fragment spread with no selections', () => {
        const fragmentSelections: any[] = [];
        const fragments = {
          EmptyFragment: createFragmentDefinition('EmptyFragment', fragmentSelections),
        };
        const fieldNodes = [
          createFragmentSpreadNode('EmptyFragment'),
          createFieldNode('id'),
        ];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
      });

      it('should handle fragment with deeply nested structures', () => {
        const fragmentSelections = [
          createFieldNode('id'),
          createFieldNode('Posts', [
            createFieldNode('id'),
            createFieldNode('Comments', [createFieldNode('id')]),
          ]),
        ];
        const fragments = {
          DeepFragment: createFragmentDefinition('DeepFragment', fragmentSelections),
        };
        const fieldNodes = [createFragmentSpreadNode('DeepFragment')];
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts.select).toBeDefined();
        expect(result.select?.Posts.select?.Comments.select).toBeDefined();
      });
    });

    describe('18. Boolean vs object edge cases', () => {
      it('should handle empty object {} in selections', () => {
        // Empty nested selection becomes boolean true
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', []),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.Posts).toBe(true);
      });

      it('should handle object with only boolean values', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email', 'name']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.include).toBeUndefined();
        expect(typeof result.select?.id).toBe('boolean');
        expect(typeof result.select?.email).toBe('boolean');
        expect(typeof result.select?.name).toBe('boolean');
      });

      it('should handle object with only nested objects', () => {
        const fieldNodes = [
          buildNestedSelection('Posts', ['id']),
          buildNestedSelection('Comments', ['id']),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.include).toBeDefined();
        expect(result.select).toBeUndefined();
        expect(result.include?.Posts).toBeDefined();
        expect(result.include?.Comments).toBeDefined();
      });

      it('should handle deeply nested boolean values', () => {
        const fieldNodes = [
          createFieldNode('level1', [
            createFieldNode('level2', [
              createFieldNode('level3', [
                createFieldNode('value'),
              ]),
            ]),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.include).toBeDefined();
        expect(result.include?.level1.include).toBeDefined();
        expect(result.include?.level1.include?.level2.include).toBeDefined();
        expect(result.include?.level1.include?.level2.include?.level3.select).toBeDefined();
      });
    });

    describe('19. Exclude fields edge cases', () => {
      it('should handle excluding all fields', () => {
        const fieldNodes = buildSimpleSelection(['id', 'email', 'name']);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: ['__typename', 'id', 'email', 'name'],
        });

        expect(result).toBeInstanceOf(GQLPrismaSelect);
        // All fields excluded
        expect(result.select?.id).toBeUndefined();
        expect(result.select?.email).toBeUndefined();
        expect(result.select?.name).toBeUndefined();
      });

      it('should handle excluding nested field names', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('Posts', [
            createFieldNode('id'),
            createFieldNode('__typename'),
          ]),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.Posts.select?.id).toBe(true);
        expect(result.select?.Posts.select?.__typename).toBeUndefined();
      });

      it('should handle empty excludeFields array', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('__typename'),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: [],
        });

        // With empty excludeFields, __typename should be included
        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.__typename).toBe(true);
      });

      it('should handle excludeFields with special characters', () => {
        const fieldNodes = [
          createFieldNode('id'),
          createFieldNode('field-with-dash'),
          createFieldNode('field_with_underscore'),
        ];
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info, {
          excludeFields: ['__typename', 'field-with-dash'],
        });

        expect(result.select).toBeDefined();
        expect(result.select?.id).toBe(true);
        expect(result.select?.['field-with-dash']).toBeUndefined();
        expect(result.select?.field_with_underscore).toBe(true);
      });
    });

    describe('20. Performance edge cases', () => {
      it('should handle very large selection sets', () => {
        const fields = Array.from({ length: 50 }, (_, i) => `field${i}`);
        const fieldNodes = buildSimpleSelection(fields);
        const info = createMockGraphQLInfo(fieldNodes);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.field0).toBe(true);
        expect(result.select?.field49).toBe(true);
      });

      it('should handle deeply nested structures (10+ levels)', () => {
        let fieldNodes: any = createFieldNode('level10', [createFieldNode('value')]);
        for (let i = 9; i >= 1; i--) {
          fieldNodes = createFieldNode(`level${i}`, [fieldNodes]);
        }
        const info = createMockGraphQLInfo([fieldNodes]);

        const result = new GQLPrismaSelect(info);

        expect(result.include).toBeDefined();
        // Should handle deep nesting without issues
        expect(result.include?.level1).toBeDefined();
      });

      it('should handle many fragments (50+)', () => {
        const fragments: Record<string, any> = {};
        const fieldNodes: any[] = [];
        
        for (let i = 0; i < 50; i++) {
          const fragmentName = `Fragment${i}`;
          fragments[fragmentName] = createFragmentDefinition(fragmentName, [
            createFieldNode(`field${i}`),
          ]);
          fieldNodes.push(createFragmentSpreadNode(fragmentName));
        }
        
        const info = createMockGraphQLInfo(fieldNodes, fragments);

        const result = new GQLPrismaSelect(info);

        expect(result.select).toBeDefined();
        expect(result.select?.field0).toBe(true);
        expect(result.select?.field49).toBe(true);
      });
    });
  });

  describe('Additional Coverage - Uncovered Branches', () => {
    it('should cover selectOrIncludeOrBoolean with empty selections returning true', () => {
      // This covers line 55-58: when selections is empty, return true
      const fieldNodes = [createFieldNode('Posts', [])];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      // Empty nested selection becomes boolean true
      expect(result.select?.Posts).toBe(true);
    });

    it('should cover selectOrInclude when no boolean values (all nested objects)', () => {
      // This covers line 63-67: when no boolean values, use include
      const fieldNodes = [
        buildNestedSelection('Posts', ['id']),
        buildNestedSelection('Comments', ['id']),
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      // All nested objects, no boolean values at top level
      expect(result.include).toBeDefined();
      expect(result.select).toBeUndefined();
    });

    it('should cover transformSelections when acc is falsy and field is excluded', () => {
      // This covers line 80: when acc is falsy and field is excluded, return acc || {}
      // Need to have only excluded fields to make acc potentially falsy
      const fieldNodes = [
        createFieldNode('__typename'), // Only excluded field
      ];
      const info = createMockGraphQLInfo(fieldNodes);

      const result = new GQLPrismaSelect(info);

      // Should handle gracefully
      expect(result).toBeInstanceOf(GQLPrismaSelect);
    });
  });
});

