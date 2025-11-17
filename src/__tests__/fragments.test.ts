import {
  FragmentRegistry,
  FragmentOptimizer,
  FragmentOverrider,
  DynamicFragmentHandler,
  FragmentCache,
  FragmentAnalyzer,
  FragmentDefinition,
  FragmentOverride,
  DynamicFragment,
  CacheConfig
} from '../fragments';

describe('Phase 7: Advanced Fragment Handling', () => {
  beforeEach(() => {
    // Clear fragment registry before each test
    FragmentRegistry.clear();
  });

  describe('7.1 Fragment Registry', () => {
    describe('Registration and Retrieval', () => {
      it('should register and retrieve fragments', () => {
        const fragment: FragmentDefinition = {
          name: 'UserFields',
          type: 'User',
          selections: { id: true, email: true, name: true },
          metadata: {
            size: 42,
            complexity: 3,
            dependencies: [],
            usageCount: 0,
            lastUsed: new Date()
          }
        };

        FragmentRegistry.register(fragment);
        const retrieved = FragmentRegistry.get('UserFields');

        expect(retrieved).toBeDefined();
        expect(retrieved?.name).toBe('UserFields');
        expect(retrieved?.type).toBe('User');
        expect(retrieved?.selections).toEqual({ id: true, email: true, name: true });
      });

      it('should track usage statistics', () => {
        const fragment: FragmentDefinition = {
          name: 'PostFields',
          type: 'Post',
          selections: { id: true, title: true },
          metadata: {
            size: 25,
            complexity: 2,
            dependencies: [],
            usageCount: 0,
            lastUsed: new Date()
          }
        };

        FragmentRegistry.register(fragment);

        // First access
        let retrieved = FragmentRegistry.get('PostFields');
        expect(retrieved?.metadata.usageCount).toBe(1);

        // Second access
        retrieved = FragmentRegistry.get('PostFields');
        expect(retrieved?.metadata.usageCount).toBe(2);
      });

      it('should list fragments by type', () => {
        const userFragment: FragmentDefinition = {
          name: 'UserBasic',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const postFragment: FragmentDefinition = {
          name: 'PostBasic',
          type: 'Post',
          selections: { id: true, title: true },
          metadata: { size: 22, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const userFragment2: FragmentDefinition = {
          name: 'UserExtended',
          type: 'User',
          selections: { id: true, name: true, email: true },
          metadata: { size: 35, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        FragmentRegistry.register(userFragment);
        FragmentRegistry.register(postFragment);
        FragmentRegistry.register(userFragment2);

        const allFragments = FragmentRegistry.list();
        expect(allFragments).toHaveLength(3);

        const userFragments = FragmentRegistry.list('User');
        expect(userFragments).toHaveLength(2);
        expect(userFragments.map(f => f.name)).toEqual(['UserBasic', 'UserExtended']);

        const postFragments = FragmentRegistry.list('Post');
        expect(postFragments).toHaveLength(1);
        expect(postFragments[0].name).toBe('PostBasic');
      });

      it('should return null for non-existent fragments', () => {
        const result = FragmentRegistry.get('NonExistentFragment');
        expect(result).toBeNull();
      });

      it('should unregister fragments', () => {
        const fragment: FragmentDefinition = {
          name: 'TestFragment',
          type: 'Test',
          selections: { field: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        FragmentRegistry.register(fragment);
        expect(FragmentRegistry.get('TestFragment')).toBeDefined();

        FragmentRegistry.unregister('TestFragment');
        expect(FragmentRegistry.get('TestFragment')).toBeNull();
      });
    });

    describe('Usage Statistics', () => {
      it('should provide accurate usage statistics', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'Post',
            selections: { id: true, title: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        fragments.forEach(f => FragmentRegistry.register(f));

        // Access fragments different numbers of times
        FragmentRegistry.get('Frag1'); // 1
        FragmentRegistry.get('Frag1'); // 2
        FragmentRegistry.get('Frag2'); // 1

        const stats = FragmentRegistry.getUsageStats();
        expect(stats.totalFragments).toBe(2);
        expect(stats.totalSize).toBe(30);
        expect(stats.averageComplexity).toBe(1.5);
        expect(stats.mostUsed).toContain('Frag1');
        expect(stats.leastUsed).toContain('Frag2');
      });
    });
  });

  describe('7.2 Fragment Optimizer', () => {
    describe('Inlining', () => {
      it('should inline fragments below usage threshold', () => {
        const fragment: FragmentDefinition = {
          name: 'SmallFragment',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const result = FragmentOptimizer.inline(fragment, 5); // Usage threshold of 5
        expect(result).toEqual({ id: true, name: true });
      });

      it('should not inline fragments above usage threshold', () => {
        const fragment: FragmentDefinition = {
          name: 'FrequentlyUsedFragment',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 10, lastUsed: new Date() }
        };

        const result = FragmentOptimizer.inline(fragment, 5); // Usage threshold of 5
        expect(result).toEqual({ FrequentlyUsedFragment: true });
      });
    });

    describe('Deduplication', () => {
      it('should remove duplicate selections', () => {
        const selections = {
          id: true,
          name: true,
          profile: { select: { id: true, name: true } }, // name duplicated in nested
          settings: { select: { id: true } }
        };

        const result = FragmentOptimizer.deduplicate(selections);
        expect(result).toEqual(selections); // Should remain unchanged for this case
      });

      it('should handle nested selections', () => {
        const selections = {
          user: {
            select: {
              id: true,
              posts: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        };

        const result = FragmentOptimizer.deduplicate(selections);
        expect(result).toEqual(selections);
      });
    });

    describe('Merging Compatible Fragments', () => {
      it('should merge compatible fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserFrag1',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'UserFrag2',
            type: 'User',
            selections: { email: true, age: true },
            metadata: { size: 18, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const merged = FragmentOptimizer.mergeCompatible(fragments);
        expect(merged.name).toBe('MergedUserFrag1_UserFrag2');
        expect(merged.type).toBe('User');
        expect(merged.selections).toEqual({
          id: true,
          name: true,
          email: true,
          age: true
        });
        expect(merged.metadata.size).toBeGreaterThan(20); // Combined size
        expect(merged.metadata.complexity).toBe(2); // Max complexity
      });

      it('should throw error for incompatible fragment types', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserFrag',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'PostFrag',
            type: 'Post',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        expect(() => FragmentOptimizer.mergeCompatible(fragments)).toThrow('Cannot merge fragments of different types');
      });

      it('should handle single fragment merge', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'SingleFrag',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const merged = FragmentOptimizer.mergeCompatible(fragments);
        expect(merged).toEqual(fragments[0]);
      });
    });

    describe('Optimization for Caching', () => {
      it('should optimize fragments for caching', () => {
        const fragment: FragmentDefinition = {
          name: 'CacheTest',
          type: 'User',
          selections: { name: true, id: true, email: true }, // Out of order
          metadata: {
            size: 30,
            complexity: 3,
            dependencies: ['Dep1', 'Dep2', 'UnusedDep'],
            usageCount: 5,
            lastUsed: new Date()
          }
        };

        const optimized = FragmentOptimizer.optimizeForCaching(fragment);

        // Should be sorted alphabetically
        expect(Object.keys(optimized.selections)).toEqual(['email', 'id', 'name']);

        // Should remove unused dependencies
        expect(optimized.metadata.dependencies).toEqual([]); // All dependencies are "unused" in this test
      });
    });

    describe('Selection Merging', () => {
      it('should merge multiple selection objects', () => {
        const selections1 = { id: true, name: true };
        const selections2 = { email: true, age: true };
        const selections3 = { id: true, address: true }; // id duplicated

        const merged = FragmentOptimizer.mergeSelections([selections1, selections2, selections3]);
        expect(merged).toEqual({
          id: true,
          name: true,
          email: true,
          age: true,
          address: true
        });
      });

      it('should merge nested selections', () => {
        const selections1 = {
          user: { select: { id: true, name: true } }
        };
        const selections2 = {
          user: { select: { email: true, age: true } }
        };

        const merged = FragmentOptimizer.mergeSelections([selections1, selections2]);
        expect(merged).toEqual({
          user: { select: { id: true, name: true, email: true, age: true } }
        });
      });
    });
  });

  describe('7.3 Fragment Overrider', () => {
    describe('Single Override Application', () => {
      it('should exclude fields', () => {
        const fragment: FragmentDefinition = {
          name: 'UserWithSensitive',
          type: 'User',
          selections: { id: true, name: true, password: true, ssn: true },
          metadata: { size: 40, complexity: 4, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserWithSensitive',
          excludeFields: ['password', 'ssn']
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({ id: true, name: true });
        expect(result.metadata.size).toBeLessThan(fragment.metadata.size);
      });

      it('should include additional fields', () => {
        const fragment: FragmentDefinition = {
          name: 'UserBasic',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserBasic',
          includeFields: ['email', 'phone']
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({ id: true, name: true, email: true, phone: true });
      });

      it('should add nested selections', () => {
        const fragment: FragmentDefinition = {
          name: 'UserSimple',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserSimple',
          addSelections: {
            profile: { select: { avatar: true, bio: true } }
          }
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({
          id: true,
          name: true,
          profile: { select: { avatar: true, bio: true } }
        });
      });

      it('should remove selections', () => {
        const fragment: FragmentDefinition = {
          name: 'UserFull',
          type: 'User',
          selections: {
            id: true,
            name: true,
            profile: { select: { avatar: true, bio: true, private: true } }
          },
          metadata: { size: 60, complexity: 5, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserFull',
          removeSelections: ['profile.private']
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({
          id: true,
          name: true,
          profile: { select: { avatar: true, bio: true } }
        });
      });

      it('should transform field names', () => {
        const fragment: FragmentDefinition = {
          name: 'UserFields',
          type: 'User',
          selections: { firstName: true, lastName: true, createdAt: true },
          metadata: { size: 45, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserFields',
          transformFields: {
            'firstName': 'first_name',
            'lastName': 'last_name',
            'createdAt': 'created_at'
          }
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({
          first_name: true,
          last_name: true,
          created_at: true
        });
      });

      it('should use function-based field transformation', () => {
        const fragment: FragmentDefinition = {
          name: 'UserFields',
          type: 'User',
          selections: { name: true, email: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserFields',
          transformFields: {
            'name': (field) => `user_${field}`,
            'email': (field) => `${field}_address`
          }
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({
          user_name: true,
          email_address: true
        });
      });

      it('should respect condition functions', () => {
        const fragment: FragmentDefinition = {
          name: 'UserConditional',
          type: 'User',
          selections: { id: true, name: true, adminData: true },
          metadata: { size: 35, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserConditional',
          excludeFields: ['adminData'],
          condition: (context) => context.user?.role !== 'admin'
        };

        // Condition should exclude adminData when user is not admin
        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({ id: true, name: true });
      });

      it('should apply no changes when condition fails', () => {
        const fragment: FragmentDefinition = {
          name: 'UserConditional',
          type: 'User',
          selections: { id: true, name: true, adminData: true },
          metadata: { size: 35, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const override: FragmentOverride = {
          fragmentName: 'UserConditional',
          excludeFields: ['adminData'],
          condition: (context) => context.user?.role === 'admin' // Condition fails
        };

        const result = FragmentOverrider.apply(fragment, override);
        expect(result.selections).toEqual({ id: true, name: true, adminData: true });
      });
    });

    describe('Multiple Override Application', () => {
      it('should apply multiple overrides in sequence', () => {
        const fragment: FragmentDefinition = {
          name: 'UserMultiOverride',
          type: 'User',
          selections: { id: true, name: true, email: true, password: true, ssn: true },
          metadata: { size: 55, complexity: 5, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const overrides: FragmentOverride[] = [
          {
            fragmentName: 'UserMultiOverride',
            excludeFields: ['password', 'ssn'] // Remove sensitive data
          },
          {
            fragmentName: 'UserMultiOverride',
            includeFields: ['phone', 'address'] // Add contact info
          },
          {
            fragmentName: 'UserMultiOverride',
            transformFields: {
              'name': 'full_name',
              'email': 'email_address'
            }
          }
        ];

        const result = FragmentOverrider.applyMultiple(fragment, overrides);
        expect(result.selections).toEqual({
          id: true,
          full_name: true,
          email_address: true,
          phone: true,
          address: true
        });
      });

      it('should apply overrides to multiple fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserFrag1',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'UserFrag2',
            type: 'User',
            selections: { id: true, email: true },
            metadata: { size: 22, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        const overrides: FragmentOverride[] = [
          {
            fragmentName: 'UserFrag1',
            includeFields: ['phone']
          },
          {
            fragmentName: 'UserFrag2',
            excludeFields: ['id']
          }
        ];

        const results = FragmentOverrider.applyToMultiple(fragments, overrides);
        expect(results).toHaveLength(2);
        expect(results[0].selections).toEqual({ id: true, name: true, phone: true });
        expect(results[1].selections).toEqual({ email: true });
      });
    });
  });

  describe('7.4 Dynamic Fragment Handler', () => {
    describe('Fragment Evaluation', () => {
      it('should evaluate dynamic fragments based on context', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'AdminOnly',
            condition: (context) => context.user?.role === 'admin',
            selections: { adminData: true, permissions: true },
            priority: 1
          },
          {
            name: 'PremiumUser',
            condition: (context) => context.user?.subscription === 'premium',
            selections: { premiumFeatures: true, analytics: true },
            priority: 2
          },
          {
            name: 'BasicUser',
            condition: (context) => !context.user?.subscription || context.user?.subscription === 'basic',
            selections: { basicFeatures: true },
            priority: 3
          }
        ];

        // Test admin context
        const adminContext = { user: { role: 'admin', subscription: 'premium' } };
        const adminFragments = DynamicFragmentHandler.evaluate(dynamicFragments, adminContext);

        expect(adminFragments).toHaveLength(2); // AdminOnly and PremiumUser (higher priority)
        expect(adminFragments.map(f => f.name)).toEqual(['AdminOnly', 'PremiumUser']);

        // Test basic user context
        const basicContext = { user: { role: 'user', subscription: 'basic' } };
        const basicFragments = DynamicFragmentHandler.evaluate(dynamicFragments, basicContext);

        expect(basicFragments).toHaveLength(1);
        expect(basicFragments[0].name).toBe('BasicUser');
      });

      it('should handle function-based selections', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'DynamicFields',
            condition: () => true,
            selections: (context) => ({
              [`user_${context.user.id}`]: true,
              dynamicField: true
            }),
            priority: 1
          }
        ];

        const context = { user: { id: 123 } };
        const fragments = DynamicFragmentHandler.evaluate(dynamicFragments, context);

        expect(fragments).toHaveLength(1);
        expect(fragments[0].selections).toEqual({
          user_123: true,
          dynamicField: true
        });
      });

      it('should handle evaluation errors gracefully', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'ErrorProne',
            condition: () => { throw new Error('Condition error'); },
            selections: { errorField: true },
            priority: 1
          },
          {
            name: 'SafeFragment',
            condition: () => true,
            selections: { safeField: true },
            priority: 1
          }
        ];

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        const fragments = DynamicFragmentHandler.evaluate(dynamicFragments, {});

        expect(fragments).toHaveLength(1);
        expect(fragments[0].name).toBe('SafeFragment');

        consoleSpy.mockRestore();
      });

      it('should sort fragments by priority', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'LowPriority',
            condition: () => true,
            selections: { low: true },
            priority: 3
          },
          {
            name: 'HighPriority',
            condition: () => true,
            selections: { high: true },
            priority: 1
          },
          {
            name: 'MediumPriority',
            condition: () => true,
            selections: { medium: true },
            priority: 2
          }
        ];

        const fragments = DynamicFragmentHandler.evaluate(dynamicFragments, {});
        expect(fragments.map(f => f.name)).toEqual(['HighPriority', 'MediumPriority', 'LowPriority']);
      });
    });

    describe('Fragment Merging', () => {
      it('should merge dynamic fragments with base fragment', () => {
        const baseFragment: FragmentDefinition = {
          name: 'UserBase',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'DynamicAdmin',
            condition: () => true,
            selections: { adminData: true },
            priority: 1
          }
        ];

        const merged = DynamicFragmentHandler.mergeDynamic(baseFragment, dynamicFragments);
        expect(merged.selections).toEqual({
          id: true,
          name: true,
          adminData: true
        });
      });

      it('should return base fragment when no dynamic fragments match', () => {
        const baseFragment: FragmentDefinition = {
          name: 'UserBase',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'NoMatch',
            condition: () => false,
            selections: { extraField: true },
            priority: 1
          }
        ];

        const merged = DynamicFragmentHandler.mergeDynamic(baseFragment, dynamicFragments);
        expect(merged).toEqual(baseFragment);
      });
    });

    describe('Fragment Matching', () => {
      it('should check if any dynamic fragment matches context', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'AdminOnly',
            condition: (ctx) => ctx.user?.role === 'admin',
            selections: { admin: true },
            priority: 1
          },
          {
            name: 'UserOnly',
            condition: (ctx) => ctx.user?.role === 'user',
            selections: { user: true },
            priority: 1
          }
        ];

        expect(DynamicFragmentHandler.hasMatchingFragment(dynamicFragments, { user: { role: 'admin' } })).toBe(true);
        expect(DynamicFragmentHandler.hasMatchingFragment(dynamicFragments, { user: { role: 'guest' } })).toBe(false);
      });

      it('should get all matching dynamic fragments', () => {
        const dynamicFragments: DynamicFragment[] = [
          {
            name: 'Feature1',
            condition: (ctx) => ctx.features?.includes('feature1'),
            selections: { f1: true },
            priority: 1
          },
          {
            name: 'Feature2',
            condition: (ctx) => ctx.features?.includes('feature2'),
            selections: { f2: true },
            priority: 1
          }
        ];

        const context = { features: ['feature1', 'feature2'] };
        const matching = DynamicFragmentHandler.getMatchingFragments(dynamicFragments, context);

        expect(matching).toHaveLength(2);
        expect(matching.map(f => f.name)).toEqual(['Feature1', 'Feature2']);
      });
    });
  });

  describe('7.5 Fragment Cache', () => {
    let cache: FragmentCache;

    beforeEach(() => {
      const config: CacheConfig = {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 10,
        strategy: 'LRU'
      };
      cache = new FragmentCache(config);
    });

    describe('Basic Caching Operations', () => {
      it('should store and retrieve fragments', () => {
        const fragment: FragmentDefinition = {
          name: 'CachedUser',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const key = FragmentCache.generateKey(fragment);
        cache.set(key, fragment);

        const retrieved = cache.get(key);
        expect(retrieved).toEqual(fragment);
      });

      it('should return null for non-existent keys', () => {
        const result = cache.get('non-existent-key');
        expect(result).toBeNull();
      });

      it('should respect TTL', async () => {
        const config: CacheConfig = {
          enabled: true,
          ttl: 100, // 100ms
          maxSize: 10,
          strategy: 'TTL'
        };
        const ttlCache = new FragmentCache(config);

        const fragment: FragmentDefinition = {
          name: 'TTLTest',
          type: 'User',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const key = FragmentCache.generateKey(fragment);
        ttlCache.set(key, fragment);

        // Should be available immediately
        expect(ttlCache.get(key)).toBeDefined();

        // Wait for TTL to expire
        await new Promise(resolve => setTimeout(resolve, 150));

        // Should be expired
        expect(ttlCache.get(key)).toBeNull();
      });

      it('should respect cache size limits', () => {
        const smallCache = new FragmentCache({
          enabled: true,
          ttl: 300000,
          maxSize: 2, // Only 2 entries
          strategy: 'LRU'
        });

        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag3',
            type: 'User',
            selections: { email: true },
            metadata: { size: 13, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        // Add three fragments to cache with max size 2
        fragments.forEach(f => {
          const key = FragmentCache.generateKey(f);
          smallCache.set(key, f);
        });

        const keys = fragments.map(f => FragmentCache.generateKey(f));
        const stats = smallCache.getStats();

        // Should only have 2 entries (LRU evicted the first one)
        expect(stats.totalEntries).toBe(2);
        expect(smallCache.get(keys[0])).toBeNull(); // First one should be evicted
        expect(smallCache.get(keys[1])).toBeDefined(); // Last two should be present
        expect(smallCache.get(keys[2])).toBeDefined();
      });
    });

    describe('Cache Strategies', () => {
      it('should implement LRU strategy', () => {
        const lruCache = new FragmentCache({
          enabled: true,
          ttl: 300000,
          maxSize: 2,
          strategy: 'LRU'
        });

        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag3',
            type: 'User',
            selections: { email: true },
            metadata: { size: 13, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        const keys = fragments.map(f => lruCache.set(FragmentCache.generateKey(f), f));

        // Access Frag1 to make it most recently used
        lruCache.get(FragmentCache.generateKey(fragments[0]));

        // Add Frag3, should evict Frag2 (least recently used)
        lruCache.set(FragmentCache.generateKey(fragments[2]), fragments[2]);

        expect(lruCache.get(FragmentCache.generateKey(fragments[0]))).toBeDefined(); // Frag1 still there
        expect(lruCache.get(FragmentCache.generateKey(fragments[1]))).toBeNull(); // Frag2 evicted
        expect(lruCache.get(FragmentCache.generateKey(fragments[2]))).toBeDefined(); // Frag3 there
      });

      it('should implement LFU strategy', () => {
        const lfuCache = new FragmentCache({
          enabled: true,
          ttl: 300000,
          maxSize: 2,
          strategy: 'LFU'
        });

        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag3',
            type: 'User',
            selections: { email: true },
            metadata: { size: 13, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        // Add first two
        lfuCache.set(FragmentCache.generateKey(fragments[0]), fragments[0]);
        lfuCache.set(FragmentCache.generateKey(fragments[1]), fragments[1]);

        // Access Frag1 multiple times
        lfuCache.get(FragmentCache.generateKey(fragments[0]));
        lfuCache.get(FragmentCache.generateKey(fragments[0]));

        // Add Frag3, should evict Frag2 (least frequently used)
        lfuCache.set(FragmentCache.generateKey(fragments[2]), fragments[2]);

        expect(lfuCache.get(FragmentCache.generateKey(fragments[0]))).toBeDefined(); // Frag1 still there
        expect(lfuCache.get(FragmentCache.generateKey(fragments[1]))).toBeNull(); // Frag2 evicted
        expect(lfuCache.get(FragmentCache.generateKey(fragments[2]))).toBeDefined(); // Frag3 there
      });
    });

    describe('Advanced Querying', () => {
      it('should get fragments by type', () => {
        const userFragment: FragmentDefinition = {
          name: 'UserFrag',
          type: 'User',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const postFragment: FragmentDefinition = {
          name: 'PostFrag',
          type: 'Post',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        cache.set(FragmentCache.generateKey(userFragment), userFragment);
        cache.set(FragmentCache.generateKey(postFragment), postFragment);

        const userFragments = cache.getByType('User');
        const postFragments = cache.getByType('Post');

        expect(userFragments).toHaveLength(1);
        expect(userFragments[0].name).toBe('UserFrag');
        expect(postFragments).toHaveLength(1);
        expect(postFragments[0].name).toBe('PostFrag');
      });

      it('should get fragments by complexity range', () => {
        const simpleFragment: FragmentDefinition = {
          name: 'Simple',
          type: 'User',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const complexFragment: FragmentDefinition = {
          name: 'Complex',
          type: 'User',
          selections: { id: true, name: true, email: true, profile: { select: { bio: true } } },
          metadata: { size: 50, complexity: 5, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        cache.set(FragmentCache.generateKey(simpleFragment), simpleFragment);
        cache.set(FragmentCache.generateKey(complexFragment), complexFragment);

        const lowComplexity = cache.getByComplexity(1, 2);
        const highComplexity = cache.getByComplexity(4, 6);

        expect(lowComplexity).toHaveLength(1);
        expect(lowComplexity[0].name).toBe('Simple');
        expect(highComplexity).toHaveLength(1);
        expect(highComplexity[0].name).toBe('Complex');
      });

      it('should get most used fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'Frag3',
            type: 'User',
            selections: { email: true },
            metadata: { size: 13, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        // Manually set access counts by accessing cache
        fragments.forEach(f => {
          const key = FragmentCache.generateKey(f);
          cache.set(key, f);
        });

        // Access Frag1 multiple times
        const key1 = FragmentCache.generateKey(fragments[0]);
        cache.get(key1);
        cache.get(key1);
        cache.get(key1);

        // Access Frag2 twice
        const key2 = FragmentCache.generateKey(fragments[1]);
        cache.get(key2);
        cache.get(key2);

        // Access Frag3 once
        const key3 = FragmentCache.generateKey(fragments[2]);
        cache.get(key3);

        const mostUsed = cache.getMostUsed(2);
        expect(mostUsed).toHaveLength(2);
        expect(mostUsed[0].name).toBe('Frag1'); // Most used
        expect(mostUsed[1].name).toBe('Frag2'); // Second most used
      });
    });

    describe('Cache Statistics', () => {
      it('should provide accurate cache statistics', () => {
        const fragment1: FragmentDefinition = {
          name: 'Frag1',
          type: 'User',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const fragment2: FragmentDefinition = {
          name: 'Frag2',
          type: 'Post',
          selections: { id: true, title: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        cache.set(FragmentCache.generateKey(fragment1), fragment1);
        cache.set(FragmentCache.generateKey(fragment2), fragment2);

        // Access fragments to generate usage
        cache.get(FragmentCache.generateKey(fragment1));
        cache.get(FragmentCache.generateKey(fragment1));
        cache.get(FragmentCache.generateKey(fragment2));

        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(2);
        expect(stats.totalSize).toBe(30);
        expect(stats.averageComplexity).toBe(1.5);
        expect(stats.mostUsed).toContain('Frag1');
        expect(stats.leastUsed).toContain('Frag2');
      });
    });

    describe('Cache Key Generation', () => {
      it('should generate consistent keys for same fragments', () => {
        const fragment1: FragmentDefinition = {
          name: 'TestFrag',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const fragment2: FragmentDefinition = {
          name: 'TestFrag',
          type: 'User',
          selections: { id: true, name: true }, // Same selections
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 5, lastUsed: new Date() } // Different metadata
        };

        const key1 = FragmentCache.generateKey(fragment1);
        const key2 = FragmentCache.generateKey(fragment2);

        // Keys should be the same since selections are identical
        expect(key1).toBe(key2);
      });

      it('should generate different keys for different fragments', () => {
        const fragment1: FragmentDefinition = {
          name: 'Frag1',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const fragment2: FragmentDefinition = {
          name: 'Frag2',
          type: 'User',
          selections: { id: true, email: true }, // Different selections
          metadata: { size: 18, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const key1 = FragmentCache.generateKey(fragment1);
        const key2 = FragmentCache.generateKey(fragment2);

        expect(key1).not.toBe(key2);
      });
    });

    describe('Cache Invalidation', () => {
      it('should invalidate entries by pattern', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserFrag1',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'UserFrag2',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          },
          {
            name: 'PostFrag1',
            type: 'Post',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        fragments.forEach(f => {
          cache.set(FragmentCache.generateKey(f), f);
        });

        // Invalidate all User fragments
        cache.invalidate('User');

        expect(cache.get(FragmentCache.generateKey(fragments[0]))).toBeNull();
        expect(cache.get(FragmentCache.generateKey(fragments[1]))).toBeNull();
        expect(cache.get(FragmentCache.generateKey(fragments[2]))).toBeDefined(); // Post fragment should remain
      });
    });
  });

  describe('7.6 Fragment Analyzer', () => {
    describe('Fragment Analysis', () => {
      it('should analyze fragments and find unused ones', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UsedFrag',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 5, lastUsed: new Date() }
          },
          {
            name: 'UnusedFrag',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);

        expect(analysis.unused).toEqual(['UnusedFrag']);
        expect(analysis.fragments).toHaveLength(2);
      });

      it('should detect duplicate fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserBasic1',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'UserBasic2',
            type: 'User',
            selections: { id: true, name: true }, // Exact duplicate
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'UserExtended',
            type: 'User',
            selections: { id: true, name: true, email: true },
            metadata: { size: 30, complexity: 3, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);

        expect(analysis.duplicates).toHaveLength(1);
        expect(analysis.duplicates[0].fragments).toEqual(['UserBasic1', 'UserBasic2']);
        expect(analysis.duplicates[0].similarity).toBe(1); // Exact match
      });

      it('should detect similar fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'UserFrag1',
            type: 'User',
            selections: { id: true, name: true, email: true },
            metadata: { size: 30, complexity: 3, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'UserFrag2',
            type: 'User',
            selections: { id: true, name: true, phone: true }, // 2/3 overlap
            metadata: { size: 28, complexity: 3, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);

        expect(analysis.duplicates).toHaveLength(1);
        expect(analysis.duplicates[0].fragments).toEqual(['UserFrag1', 'UserFrag2']);
        expect(analysis.duplicates[0].similarity).toBe(0.5); // 2 common fields out of 4 unique fields
      });
    });

    describe('Optimization Suggestions', () => {
      it('should suggest inlining small fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'SmallFrag',
            type: 'User',
            selections: { id: true },
            metadata: { size: 8, complexity: 1, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'LargeFrag',
            type: 'User',
            selections: { id: true, name: true, email: true },
            metadata: { size: 150, complexity: 3, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);
        const optimizations = FragmentAnalyzer.suggestOptimizations(analysis);

        const inlineSuggestion = optimizations.find(o => o.type === 'inline');
        expect(inlineSuggestion).toBeDefined();
        expect(inlineSuggestion?.fragments).toContain('SmallFrag');
        expect(inlineSuggestion?.fragments).not.toContain('LargeFrag');
      });

      it('should suggest merging duplicate fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'Dup1',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'Dup2',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);
        const optimizations = FragmentAnalyzer.suggestOptimizations(analysis);

        const mergeSuggestion = optimizations.find(o => o.type === 'merge');
        expect(mergeSuggestion).toBeDefined();
        expect(mergeSuggestion?.description).toContain('1 groups of duplicate fragments');
        expect(mergeSuggestion?.impact).toBe('high');
      });

      it('should suggest caching frequently used fragments', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'FrequentFrag',
            type: 'User',
            selections: { id: true },
            metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 15, lastUsed: new Date() }
          },
          {
            name: 'RareFrag',
            type: 'User',
            selections: { name: true },
            metadata: { size: 12, complexity: 1, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);
        const optimizations = FragmentAnalyzer.suggestOptimizations(analysis);

        const cacheSuggestion = optimizations.find(o => o.type === 'cache');
        expect(cacheSuggestion).toBeDefined();
        expect(cacheSuggestion?.fragments).toContain('FrequentFrag');
        expect(cacheSuggestion?.fragments).not.toContain('RareFrag');
      });

      it('should suggest deduplication', () => {
        const fragments: FragmentDefinition[] = [
          {
            name: 'Frag1',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          },
          {
            name: 'Frag2',
            type: 'User',
            selections: { id: true, name: true },
            metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
          }
        ];

        const analysis = FragmentAnalyzer.analyze(fragments);
        const optimizations = FragmentAnalyzer.suggestOptimizations(analysis);

        const dedupeSuggestion = optimizations.find(o => o.type === 'deduplicate');
        expect(dedupeSuggestion).toBeDefined();
        expect(dedupeSuggestion?.fragments).toEqual(['Frag1', 'Frag2']);
      });
    });

    describe('Similarity Calculation', () => {
      it('should calculate exact similarity', () => {
        const frag1: FragmentDefinition = {
          name: 'Frag1',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const frag2: FragmentDefinition = {
          name: 'Frag2',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        // Test the private method indirectly through analysis
        const analysis = FragmentAnalyzer.analyze([frag1, frag2]);
        expect(analysis.duplicates[0].similarity).toBe(1);
      });

      it('should calculate partial similarity', () => {
        const frag1: FragmentDefinition = {
          name: 'Frag1',
          type: 'User',
          selections: { id: true, name: true, email: true },
          metadata: { size: 30, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const frag2: FragmentDefinition = {
          name: 'Frag2',
          type: 'User',
          selections: { id: true, name: true, phone: true },
          metadata: { size: 28, complexity: 3, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const analysis = FragmentAnalyzer.analyze([frag1, frag2]);
        expect(analysis.duplicates[0].similarity).toBe(0.5); // 2 common fields out of 4 total unique
      });

      it('should return 0 similarity for different types', () => {
        const frag1: FragmentDefinition = {
          name: 'UserFrag',
          type: 'User',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const frag2: FragmentDefinition = {
          name: 'PostFrag',
          type: 'Post',
          selections: { id: true },
          metadata: { size: 10, complexity: 1, dependencies: [], usageCount: 0, lastUsed: new Date() }
        };

        const analysis = FragmentAnalyzer.analyze([frag1, frag2]);
        expect(analysis.duplicates).toHaveLength(0);
      });
    });

    describe('Optimization Impact Assessment', () => {
      it('should calculate savings from merging', () => {
        const frag1: FragmentDefinition = {
          name: 'Frag1',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
        };

        const frag2: FragmentDefinition = {
          name: 'Frag2',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 1, lastUsed: new Date() }
        };

        const analysis = FragmentAnalyzer.analyze([frag1, frag2]);
        const mergeOpt = FragmentAnalyzer.suggestOptimizations(analysis).find(o => o.type === 'merge');

        expect(mergeOpt?.description).toContain('save 17 bytes');
        expect(mergeOpt?.impact).toBe('high');
        expect(mergeOpt?.effort).toBe('medium');
      });

      it('should assess different optimization impacts', () => {
        const smallFrag: FragmentDefinition = {
          name: 'Small',
          type: 'User',
          selections: { id: true },
          metadata: { size: 8, complexity: 1, dependencies: [], usageCount: 1, lastUsed: new Date() }
        };

        const frequentFrag: FragmentDefinition = {
          name: 'Frequent',
          type: 'User',
          selections: { id: true, name: true },
          metadata: { size: 20, complexity: 2, dependencies: [], usageCount: 20, lastUsed: new Date() }
        };

        const analysis = FragmentAnalyzer.analyze([smallFrag, frequentFrag]);
        const optimizations = FragmentAnalyzer.suggestOptimizations(analysis);

        const inlineOpt = optimizations.find(o => o.type === 'inline');
        const cacheOpt = optimizations.find(o => o.type === 'cache');

        expect(inlineOpt?.impact).toBe('medium');
        expect(inlineOpt?.effort).toBe('low');
        expect(cacheOpt?.impact).toBe('high');
        expect(cacheOpt?.effort).toBe('low');
      });
    });
  });
});
