import { Kind } from 'graphql/language/kinds';
import type { GraphQLResolveInfo } from 'types';

interface SelectInclude {
  select?: Include;
  include?: Include;
}

type Include = Record<string, boolean | SelectInclude>;

export class GQLPrismaSelect<S = any, I = any> {
  private info: GraphQLResolveInfo;

  public originalInclude?: I;
  public originalSelect?: S;
  public include?: I;
  public select?: S;
  private excludeFields: string[] = [];
  private readonly fragments: Record<string, Include>;

  constructor(
    info: GraphQLResolveInfo,
    params: { excludeFields?: string[]; get?: string | string[] } = {}
  ) {
    this.excludeFields = params.excludeFields || ['__typename'];
    this.info = info;
    // Parse and save fragments
    this.fragments = this.getFragments();
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
    this.include = include as I;
    this.select = select as S;
  }

  private getFragments() {
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
          // Check if fragment exists and has valid selectionSet
          const fragment = this.fragments[value];
          if (fragment) {
            // Fragment is already transformed, merge it directly
            acc = { ...acc, ...fragment };
          } else if (this.info.fragments?.[value]?.selectionSet?.selections) {
            // Fallback: transform fragment on-the-fly if not in cache
            const fragmentSpreadFields = this.transformSelections(
              this.info.fragments[value].selectionSet.selections
            );
            if (fragmentSpreadFields) {
              acc = { ...acc, ...fragmentSpreadFields };
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
}

