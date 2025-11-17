import { Kind } from 'graphql/language/kinds';
import type { GraphQLResolveInfo } from 'types';
import type { GraphQLSchema } from 'graphql';
import { TransformationEngine, ResultTransformer } from './transforms';
import {
  FragmentOptions,
  FragmentRegistry,
  FragmentOptimizer,
  FragmentOverrider,
  DynamicFragmentHandler,
  FragmentCache,
  FragmentAnalyzer,
  FragmentDefinition,
  FragmentStats,
  FragmentAnalysis
} from './fragments';
import {
  TypedOptions,
  TypeValidationOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TypedQueryBuilderOptions,
  TypeCheckContext,
  PrismaSelect,
  SafeSelect,
  InferSelection
} from './types';

interface SelectInclude {
  select?: Include;
  include?: Include;
}

type Include = Record<string, boolean | SelectInclude>;

// Phase 2: Query Transformation & Field Mapping
export type FieldTransform = string | ((value: any, context: TransformContext) => any);

export interface TransformContext {
  fieldName: string;
  modelName: string;
  selectionPath: string[];
  originalValue: any;
}

export interface FieldTransforms {
  [graphqlField: string]: FieldTransform;
}

export interface TransformOptions {
  fieldTransforms?: FieldTransforms;
  defaultTransforms?: ('camelToSnake' | 'snakeToCamel' | 'pluralize' | 'singularize')[];
  transformRelations?: boolean;
  transformEnums?: boolean;
  caseSensitive?: boolean;
  customTransformers?: Record<string, Function>;
}

export class GQLPrismaSelect<S = any, I = any> {
  private info: GraphQLResolveInfo;

  public originalInclude?: I;
  public originalSelect?: S;
  public include?: I;
  public select?: S;
  private excludeFields: string[] = [];
  private readonly fragments: Record<string, Include>;
  private transformationEngine?: TransformationEngine;
  private resultTransformer?: ResultTransformer;
  private fragmentOptions?: FragmentOptions;
  private fragmentCache?: FragmentCache;

  constructor(
    info: GraphQLResolveInfo,
    params: {
      excludeFields?: string[];
      get?: string | string[];
      transforms?: TransformOptions;
      fragments?: FragmentOptions;
    } = {}
  ) {
    this.excludeFields = params.excludeFields || ['__typename'];
    this.info = info;
    this.fragmentOptions = params.fragments;

    // Initialize transformation engine if transforms are provided
    if (params.transforms) {
      this.transformationEngine = new TransformationEngine(params.transforms);
      this.resultTransformer = new ResultTransformer(this.transformationEngine);
    }

    // Initialize fragment cache if enabled
    if (params.fragments?.caching?.enabled) {
      this.fragmentCache = new FragmentCache(params.fragments.caching);
    }

    // Parse and save fragments with enhanced processing
    this.fragments = this.processFragments();
    const res = this.transformPrismaIncludeFromQuery(info);

    // Save original values
    this.originalInclude = res.include as I;
    this.originalSelect = res.select as S;
    // Get values in case we want to get a specific value by path or key
    const customSelection = GQLPrismaSelect.get(
      params.get,
      res.select || res.include
    );
    const { include, select } = this.selectOrInclude(customSelection);

    // Apply transformations if engine is available
    if (this.transformationEngine) {
      const transformedSelection = this.transformationEngine.transformSelections(customSelection);
      const transformed = this.selectOrInclude(transformedSelection);
      this.include = transformed.include as I;
      this.select = transformed.select as S;
    } else {
      this.include = include as I;
      this.select = select as S;
    }
  }

  /**
   * Create type-safe selector with transforms
   */
  static withTransforms(
    info: GraphQLResolveInfo,
    transforms: TransformOptions,
    params?: { excludeFields?: string[]; get?: string | string[] }
  ): GQLPrismaSelect {
    return new GQLPrismaSelect(info, {
      ...params,
      transforms
    });
  }

