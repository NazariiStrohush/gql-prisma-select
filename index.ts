export { DEFAULT_PATHS } from './src/constants';
export { GQLPrismaSelect } from './src/GQLPrismaSelect';
export { TypedGQLPrismaSelect } from './src/typed/TypedGQLPrismaSelect';
export { TypedQueryBuilder } from './src/typed/TypedQueryBuilder';
export { GraphQLResolveInfo } from './types';

// Phase 2: Query Transformation & Field Mapping
export type {
  FieldTransform,
  TransformContext,
  FieldTransforms,
  TransformOptions
} from './src/GQLPrismaSelect';

export {
  FieldTransformers,
  TransformationEngine,
  ResultTransformer
} from './src/transforms';

// Phase 7: Advanced Fragment Handling
export {
  FragmentRegistry,
  FragmentOptimizer,
  FragmentOverrider,
  DynamicFragmentHandler,
  FragmentCache,
  FragmentAnalyzer,
  FragmentDefinition,
  FragmentStats,
  FragmentAnalysis
} from './src/fragments';

export type {
  FragmentOptions,
  FragmentOverride,
  FragmentDirective,
  FragmentMetadata,
  DynamicFragment
} from './src/fragments';

// Phase 8: Type-Safe Integration
export type {
  InferSelection,
  PrismaSelect,
  SafeSelect,
  TypedOptions,
  TypeValidationOptions,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TypedQueryBuilderOptions,
  TypeCheckContext,
  TypeGenerationOptions,
  TypeGenerationResult,
  TypeGenerationMetadata,
  LibraryIntegration,
  NexusQueryFieldConfig,
  IntelliSenseSupport
} from './src/types';

export {
  TypeValidator,
  TypeValidationUtils
} from './src/typeValidator';

export {
  TypeGenerator,
  TypeGeneratorCLI
} from './src/typeGenerator';

export {
  NexusIntegration,
  ApolloServerIntegration,
  GraphQLCodeGeneratorIntegration,
  TypeORMIntegration,
  MikroORMIntegration,
  IntegrationUtils,
  LibraryRegistry,
  integrations
} from './src/libraryIntegration';

// Re-export IntelliSense declarations
export * from './src/intelliSense';
