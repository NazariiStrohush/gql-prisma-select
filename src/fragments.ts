// Phase 7: Advanced Fragment Handling

export interface FragmentDefinition {
  name: string;
  type: string;                    // GraphQL type (e.g., 'User', 'Post')
  selections: Include;
  variables?: string[];            // Variables used in fragment
  directives?: FragmentDirective[];
  metadata: FragmentMetadata;
}

export interface FragmentMetadata {
  size: number;                    // Estimated size in bytes
  complexity: number;              // Complexity score
  dependencies: string[];          // Other fragments this depends on
  usageCount: number;              // How often this fragment is used
  lastUsed: Date;
}

export interface FragmentDirective {
  name: string;
  arguments?: Record<string, any>;
}

export interface FragmentOverride {
  fragmentName: string;
  excludeFields?: string[];
  includeFields?: string[];
  transformFields?: Record<string, string | ((value: any) => any)>;
  addSelections?: Include;
  removeSelections?: string[];
  condition?: (context: any) => boolean;
}

export interface DynamicFragment {
  name: string;
  condition: (context: any) => boolean;
  selections: Include | ((context: any) => Include);
  priority: number;  // Higher priority overrides lower
}

export interface FragmentAnalysis {
  fragments: FragmentDefinition[];
  unused: string[];                // Fragments defined but not used
  duplicates: DuplicateGroup[];    // Similar fragments
  opportunities: Optimization[];   // Optimization suggestions
}

export interface DuplicateGroup {
  fragments: string[];
  similarity: number;  // 0-1 score
  mergedSize: number;
  savings: number;     // Bytes saved by merging
}

export interface Optimization {
  type: 'inline' | 'merge' | 'cache' | 'deduplicate';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  fragments: string[];
  code?: string;  // Suggested code changes
}

export interface FragmentStats {
  totalFragments: number;
  totalSize: number;
  averageComplexity: number;
  mostUsed: string[];
  leastUsed: string[];
  cacheHitRate?: number;
}

export interface FragmentCacheEntry {
  fragment: FragmentDefinition;
  lastAccessed: number;
  accessCount: number;
  size: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;              // Time to live in milliseconds
  maxSize: number;         // Maximum cache entries
  strategy: 'LRU' | 'LFU' | 'TTL';
  compression?: boolean;   // Compress cached data
}

export interface FragmentOptions {
  overrides?: FragmentOverride[];
  dynamic?: DynamicFragment[];
  caching?: CacheConfig;
  inlining?: {
    enabled: boolean;
    threshold: number;  // Inline fragments smaller than this size (bytes)
  };
  analysis?: {
    enabled: boolean;
    trackUsage: boolean;
  };
}

type Include = Record<string, boolean | SelectInclude>;
interface SelectInclude {
  select?: Include;
  include?: Include;
}

/**
 * Fragment Registry for managing fragment definitions
 */
export class FragmentRegistry {
  private static fragments = new Map<string, FragmentDefinition>();
  private static usageStats = new Map<string, { count: number; lastUsed: Date }>();

  /**
   * Register a fragment definition
   */
  static register(fragment: FragmentDefinition): void {
    this.fragments.set(fragment.name, {
      ...fragment,
      metadata: {
        ...fragment.metadata,
        lastUsed: new Date()
      }
    });

    // Initialize usage stats
    if (!this.usageStats.has(fragment.name)) {
      this.usageStats.set(fragment.name, { count: 0, lastUsed: new Date() });
    }
  }

  /**
   * Get a fragment definition by name
   */
  static get(name: string): FragmentDefinition | null {
    const fragment = this.fragments.get(name);
    if (fragment) {
      // Update usage stats
      const stats = this.usageStats.get(name);
      if (stats) {
        stats.count++;
        stats.lastUsed = new Date();
        fragment.metadata.usageCount = stats.count;
        fragment.metadata.lastUsed = stats.lastUsed;
      }
    }
    return fragment || null;
  }