  private processFragments(): Record<string, Include> {
    // Handle undefined or null fragments
    if (!this.info.fragments) {
      return {};
    }

    const processedFragments: Record<string, Include> = {};

    // Process each fragment with advanced features
    for (const [fragmentName, fragmentData] of Object.entries(this.info.fragments)) {
      if (fragmentData?.selectionSet?.selections) {
        const baseSelections = this.transformFragmentSelections(fragmentData.selectionSet.selections, processedFragments);

        // Apply fragment options if configured
        let processedSelections = baseSelections;

        if (this.fragmentOptions) {
          // Apply overrides for this specific fragment
          const override = this.fragmentOptions.overrides?.find(o => o.fragmentName === fragmentName);
          if (override) {
            const fragmentDef: FragmentDefinition = {
              name: fragmentName,
              type: fragmentData.typeCondition?.name?.value || 'Unknown',
              selections: baseSelections,
              metadata: {
                size: this.calculateFragmentSize(baseSelections),
                complexity: this.calculateFragmentComplexity(baseSelections),
                dependencies: this.extractFragmentDependencies(fragmentData.selectionSet.selections),
                usageCount: 0,
                lastUsed: new Date()
              }
            };

            processedSelections = FragmentOverrider.apply(fragmentDef, override).selections;
          }

          // Apply dynamic fragments
          if (this.fragmentOptions.dynamic) {
            const dynamicFragments = DynamicFragmentHandler.evaluate(this.fragmentOptions.dynamic, {});
            for (const dynamic of dynamicFragments) {
              if (dynamic.name === fragmentName) {
                processedSelections = FragmentOptimizer.mergeSelections([processedSelections, dynamic.selections]);
              }
            }
          }

          // Apply inlining if configured
          if (this.fragmentOptions.inlining?.enabled) {
            const fragmentSize = this.calculateFragmentSize(processedSelections);
            if (fragmentSize < (this.fragmentOptions.inlining.threshold || 1000)) {
              // Fragment is small enough to inline - we'll handle this during selection processing
              processedSelections = FragmentOptimizer.inline(
                {
                  name: fragmentName,
                  type: fragmentData.typeCondition?.name?.value || 'Unknown',
                  selections: processedSelections,
                  metadata: {
                    size: fragmentSize,
                    complexity: this.calculateFragmentComplexity(processedSelections),
                    dependencies: [],
                    usageCount: 0,
                    lastUsed: new Date()
                  }
                },
                1 // Always inline since size check already passed
              ) as Include;
            }
          }
        }

        processedFragments[fragmentName] = processedSelections;

        // Register fragment in registry if analysis is enabled
        if (this.fragmentOptions?.analysis?.trackUsage) {
          const fragmentDef: FragmentDefinition = {
            name: fragmentName,
            type: fragmentData.typeCondition?.name?.value || 'Unknown',
            selections: processedSelections,
            metadata: {
              size: this.calculateFragmentSize(processedSelections),
              complexity: this.calculateFragmentComplexity(processedSelections),
              dependencies: this.extractFragmentDependencies(fragmentData.selectionSet.selections),
              usageCount: 0,
              lastUsed: new Date()
            }
          };

          FragmentRegistry.register(fragmentDef);
        }
      }
    }

    return processedFragments;
  }

  private getFragments(): Record<string, Include> {
    // Handle undefined or null fragments
    if (!this.info.fragments) {
      return {};
    }
    // Transform fragments - use a helper that can handle nested fragment spreads
    // by accessing this.info.fragments directly during parsing
    const transformFragmentSelections = (selections: readonly any[]): Include => {
      return (
        selections?.reduce((acc, selection) => {
          const { name, selectionSet } = selection;
          const { value } = name;
          const { selections: nestedSelections } = selectionSet || {};
          if (selection.kind === Kind.FIELD) {
            if (this.excludeFields.includes(value)) {
              return acc;
            }
            acc[value] = this.selectOrIncludeOrBoolean(
              transformFragmentSelections(nestedSelections)
            );
          } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
            // During fragment parsing, use this.info.fragments directly
            if (this.info.fragments?.[value]?.selectionSet?.selections) {
              const fragmentSpreadFields = transformFragmentSelections(
                this.info.fragments[value].selectionSet.selections
              );
              if (fragmentSpreadFields) {
                acc = { ...acc, ...fragmentSpreadFields };
              }
            }
          }
          return acc;
        }, {}) || {}
      );
    };

