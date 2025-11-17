import { GQLPrismaSelect } from '../GQLPrismaSelect';
import {
  createMockGraphQLInfo,
  createFieldNode,
  createFragmentDefinition,
} from './helpers/mockGraphQLInfo';

/**
 * Performance Benchmarks for GQLPrismaSelect
 *
 * This file contains benchmarks to measure and validate performance bottlenecks
 * identified in the analysis.
 */

describe('Performance Benchmarks', () => {
  describe('Path Access Optimization', () => {
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

    it('should measure repeated path access performance', () => {
      const iterations = 10000;
      const path = 'collection.User';

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        GQLPrismaSelect.get(path, selection.select);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Path access benchmark:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time: ${avgTime.toFixed(4)}ms per call`);
      console.log(`  Calls per second: ${(1000 / avgTime).toFixed(0)}`);

      // Should be fast enough for production use
      expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per call
    });
  });

  describe('Fragment Processing Performance', () => {
    const createFragmentHeavyInfo = (fragmentCount: number, fieldCount: number) => {
      const fragments: Record<string, any> = {};
      const fieldNodes: any[] = [];

      // Create multiple fragments
      for (let i = 0; i < fragmentCount; i++) {
        const fragmentName = `Fragment${i}`;
        const fragmentFields = Array.from({ length: fieldCount }, (_, j) =>
          createFieldNode(`field${i}_${j}`)
        );
        fragments[fragmentName] = createFragmentDefinition(fragmentName, fragmentFields);

        // Use each fragment in the query
        fieldNodes.push({
          kind: 'FragmentSpread',
          name: { value: fragmentName },
        });
      }

      return createMockGraphQLInfo(fieldNodes, fragments);
    };

    it('should measure fragment processing performance', () => {
      const fragmentCount = 20;
      const fieldCount = 10;
      const info = createFragmentHeavyInfo(fragmentCount, fieldCount);

      const startTime = performance.now();

      const result = new GQLPrismaSelect(info);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      console.log(`Fragment processing benchmark:`);
      console.log(`  Fragments: ${fragmentCount}`);
      console.log(`  Fields per fragment: ${fieldCount}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);

      expect(result).toBeInstanceOf(GQLPrismaSelect);
      expect(totalTime).toBeLessThan(100); // Should complete in reasonable time
    });
  });

  describe('Deep Nesting Performance', () => {
    const createDeepNestedInfo = (depth: number) => {
      let currentNode: any = createFieldNode('value');

      // Build nested structure from bottom up
      for (let i = depth - 1; i >= 0; i--) {
        currentNode = createFieldNode(`level${i}`, [currentNode]);
      }

      return createMockGraphQLInfo([currentNode]);
    };

    it('should measure deep nesting performance', () => {
      const depths = [5, 10, 15, 20];

      depths.forEach(depth => {
        const info = createDeepNestedInfo(depth);

        const startTime = performance.now();

        const result = new GQLPrismaSelect(info);

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        console.log(`Deep nesting benchmark (depth ${depth}):`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);

        expect(result).toBeInstanceOf(GQLPrismaSelect);
        expect(totalTime).toBeLessThan(50); // Should handle deep nesting efficiently
      });
    });

    it('should measure memory usage during deep nesting', () => {
      const depth = 50;
      const info = createDeepNestedInfo(depth);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const startMemory = process.memoryUsage().heapUsed;

      const result = new GQLPrismaSelect(info);

      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = endMemory - startMemory;

      console.log(`Memory usage benchmark (depth ${depth}):`);
      console.log(`  Memory delta: ${(memoryDelta / 1024 / 1024).toFixed(2)} MB`);

      expect(result).toBeInstanceOf(GQLPrismaSelect);
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  describe('Large Selection Set Performance', () => {
    const createLargeSelectionInfo = (fieldCount: number) => {
      const fieldNodes = Array.from({ length: fieldCount }, (_, i) =>
        createFieldNode(`field${i}`)
      );
      return createMockGraphQLInfo(fieldNodes);
    };

    it('should measure large selection set performance', () => {
      const fieldCounts = [50, 100, 200];

      fieldCounts.forEach(count => {
        const info = createLargeSelectionInfo(count);

        const startTime = performance.now();

        const result = new GQLPrismaSelect(info);

        const endTime = performance.now();
        const totalTime = endTime - startTime;

        console.log(`Large selection benchmark (${count} fields):`);
        console.log(`  Total time: ${totalTime.toFixed(2)}ms`);

        expect(result).toBeInstanceOf(GQLPrismaSelect);
        expect(totalTime).toBeLessThan(100); // Should handle large selections efficiently
      });
    });
  });

  describe('Multiple Instantiation Performance', () => {
    const createSimpleInfo = () => {
      const fieldNodes = [
        createFieldNode('id'),
        createFieldNode('email'),
        createFieldNode('Posts', [
          createFieldNode('id'),
          createFieldNode('content'),
        ]),
      ];
      return createMockGraphQLInfo(fieldNodes);
    };

    it('should measure multiple instantiation performance', () => {
      const iterations = 1000;
      const info = createSimpleInfo();

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        new GQLPrismaSelect(info);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTime = totalTime / iterations;

      console.log(`Multiple instantiation benchmark:`);
      console.log(`  Iterations: ${iterations}`);
      console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`  Average time: ${avgTime.toFixed(4)}ms per instantiation`);

      expect(avgTime).toBeLessThan(1); // Should be fast for repeated instantiations
    });
  });
});