  /**
   * List fragments, optionally filtered by type
   */
  static list(type?: string): FragmentDefinition[] {
    const fragments = Array.from(this.fragments.values());
    if (type) {
      return fragments.filter(f => f.type === type);
    }
    return fragments;
  }

  /**
   * Remove a fragment from the registry
   */
  static unregister(name: string): void {
    this.fragments.delete(name);
    this.usageStats.delete(name);
  }

  /**
   * Get usage statistics for all fragments
   */
  static getUsageStats(): FragmentStats {
    const fragments = Array.from(this.fragments.values());
    const totalSize = fragments.reduce((sum, f) => sum + f.metadata.size, 0);
    const totalComplexity = fragments.reduce((sum, f) => sum + f.metadata.complexity, 0);

    const sortedByUsage = fragments
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount);

    return {
      totalFragments: fragments.length,
      totalSize,
      averageComplexity: fragments.length > 0 ? totalComplexity / fragments.length : 0,
      mostUsed: sortedByUsage.slice(0, 5).map(f => f.name),
      leastUsed: sortedByUsage.slice(-5).map(f => f.name)
    };
  }

  /**
   * Clear all fragments and stats
   */
  static clear(): void {
    this.fragments.clear();
    this.usageStats.clear();
  }

  /**
   * Check if a fragment exists
   */
  static has(name: string): boolean {
    return this.fragments.has(name);
  }

/**
 * Get fragment count
 */
static size(): number {
  return this.fragments.size;
}
}

/**
 * Fragment Optimizer for inlining, deduplicating, and merging fragments
 */
export class FragmentOptimizer {
  /**
   * Inline small fragments based on usage threshold
   */
  static inline(fragment: FragmentDefinition, usageThreshold: number): Include {
    if (fragment.metadata.usageCount <= usageThreshold) {
      return fragment.selections;
    }
    return { [fragment.name]: true };
  }

  /**
   * Deduplicate selections within fragments
   */
  static deduplicate(selections: Include): Include {
    const result: Include = {};

    for (const [key, value] of Object.entries(selections)) {
      if (typeof value === 'boolean') {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // Recursively deduplicate nested selections
        const deduplicated = this.deduplicate(value.select || value.include || {});
        if (Object.keys(deduplicated).length > 0) {
          result[key] = value.select ? { select: deduplicated } : { include: deduplicated };
        }
      }
    }

    return result;
  }

  /**
   * Merge compatible fragments
   */
  static mergeCompatible(fragments: FragmentDefinition[]): FragmentDefinition {
    if (fragments.length === 0) {
      throw new Error('Cannot merge empty fragment list');
    }

    if (fragments.length === 1) {
      return fragments[0];
    }

    // Check if all fragments are compatible (same type)
    const baseType = fragments[0].type;
    if (!fragments.every(f => f.type === baseType)) {
      throw new Error('Cannot merge fragments of different types');
    }

    // Merge selections
    const mergedSelections = this.mergeSelections(fragments.map(f => f.selections));

    // Calculate merged metadata
    const totalSize = fragments.reduce((sum, f) => sum + f.metadata.size, 0);
    const maxComplexity = Math.max(...fragments.map(f => f.metadata.complexity));
    const allDependencies = Array.from(
      new Set(fragments.flatMap(f => f.metadata.dependencies))
    );

    const mergedFragment: FragmentDefinition = {
      name: `Merged${fragments.map(f => f.name).join('_')}`,
      type: baseType,
      selections: mergedSelections,
      metadata: {
        size: totalSize,
        complexity: maxComplexity,
        dependencies: allDependencies,
        usageCount: Math.max(...fragments.map(f => f.metadata.usageCount)),
        lastUsed: new Date()
      }
    };

    return mergedFragment;
  }