    return Object.entries(this.info.fragments).reduce<Record<string, Include>>(
      (acc, [fragmentName, fragmentData]) => {
        // Handle undefined or null selectionSet
        if (fragmentData?.selectionSet?.selections) {
          acc[fragmentName] = transformFragmentSelections(
            fragmentData.selectionSet.selections
          );
        }
        return acc;
      },
      {}
    );
  }

  private selectOrIncludeOrBoolean(selections: Include = {}) {
    const values = Object.values(selections);
    if (!values.length) {
      return true;
    }
    return this.selectOrInclude(selections);
  }

  private selectOrInclude(selections: object = {}) {
    const values = Object.values(selections);
    return values.some((v) => typeof v === 'boolean')
      ? { select: selections, include: undefined }
      : { include: selections, select: undefined };
  }

  private transformSelections(selections?: readonly any[]): Include {
    const res =
      selections?.reduce((acc, selection) => {
        // Get values
        const { name, selectionSet } = selection;
        const { value } = name;
        const { selections } = selectionSet || {};
        // Check for type
        if (selection.kind === Kind.FIELD) {
          if (this.excludeFields.includes(value)) {
            // Skip excluded field, return accumulator as-is
            return acc;
          }

          acc[value] = this.selectOrIncludeOrBoolean(
            this.transformSelections(selections)
          );
        } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
          // Check if fragment exists in processed fragments
          const fragment = this.fragments[value];
          if (fragment) {
            // Fragment is already processed with advanced features, merge it directly
            acc = { ...acc, ...fragment };

            // Check if fragment should be cached
            if (this.fragmentCache) {
              const cacheKey = FragmentCache.generateKey({
                name: value,
                type: 'Unknown', // Type not needed for caching key
                selections: fragment,
                metadata: {
                  size: this.calculateFragmentSize(fragment),
                  complexity: this.calculateFragmentComplexity(fragment),
                  dependencies: [],
                  usageCount: 0,
                  lastUsed: new Date()
                }
              });

              // Try to get from cache first
              const cachedFragment = this.fragmentCache.get(cacheKey);
              if (cachedFragment) {
                acc = { ...acc, ...cachedFragment.selections };
              } else {
                // Cache the fragment for future use
                this.fragmentCache.set(cacheKey, {
                  name: value,
                  type: 'Unknown',
                  selections: fragment,
                  metadata: {
                    size: this.calculateFragmentSize(fragment),
                    complexity: this.calculateFragmentComplexity(fragment),
                    dependencies: [],
                    usageCount: 0,
                    lastUsed: new Date()
                  }
                });
              }
            }
          }
          // If fragment doesn't exist, skip it (don't throw error)
        }
        return acc;
      }, {}) || {};
    return res;
  }

  private transformPrismaIncludeFromQuery(info: GraphQLResolveInfo) {
    const mapped = this.transformSelections(
      info?.fieldNodes[0]?.selectionSet?.selections
    );

    const res = this.selectOrInclude(mapped);
    return res;
  }

  private static pathCache = new Map<string, string[]>();

  public static get(_path?: string | string[], _obj?: any): any {
    if (!_path?.length) {
      return _obj;
    }
    // Handle undefined or null object
    if (!_obj || typeof _obj !== 'object') {
      return undefined;
    }
    let path: string[];
    if (typeof _path === 'string') {
      // Cache parsed paths to avoid repeated string splitting
      path = GQLPrismaSelect.pathCache.get(_path) ||
             GQLPrismaSelect.pathCache.set(_path, _path.split('.')).get(_path)!;
    } else {
      path = _path;
    }
    const [key, ...rest] = path;
    const obj = _obj[key];
    // Check if obj exists before accessing its properties
    if (!obj || typeof obj !== 'object') {
      return undefined;
    }
    return GQLPrismaSelect.get(rest, obj.select || obj.include);
  }

  /**
   * Transforms result data back to GraphQL format
   * @param result The result data from Prisma query
   * @returns Transformed result data
   */
  transformResult(result: any): any {
    if (!this.resultTransformer) {
      return result;
    }

    const selections = this.originalSelect || this.originalInclude;
    if (!selections) {
      return result;
    }

    return this.resultTransformer.transform(result, selections as Record<string, any>);
  }

  /**
   * Gets the transformation engine instance
   */
  getTransformationEngine(): TransformationEngine | undefined {
    return this.transformationEngine;
  }


  // Helper methods for fragment processing
  private transformFragmentSelections(selections: readonly any[], processedFragments?: Record<string, Include>): Include {
    return selections?.reduce((acc, selection) => {
      const { name, selectionSet } = selection;
      const { value } = name;
      const { selections: nestedSelections } = selectionSet || {};

      if (selection.kind === Kind.FIELD) {
        if (this.excludeFields.includes(value)) {
          return acc;
        }
        acc[value] = this.selectOrIncludeOrBoolean(
          this.transformFragmentSelections(nestedSelections, processedFragments)
        );
      } else if (selection.kind === Kind.FRAGMENT_SPREAD) {
        // Use processed fragments parameter if available, otherwise fall back to this.fragments
        const fragment = processedFragments ? processedFragments[value] : this.fragments[value];
        if (fragment) {
          acc = { ...acc, ...fragment };
        }
      }
      return acc;
    }, {}) || {};
  }

  private calculateFragmentSize(selections: Include): number {
    const jsonString = JSON.stringify(selections);
    return Buffer.byteLength(jsonString, 'utf8');
  }

  private calculateFragmentComplexity(selections: Include): number {
    let complexity = 0;

    for (const [key, value] of Object.entries(selections)) {
      complexity += 1; // Base complexity for each field

      if (typeof value === 'object' && value !== null) {
        const nested = value.select || value.include;
        if (nested) {
          complexity += this.calculateFragmentComplexity(nested) * 2; // Nested selections are more complex
        }
      }
    }

    return complexity;
  }

  private extractFragmentDependencies(selections: readonly any[]): string[] {
    const dependencies = new Set<string>();

    const traverseSelections = (sels: readonly any[]) => {
      for (const selection of sels) {
        if (selection.kind === Kind.FRAGMENT_SPREAD) {
          dependencies.add(selection.name.value);
        } else if (selection.selectionSet?.selections) {
          traverseSelections(selection.selectionSet.selections);
        }
      }
    };

    traverseSelections(selections);
    return Array.from(dependencies);
  }
}

// Phase 8: Type-Safe Integration - Classes moved to separate files


