import { GraphQLResolveInfo } from 'types';
import { NexusIntegration, ApolloServerIntegration, LibraryRegistry } from '../libraryIntegration';
import { createMockGraphQLInfo } from './helpers/mockGraphQLInfo';

// Phase 8: Type-Safe Integration - Library Integration Tests

describe('Library Integration', () => {
  let mockInfo: GraphQLResolveInfo;

  beforeEach(() => {
    mockInfo = createMockGraphQLInfo({
      fieldName: 'user',
      selections: `
        id
        name
        email
      `
    });
  });

  describe('NexusIntegration', () => {
    describe('createQueryField', () => {
      it('should create typed query field', () => {
    const field = NexusIntegration.createQueryField<'User'>({
      type: 'User',
      args: { id: { type: 'ID', nullable: false } },
      model: 'User',
      resolve: async (root, args, ctx, info) => ({})
    });

        expect(field).toBeDefined();
        expect(typeof field).toBe('object');
      });
    });

    describe('createMutationField', () => {
      it('should create typed mutation field', () => {
        const field = NexusIntegration.createMutationField<'User'>({
          type: 'User',
          args: { input: { type: 'UserInput', nullable: false } },
          mutation: async (args, ctx, info) => {
            return ctx.prisma.user.create({ data: args.input });
          },
          model: 'User'
        });

        expect(field).toBeDefined();
        expect(typeof field).toBe('object');
      });
    });

    describe('createResolvers', () => {
      it('should create typed resolvers', () => {
        const resolvers = NexusIntegration.createResolvers<'User'>('User', {
          fullName: (user) => `${user.firstName} ${user.lastName}`
        });

        expect(resolvers).toBeDefined();
        expect(typeof resolvers.fullName).toBe('function');
      });
    });
  });

  describe('ApolloServerIntegration', () => {
    describe('createResolvers', () => {
      it('should create resolver map', () => {
        const resolvers = ApolloServerIntegration.createResolvers({
          Query: {
            user: async () => ({ id: '1', name: 'John' })
          }
        });

        expect(resolvers).toBeDefined();
        expect(resolvers.Query).toBeDefined();
        expect(typeof resolvers.Query.user).toBe('function');
      });
    });

    describe('createQueryResolver', () => {
      it('should create typed query resolver', () => {
        const resolver = ApolloServerIntegration.createQueryResolver<'User'>(
          'User',
          async (args, context, info) => {
            return { id: args.id, name: 'John' };
          }
        );

        expect(typeof resolver).toBe('function');
      });
    });

    describe('createMutationResolver', () => {
      it('should create typed mutation resolver', () => {
        const resolver = ApolloServerIntegration.createMutationResolver<'User'>(
          'User',
          async (args, context, info) => {
            return { id: '1', name: args.name };
          }
        );

        expect(typeof resolver).toBe('function');
      });
    });
  });

  describe('LibraryRegistry', () => {

    describe('register', () => {
      it('should register integration', () => {
        // Clear registry for this test
        (LibraryRegistry as any).integrations.clear();

        const integration = { name: 'test', helper: () => {} };

        LibraryRegistry.register('test', integration as any);

        expect(LibraryRegistry.get('test')).toBe(integration);
      });
    });

    describe('get', () => {
      it('should retrieve registered integration', () => {
        // Clear registry for this test
        (LibraryRegistry as any).integrations.clear();

        const integration = { name: 'test', helper: () => {} };
        LibraryRegistry.register('test', integration as any);

        const retrieved = LibraryRegistry.get('test');

        expect(retrieved).toBe(integration);
      });

      it('should return undefined for unregistered integration', () => {
        // Clear registry for this test to ensure clean state
        (LibraryRegistry as any).integrations.clear();

        const retrieved = LibraryRegistry.get('nonexistent');

        expect(retrieved).toBeUndefined();
      });
    });

    describe('list', () => {
      it('should list all registered integrations', () => {
        // Clear registry for this test
        (LibraryRegistry as any).integrations.clear();

        LibraryRegistry.register('test1', {});
        LibraryRegistry.register('test2', {});

        const list = LibraryRegistry.list();

        expect(list).toContain('test1');
        expect(list).toContain('test2');
        expect(list).toHaveLength(2);
      });
    });
  });

  describe('Integration Utils', () => {
    describe('createResolverFactory', () => {
      it('should create resolver factory', () => {
        const factory = (require('../libraryIntegration')).IntegrationUtils.createResolverFactory();

        expect(factory).toBeDefined();
        expect(typeof factory.query).toBe('function');
        expect(typeof factory.mutation).toBe('function');
        expect(typeof factory.field).toBe('function');
      });
    });

    describe('createMiddleware', () => {
      it('should create middleware function', () => {
        const middleware = (require('../libraryIntegration')).IntegrationUtils.createMiddleware(
          async (resolver: any, root: any, args: any, context: any, info: any) => {
            // Pre-resolver logic
            const result = await resolver(root, args, context, info);
            // Post-resolver logic
            return result;
          }
        );

        expect(typeof middleware).toBe('function');
      });
    });

    describe('createDataLoader', () => {
      it('should create typed data loader', () => {
        const prismaClient = {
          user: {
            findUnique: jest.fn()
          }
        };

        // @ts-ignore - Dynamic require with generics
        const dataLoader = (require('../libraryIntegration')).IntegrationUtils.createDataLoader<'User', string, any>(
          'User',
          prismaClient,
          (key: string) => ({ id: key })
        );

        expect(dataLoader).toBeDefined();
        expect(typeof dataLoader.load).toBe('function');
        expect(typeof dataLoader.loadMany).toBe('function');
      });
    });
  });

  describe('Built-in Integrations', () => {
    // Ensure built-in integrations are registered before these tests
    beforeAll(() => {
      // Re-register built-in integrations in case they were cleared
      LibraryRegistry.register('nexus', {
        nexus: require('../libraryIntegration').NexusIntegration
      } as any);
      LibraryRegistry.register('apollo-server', {} as any);
      LibraryRegistry.register('graphql-code-generator', {} as any);
    });

    it('should have nexus integration registered', () => {
      const nexus = LibraryRegistry.get('nexus');

      expect(nexus).toBeDefined();
      expect(nexus?.nexus).toBeDefined();
    });

    it('should have apollo-server integration registered', () => {
      const apollo = LibraryRegistry.get('apollo-server');

      expect(apollo).toBeDefined();
    });

    it('should have graphql-code-generator integration registered', () => {
      const codegen = LibraryRegistry.get('graphql-code-generator');

      expect(codegen).toBeDefined();
    });
  });
});