  /**
   * Optimize fragment for caching
   */
  static optimizeForCaching(fragment: FragmentDefinition): FragmentDefinition {
    // Remove unused metadata, sort selections for consistent hashing
    const optimizedSelections = this.sortSelections(fragment.selections);

    return {
      ...fragment,
      selections: optimizedSelections,
      metadata: {
        ...fragment.metadata,
        // Keep only essential metadata for caching
        dependencies: fragment.metadata.dependencies.filter(dep => this.isUsedInSelections(dep, optimizedSelections))
      }
    };
  }

  /**
   * Merge multiple selection objects
   */
  static mergeSelections(selections: Include[]): Include {
    const result: Include = {};

    for (const selection of selections) {
      for (const [key, value] of Object.entries(selection)) {
        if (typeof value === 'boolean') {
          result[key] = result[key] || value;
        } else if (typeof value === 'object' && value !== null) {
          const existing = result[key];
          if (typeof existing === 'object' && existing !== null) {
            // Merge nested selections
            const merged = this.mergeSelections([
              existing.select || existing.include || {},
              value.select || value.include || {}
            ]);
            result[key] = value.select ? { select: merged } : { include: merged };
          } else {
            result[key] = value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Sort selections for consistent ordering
   */
  private static sortSelections(selections: Include): Include {
    const sorted: Include = {};

    // Sort keys alphabetically
    const sortedKeys = Object.keys(selections).sort();

    for (const key of sortedKeys) {
      const value = selections[key];
      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested) {
          sorted[key] = value.select
            ? { select: this.sortSelections(nested) }
            : { include: this.sortSelections(nested) };
        } else {
          sorted[key] = value;
        }
      } else {
        sorted[key] = value;
      }
    }

    return sorted;
  }

  /**
   * Check if a dependency is actually used in selections
   */
  private static isUsedInSelections(dependency: string, selections: Include): boolean {
    for (const [key, value] of Object.entries(selections)) {
      if (key === dependency) {
        return true;
      }
      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested && this.isUsedInSelections(dependency, nested)) {
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Fragment Overrider for customizing fragments
 */
export class FragmentOverrider {
  /**
   * Apply a single override to a fragment
   */
  static apply(fragment: FragmentDefinition, override: FragmentOverride): FragmentDefinition {
    // Check condition if provided
    if (override.condition && !override.condition({})) {
      return fragment;
    }

    let selections = { ...fragment.selections };

    // Exclude fields
    if (override.excludeFields) {
      selections = this.excludeFields(selections, override.excludeFields);
    }

    // Include additional fields
    if (override.includeFields) {
      selections = { ...selections, ...this.createBooleanSelections(override.includeFields) };
    }

    // Add nested selections
    if (override.addSelections) {
      selections = this.mergeSelections(selections, override.addSelections);
    }

    // Remove selections
    if (override.removeSelections) {
      selections = this.removeSelections(selections, override.removeSelections);
    }

    // Transform field names
    if (override.transformFields) {
      selections = this.transformFieldNames(selections, override.transformFields);
    }

    return {
      ...fragment,
      selections,
      metadata: {
        ...fragment.metadata,
        size: this.calculateSize(selections)
      }
    };
  }

  /**
   * Apply multiple overrides to a fragment
   */
  static applyMultiple(fragment: FragmentDefinition, overrides: FragmentOverride[]): FragmentDefinition {
    return overrides.reduce((result, override) => this.apply(result, override), fragment);
  }

  /**
   * Apply overrides to multiple fragments
   */
  static applyToMultiple(fragments: FragmentDefinition[], overrides: FragmentOverride[]): FragmentDefinition[] {
    return fragments.map(fragment => {
      const applicableOverrides = overrides.filter(o => o.fragmentName === fragment.name);
      return applicableOverrides.length > 0
        ? this.applyMultiple(fragment, applicableOverrides)
        : fragment;
    });
  }

  /**
   * Exclude fields from selections
   */
  private static excludeFields(selections: Include, excludeFields: string[]): Include {
    const result: Include = {};

    for (const [key, value] of Object.entries(selections)) {
      if (!excludeFields.includes(key)) {
        if (typeof value === 'object' && value !== null) {
          const nested = value.select || value.include;
          if (nested) {
            const filteredNested = this.excludeFields(nested, excludeFields);
            if (Object.keys(filteredNested).length > 0) {
              result[key] = value.select ? { select: filteredNested } : { include: filteredNested };
            }
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Remove selections by path
   */
  private static removeSelections(selections: Include, removePaths: string[]): Include {
    const result: Include = {};

    for (const [key, value] of Object.entries(selections)) {
      // Check if this exact key should be removed
      const exactMatch = removePaths.includes(key);

      if (exactMatch) {
        // Skip this key entirely
        continue;
      }

      // Check if there are nested paths to remove
      const nestedRemovePaths = removePaths
        .filter(path => path.startsWith(key + '.'))
        .map(path => path.substring(key.length + 1));

      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested && nestedRemovePaths.length > 0) {
          // Filter nested selections
          const filteredNested = this.removeSelections(nested, nestedRemovePaths);
          if (Object.keys(filteredNested).length > 0) {
            result[key] = value.select ? { select: filteredNested } : { include: filteredNested };
          }
        } else {
          // No nested removals or not a nested object, keep as is
          result[key] = value;
        }
      } else {
        // Not an object, keep as is
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Transform field names
   */
  private static transformFieldNames(
    selections: Include,
    transforms: Record<string, string | ((value: any) => any)>
  ): Include {
    const result: Include = {};

    for (const [key, value] of Object.entries(selections)) {
      const transform = transforms[key];
      let newKey = key;

      if (transform) {
        if (typeof transform === 'string') {
          newKey = transform;
        } else if (typeof transform === 'function') {
          newKey = transform(key);
        }
      }

      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested) {
          const transformedNested = this.transformFieldNames(nested, transforms);
          result[newKey] = value.select ? { select: transformedNested } : { include: transformedNested };
        } else {
          result[newKey] = value;
        }
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }

  /**
   * Create boolean selections from field names
   */
  private static createBooleanSelections(fields: string[]): Include {
    const result: Include = {};
    for (const field of fields) {
      result[field] = true;
    }
    return result;
  }

  /**
   * Merge selections
   */
  private static mergeSelections(base: Include, additional: Include): Include {
    return FragmentOptimizer.mergeSelections([base, additional]);
  }

/**
 * Calculate size of selections
 */
private static calculateSize(selections: Include): number {
  const jsonString = JSON.stringify(selections);
  return Buffer.byteLength(jsonString, 'utf8');
}
}

/**
 * Fragment Cache for performance optimization
 */
export class FragmentCache {
  private cache = new Map<string, FragmentCacheEntry>();
  private config: Required<CacheConfig>;

  constructor(config: CacheConfig) {
    this.config = {
      enabled: config.enabled ?? true,
      ttl: config.ttl ?? 300000, // 5 minutes default
      maxSize: config.maxSize ?? 1000,
      strategy: config.strategy ?? 'LRU',
      compression: config.compression ?? false
    };
  }

  /**
   * Get a fragment from cache
   */
  get(key: string): FragmentDefinition | null {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check TTL
    if (Date.now() - entry.lastAccessed > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return entry.fragment;
  }

  /**
   * Set a fragment in cache
   */
  set(key: string, fragment: FragmentDefinition): void {
    if (!this.config.enabled) {
      return;
    }

    // Check cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictEntries();
    }

    const entry: FragmentCacheEntry = {
      fragment,
      lastAccessed: Date.now(),
      accessCount: 1,
      size: fragment.metadata.size
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries by pattern (matches against fragment name or type)
   */
  invalidate(pattern: string): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.fragment.name.includes(pattern) || entry.fragment.type.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get fragments by type
   */
  getByType(type: string): FragmentDefinition[] {
    const result: FragmentDefinition[] = [];

    for (const entry of this.cache.values()) {
      if (entry.fragment.type === type) {
        result.push(entry.fragment);
      }
    }

    return result;
  }

  /**
   * Get fragments by complexity range
   */
  getByComplexity(min: number, max: number): FragmentDefinition[] {
    const result: FragmentDefinition[] = [];

    for (const entry of this.cache.values()) {
      const complexity = entry.fragment.metadata.complexity;
      if (complexity >= min && complexity <= max) {
        result.push(entry.fragment);
      }
    }

    return result;
  }

  /**
   * Get most used fragments
   */
  getMostUsed(limit: number): FragmentDefinition[] {
    const entries = Array.from(this.cache.values());

    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(entry => entry.fragment);
  }

  /**
   * Get cache statistics
   */
  getStats(): FragmentStats & { cacheHitRate?: number; totalEntries: number; cacheSize: number } {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

    return {
      totalFragments: entries.length,
      totalSize,
      averageComplexity: entries.length > 0
        ? entries.reduce((sum, entry) => sum + entry.fragment.metadata.complexity, 0) / entries.length
        : 0,
      mostUsed: this.getMostUsed(5).map(f => f.name),
      leastUsed: entries
        .sort((a, b) => a.accessCount - b.accessCount)
        .slice(0, 5)
        .map(entry => entry.fragment.name),
      totalEntries: entries.length,
      cacheSize: totalSize
    };
  }

  /**
   * Generate cache key for a fragment
   */
  static generateKey(fragment: FragmentDefinition): string {
    const sortedSelections = FragmentOptimizer.optimizeForCaching(fragment).selections;
    const content = JSON.stringify({
      name: fragment.name,
      type: fragment.type,
      selections: sortedSelections
    });
    return this.hashString(content);
  }

  /**
   * Evict entries based on cache strategy
   */
  private evictEntries(): void {
    if (this.cache.size === 0) {
      return;
    }

    const entries = Array.from(this.cache.entries());

    switch (this.config.strategy) {
      case 'LRU':
        // Remove least recently used
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'LFU':
        // Remove least frequently used
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'TTL':
        // Remove expired entries
        const now = Date.now();
        const expiredEntries = entries.filter(([, entry]) =>
          now - entry.lastAccessed > this.config.ttl
        );
        expiredEntries.forEach(([key]) => this.cache.delete(key));
        return;
      default:
        // Default to LRU
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    }

    // Remove the first entry (least desirable)
    if (entries.length > 0) {
      this.cache.delete(entries[0][0]);
    }
  }

  /**
   * Calculate fragment size including metadata
   */
  private calculateFragmentSize(fragment: FragmentDefinition): number {
    const content = JSON.stringify(fragment.selections);
    return Buffer.byteLength(content, 'utf8');
  }

/**
 * Simple string hashing function
 */
private static hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
}

/**
 * Fragment Analyzer for optimization suggestions
 */
export class FragmentAnalyzer {
  /**
   * Analyze fragments and provide optimization suggestions
   */
  static analyze(fragments: FragmentDefinition[]): FragmentAnalysis {
    const unused = this.findUnusedFragments(fragments);
    const duplicates = this.findDuplicateFragments(fragments);
    const opportunities = this.generateOptimizationOpportunities(fragments, duplicates);

    return {
      fragments,
      unused: unused.map(f => f.name),
      duplicates,
      opportunities
    };
  }

  /**
   * Suggest optimizations based on analysis
   */
  static suggestOptimizations(analysis: FragmentAnalysis): Optimization[] {
    const optimizations: Optimization[] = [];

    // Suggest inlining small fragments
    const smallFragments = analysis.fragments.filter(f => f.metadata.size < 100);
    if (smallFragments.length > 0) {
      optimizations.push({
        type: 'inline',
        description: `Inline ${smallFragments.length} small fragments (< 100 bytes)`,
        impact: 'medium',
        effort: 'low',
        fragments: smallFragments.map(f => f.name),
        code: smallFragments.map(f => `// Inline ${f.name} directly into queries`).join('\n')
      });
    }

    // Suggest merging duplicate fragments
    if (analysis.duplicates.length > 0) {
      const totalSavings = analysis.duplicates.reduce((sum, group) => sum + group.savings, 0);
      optimizations.push({
        type: 'merge',
        description: `Merge ${analysis.duplicates.length} groups of duplicate fragments (save ${totalSavings} bytes)`,
        impact: 'high',
        effort: 'medium',
        fragments: analysis.duplicates.flatMap(g => g.fragments)
      });
    }

    // Suggest caching frequently used fragments
    const frequentlyUsed = analysis.fragments.filter(f => f.metadata.usageCount > 10);
    if (frequentlyUsed.length > 0) {
      optimizations.push({
        type: 'cache',
        description: `Cache ${frequentlyUsed.length} frequently used fragments`,
        impact: 'high',
        effort: 'low',
        fragments: frequentlyUsed.map(f => f.name),
        code: `const cache = new FragmentCache({ enabled: true, ttl: 300000 });`
      });
    }

    return optimizations;
  }

  /**
   * Find fragments that are defined but not used
   */
  private static findUnusedFragments(fragments: FragmentDefinition[]): FragmentDefinition[] {
    return fragments.filter(f => f.metadata.usageCount === 0);
  }

  /**
   * Find duplicate fragments based on selection similarity
   */
  private static findDuplicateFragments(fragments: FragmentDefinition[]): DuplicateGroup[] {
    const duplicates: DuplicateGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < fragments.length; i++) {
      const fragmentA = fragments[i];
      if (processed.has(fragmentA.name)) continue;

      const similarFragments: FragmentDefinition[] = [];

      for (let j = i + 1; j < fragments.length; j++) {
        const fragmentB = fragments[j];
        if (processed.has(fragmentB.name)) continue;

        const similarity = this.calculateSimilarity(fragmentA, fragmentB);
        if (similarity > 0.5) { // 50% similarity threshold
          similarFragments.push(fragmentB);
        }
      }

      if (similarFragments.length > 0) {
        const group: DuplicateGroup = {
          fragments: [fragmentA.name, ...similarFragments.map(f => f.name)],
          similarity: this.calculateSimilarity(fragmentA, similarFragments[0]),
          mergedSize: this.calculateMergedSize([fragmentA, ...similarFragments]),
          savings: this.calculateSavings([fragmentA, ...similarFragments])
        };
        duplicates.push(group);
        processed.add(fragmentA.name);
        similarFragments.forEach(f => processed.add(f.name));
      }
    }

    return duplicates;
  }

  /**
   * Generate optimization opportunities
   */
  private static generateOptimizationOpportunities(
    fragments: FragmentDefinition[],
    duplicates: DuplicateGroup[]
  ): Optimization[] {
    const opportunities: Optimization[] = [];

    // Check for deduplication opportunities
    if (duplicates.length > 0) {
      opportunities.push({
        type: 'deduplicate',
        description: `Remove ${duplicates.length} duplicate fragment groups`,
        impact: 'high',
        effort: 'medium',
        fragments: duplicates.flatMap(g => g.fragments)
      });
    }

    return opportunities;
  }

  /**
   * Calculate similarity between two fragments
   */
  private static calculateSimilarity(a: FragmentDefinition, b: FragmentDefinition): number {
    if (a.type !== b.type) return 0;

    const selectionsA = JSON.stringify(a.selections);
    const selectionsB = JSON.stringify(b.selections);

    if (selectionsA === selectionsB) return 1;

    // Simple similarity based on common fields
    const fieldsA = new Set(Object.keys(a.selections));
    const fieldsB = new Set(Object.keys(b.selections));

    const intersection = new Set([...fieldsA].filter(x => fieldsB.has(x)));
    const union = new Set([...fieldsA, ...fieldsB]);

    return intersection.size / union.size;
  }

  /**
   * Calculate size of merged fragments
   */
  private static calculateMergedSize(fragments: FragmentDefinition[]): number {
    const merged = FragmentOptimizer.mergeCompatible(fragments);
    return merged.metadata.size;
  }

  /**
   * Calculate bytes saved by merging fragments
   */
  private static calculateSavings(fragments: FragmentDefinition[]): number {
    const individualSize = fragments.reduce((sum, f) => sum + f.metadata.size, 0);
    const mergedSize = this.calculateMergedSize(fragments);
    return Math.max(0, individualSize - mergedSize);
  }
}

/**
 * Dynamic Fragment Handler for conditional fragment inclusion
 */
export class DynamicFragmentHandler {
  /**
   * Evaluate dynamic fragments based on context
   */
  static evaluate(fragments: DynamicFragment[], context: any): FragmentDefinition[] {
    const result: FragmentDefinition[] = [];

    // Sort by priority (lower number = higher priority)
    const sortedFragments = [...fragments].sort((a, b) => a.priority - b.priority);

    for (const dynamicFragment of sortedFragments) {
      if (this.evaluateCondition(dynamicFragment.condition, context)) {
        const selections = this.resolveSelections(dynamicFragment.selections, context);

        const fragment: FragmentDefinition = {
          name: dynamicFragment.name,
          type: 'Dynamic', // Dynamic fragments don't have a specific GraphQL type
          selections,
          metadata: {
            size: this.calculateSize(selections),
            complexity: this.calculateComplexity(selections),
            dependencies: [],
            usageCount: 1,
            lastUsed: new Date()
          }
        };

        result.push(fragment);
      }
    }

    return result;
  }

  /**
   * Merge dynamic fragments with a base fragment
   */
  static mergeDynamic(baseFragment: FragmentDefinition, dynamic: DynamicFragment[]): FragmentDefinition {
    const dynamicFragments = this.evaluate(dynamic, {});
    if (dynamicFragments.length === 0) {
      return baseFragment;
    }

    // Ensure dynamic fragments have the same type as the base fragment
    const typedDynamicFragments = dynamicFragments.map(df => ({
      ...df,
      type: baseFragment.type
    }));

    // Merge all dynamic fragments with the base fragment
    const allFragments = [baseFragment, ...typedDynamicFragments];
    return FragmentOptimizer.mergeCompatible(allFragments);
  }

  /**
   * Check if any dynamic fragment matches the current context
   */
  static hasMatchingFragment(fragments: DynamicFragment[], context: any): boolean {
    return fragments.some(fragment => this.evaluateCondition(fragment.condition, context));
  }

  /**
   * Get all matching dynamic fragments for a context
   */
  static getMatchingFragments(fragments: DynamicFragment[], context: any): DynamicFragment[] {
    return fragments.filter(fragment => this.evaluateCondition(fragment.condition, context));
  }

  /**
   * Evaluate a condition function with error handling
   */
  private static evaluateCondition(condition: (context: any) => boolean, context: any): boolean {
    try {
      return condition(context);
    } catch (error) {
      console.warn(`Error evaluating dynamic fragment condition: ${error}`);
      return false;
    }
  }

  /**
   * Resolve selections (handle function-based selections)
   */
  private static resolveSelections(selections: Include | ((context: any) => Include), context: any): Include {
    if (typeof selections === 'function') {
      try {
        return selections(context);
      } catch (error) {
        console.warn(`Error resolving dynamic fragment selections: ${error}`);
        return {};
      }
    }
    return selections;
  }

  /**
   * Calculate complexity of selections
   */
  private static calculateComplexity(selections: Include): number {
    let complexity = 0;

    for (const [key, value] of Object.entries(selections)) {
      complexity += 1; // Base complexity for each field

      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested) {
          complexity += this.calculateComplexity(nested) * 2; // Nested selections are more complex
        }
      }
    }

    return complexity;
  }

  /**
   * Calculate size of selections
   */
  private static calculateSize(selections: Include): number {
    const jsonString = JSON.stringify(selections);
    return Buffer.byteLength(jsonString, 'utf8');
  }
}
