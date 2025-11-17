# GQLPrismaSelect

[![CI](https://github.com/NazariiStrohush/gql-prisma-select/actions/workflows/ci.yml/badge.svg)](https://github.com/NazariiStrohush/gql-prisma-select/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/%40nazariistrohush%2Fgql-prisma-select.svg)](https://badge.fury.io/js/%40nazariistrohush%2Fgql-prisma-select)
[![Test Coverage](https://codecov.io/gh/NazariiStrohush/gql-prisma-select/branch/master/graph/badge.svg)](https://codecov.io/gh/NazariiStrohush/gql-prisma-select)

**Eliminate GraphQL over-fetching and under-fetching with automatic Prisma select/include generation**

GQLPrismaSelect automatically converts your GraphQL query selections into optimized Prisma `select` and `include` objects. This ensures your database queries only fetch the data you actually need, improving performance and reducing bandwidth usage.

## ✨ Key Benefits

- 🚀 **Performance**: Fetch only the data your GraphQL queries request
- 🎯 **Precision**: Eliminate over-fetching and under-fetching automatically
- 🔧 **Simple**: Drop-in replacement for manual select/include objects
- 🛠️ **Flexible**: Support for nested relations, fragments, and custom transformations
- 🎨 **Modern**: Built for Apollo Server and Prisma ecosystems

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [✨ Features](#-features)
  - [Core Features](#core-features)
  - [Advanced Features](#advanced-features)
  - [Developer Experience](#developer-experience)
- [📦 Installation](#-installation)
- [🔧 Basic Usage](#-basic-usage)
- [🚀 Advanced Features](#-advanced-features)
  - [Field Transformations](#field-transformations)
  - [Fragments](#fragments)
  - [Framework Integration](#framework-integration)
- [📚 Examples](#-examples)
- [📖 API Reference](#-api-reference)
- [🔄 Migration Guide](#-migration-guide)
- [🤝 Contributing](#-contributing)

## 🚀 Quick Start

Get started in 3 simple steps:

### 1. Install

```bash
npm install @nazariistrohush/gql-prisma-select
```

### 2. Import and Use

```typescript
import { GQLPrismaSelect } from '@nazariistrohush/gql-prisma-select';

@Query(() => User)
async user(@Info() info: GraphQLResolveInfo, @Args('id') id: number) {
  const { include, select } = new GQLPrismaSelect(info);

  return this.prisma.user.findUnique({
    where: { id },
    include,
    select,
  });
}
```

### 3. Query with Precision

```graphql
query {
  user(id: 1) {
    id
    email
    posts {
      id
      title
    }
  }
}
```

That's it! Your Prisma query now only fetches `id`, `email` from users and `id`, `title` from posts - no more, no less.

## ✨ Features

GQLPrismaSelect provides a comprehensive set of features to optimize your GraphQL-Prisma integration:

### Core Features

- **[Automatic Selection Generation](#-basic-usage)**: Convert GraphQL queries to Prisma select/include objects
- **[Nested Relations](#nested-relations)**: Handle complex nested queries with multiple levels of relations
- **[Fragment Support](#fragments)**: Full support for GraphQL fragments and inline fragments
- **[Field Exclusion](#field-exclusion)**: Automatically exclude unwanted fields like `__typename`

### Advanced Features

- **[Field Transformations](#field-transformations)**: Transform field names (camelCase ↔ snake_case, pluralization)
- **[Custom Field Mapping](#custom-field-mapping)**: Map GraphQL fields to different Prisma field names
- **[Path-based Selection](#path-based-selection)**: Extract specific parts of selections by path
- **[Result Transformation](#result-transformation)**: Transform query results with custom functions

### Developer Experience

- **[TypeScript Support](#typescript-support)**: Full TypeScript definitions and type safety
- **[Framework Agnostic](#framework-agnostic)**: Works with any GraphQL framework (NestJS, Apollo Server, etc.)
- **[Performance Optimized](#performance)**: Minimal overhead with efficient parsing
- **[Comprehensive Testing](#testing)**: High test coverage ensures reliability

## 📦 Installation

```bash
npm install @nazariistrohush/gql-prisma-select
```

### Prerequisites

- **Node.js**: >= 14.16.0
- **Prisma**: Any recent version
- **GraphQL Server**: Apollo Server or compatible

### Peer Dependencies

```bash
npm install prisma @apollo/server graphql
```

## 🔧 Basic Usage

### Constructor

The `GQLPrismaSelect` constructor takes a `GraphQLResolveInfo` object and optional configuration:

```typescript
new GQLPrismaSelect(info, options?)
```

**Parameters:**
- `info`: `GraphQLResolveInfo` - The GraphQL resolve info object from your resolver
- `options`: `Object` (optional) - Configuration options

**Returns:**
- `include`: Prisma include object for relations
- `select`: Prisma select object for scalar fields
- `originalInclude`: Untransformed include object
- `originalSelect`: Untransformed select object

### Basic Example

```typescript
import { GQLPrismaSelect } from '@nazariistrohush/gql-prisma-select';

@Resolver(() => User)
export class UserResolver {
  constructor(private prisma: PrismaClient) {}

  @Query(() => User)
  async user(@Info() info: GraphQLResolveInfo, @Args('id') id: number) {
    const { include, select } = new GQLPrismaSelect(info);

    return this.prisma.user.findUnique({
      where: { id },
      include,
      select,
    });
  }
}
```

### Nested Relations

GQLPrismaSelect automatically handles nested relations:

```typescript
@Query(() => User)
async userWithPosts(@Info() info: GraphQLResolveInfo, @Args('id') id: number) {
  const { include, select } = new GQLPrismaSelect(info);

  // This will include posts and their authors if requested in the query
  return this.prisma.user.findUnique({
    where: { id },
    include,
    select,
  });
}
```

### Field Exclusion

By default, `__typename` fields are excluded. Add custom exclusions:

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  excludeFields: ['__typename', 'internalField']
});
```

### Path-based Selection

Extract specific parts of selections using paths:

```typescript
const selector = new GQLPrismaSelect(info);

// Get selection for User relation
const { include: userInclude, select: userSelect } = GQLPrismaSelect.get(
  selector,
  'posts.author' // lodash-style path
);

// Get selection for Post relation
const { include: postInclude, select: postSelect } = GQLPrismaSelect.get(
  selector,
  ['posts'] // array path
);
```

## 🚀 Advanced Features

### Field Transformations

Transform field names between GraphQL and Prisma schemas:

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  transforms: {
    fieldTransforms: {
      // Map GraphQL field to different Prisma field
      'fullName': 'full_name',
      'createdAt': 'created_at'
    },
    defaultTransforms: ['camelToSnake'], // Auto-convert camelCase to snake_case
    transformRelations: true // Also transform relation fields
  }
});
```

**Built-in transformers:**
- `camelToSnake`: `userName` → `user_name`
- `snakeToCamel`: `user_name` → `userName`
- `pluralize`: `user` → `users`
- `singularize`: `users` → `user`

### Custom Field Mapping

Map GraphQL fields to completely different Prisma fields:

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  transforms: {
    fieldTransforms: {
      'displayName': (value, context) => {
        // Custom logic for field transformation
        if (context.modelName === 'User') {
          return 'full_name';
        }
        return value;
      }
    }
  }
});
```

### Fragments

GQLPrismaSelect fully supports GraphQL fragments:

```graphql
fragment UserFields on User {
  id
  email
  profile {
    firstName
    lastName
  }
}

query {
  users {
    ...UserFields
    posts {
      id
      title
    }
  }
}
```

The library automatically resolves fragment selections into the appropriate Prisma select/include objects.

### Result Transformation

Transform query results after fetching:

```typescript
const selector = new GQLPrismaSelect(info, {
  transforms: {
    resultTransforms: {
      'User.email': (value) => value.toLowerCase(),
      'Post.title': (value) => value.trim()
    }
  }
});

// Access transformed results
const result = await prisma.user.findUnique({...});
const transformedResult = selector.transformResult(result);
```

### Schema-Aware Validation (Coming Soon)

Future versions will include Prisma schema validation:

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  schema: prismaSchema, // Validate against Prisma schema
  validateFields: true,
  optimizeQueries: true
});
```

### Framework Integration

#### NestJS (Code First)

```typescript
@Resolver(() => User)
export class UserResolver {
  @Query(() => User)
  async user(@Info() info: GraphQLResolveInfo) {
    const { include, select } = new GQLPrismaSelect(info);
    return this.prisma.user.findUnique({ include, select });
  }
}
```

#### Apollo Server (Schema First)

```typescript
const resolvers = {
  Query: {
    user: async (parent, args, context, info) => {
      const { include, select } = new GQLPrismaSelect(info);
      return prisma.user.findUnique({ where: { id: args.id }, include, select });
    }
  }
};
```

#### Express GraphQL

```typescript
const root = {
  user: async (args, context, info) => {
    const { include, select } = new GQLPrismaSelect(info);
    return prisma.user.findUnique({ where: { id: args.id }, include, select });
  }
};
```

## 📚 Examples

### Basic User Query

**Prisma Schema:**
```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  firstName String
  lastName  String
  posts     Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  title    String
  content  String
  author   User   @relation(fields: [authorId], references: [id])
  authorId Int
}
```

**GraphQL Schema:**
```typescript
@ObjectType()
class User {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  email: string;

  @Field(() => String)
  firstName: string;

  @Field(() => String)
  lastName: string;

  @Field(() => [Post])
  posts: Post[];
}

@ObjectType()
class Post {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  title: string;

  @Field(() => String)
  content: string;

  @Field(() => User)
  author: User;
}
```

**Resolver:**
```typescript
@Resolver(() => User)
export class UserResolver {
  constructor(private prisma: PrismaClient) {}

  @Query(() => User)
  async user(@Info() info: GraphQLResolveInfo, @Args('id') id: number) {
    const { include, select } = new GQLPrismaSelect(info);
    return this.prisma.user.findUnique({
      where: { id },
      include,
      select,
    });
  }
}
```

### Complex Nested Queries

**Query:**
```graphql
query GetUserDetails($userId: Int!) {
  user(id: $userId) {
    id
    email
    firstName
    lastName
    posts {
      id
      title
      content
      author {
        id
        email
      }
    }
  }
}
```

**Generated Prisma Query:**
```typescript
{
  include: {
    posts: {
      include: {
        author: {
          select: {
            id: true,
            email: true
          }
        }
      },
      select: {
        id: true,
        title: true,
        content: true
      }
    }
  },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true
  }
}
```

### Field Name Transformations

**Use Case:** GraphQL uses `camelCase`, Prisma uses `snake_case`

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  transforms: {
    defaultTransforms: ['camelToSnake'],
    transformRelations: true
  }
});

// GraphQL: firstName, lastName, createdAt
// Prisma: first_name, last_name, created_at
```

### Fragments Example

```graphql
fragment UserBasic on User {
  id
  email
  firstName
  lastName
}

fragment PostDetails on Post {
  id
  title
  content
  author {
    ...UserBasic
  }
}

query GetPosts {
  posts {
    ...PostDetails
    createdAt
  }
}
```

The library automatically expands fragments into the full selection set.

### Custom Field Mapping

```typescript
const { include, select } = new GQLPrismaSelect(info, {
  transforms: {
    fieldTransforms: {
      'fullName': 'full_name',           // Simple mapping
      'displayName': (value, context) => { // Custom function
        return context.modelName === 'User' ? 'full_name' : value;
      }
    }
  }
});
```

## 📖 API Reference

### Constructor

```typescript
new GQLPrismaSelect(info: GraphQLResolveInfo, options?: GQLPrismaSelectOptions)
```

### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `excludeFields` | `string[]` | Fields to exclude from selection | `['__typename']` |
| `get` | `string \| string[]` | Path to extract specific selection | `undefined` |
| `transforms` | `TransformOptions` | Field and result transformation options | `undefined` |

### TransformOptions

```typescript
interface TransformOptions {
  fieldTransforms?: FieldTransforms;           // Custom field mappings
  defaultTransforms?: TransformType[];         // Built-in transformers
  transformRelations?: boolean;                // Transform relation fields
  transformEnums?: boolean;                    // Transform enum values
  caseSensitive?: boolean;                     // Case sensitivity
  customTransformers?: Record<string, Function>; // Custom transformer functions
}
```

### Return Values

| Property | Type | Description |
|----------|------|-------------|
| `include` | `object` | Prisma include object for relations |
| `select` | `object` | Prisma select object for scalar fields |
| `originalInclude` | `object` | Include object without transformations |
| `originalSelect` | `object` | Select object without transformations |

### Static Methods

#### `GQLPrismaSelect.get(selection, path)`

Extracts specific parts of selections by path.

```typescript
GQLPrismaSelect.get(selector, 'posts.author'); // lodash-style path
GQLPrismaSelect.get(selector, ['posts', 'author']); // array path
```

**Parameters:**
- `selection`: `GQLPrismaSelect` instance or selection object
- `path`: `string | string[]` - Path to extract

**Returns:** `{ include, select }` object for the specified path

### Built-in Transformers

| Transformer | Input | Output | Example |
|-------------|-------|--------|---------|
| `camelToSnake` | `userName` | `user_name` | `firstName → first_name` |
| `snakeToCamel` | `user_name` | `userName` | `last_name → lastName` |
| `pluralize` | `user` | `users` | `category → categories` |
| `singularize` | `users` | `user` | `categories → category` |

### Error Handling

The library throws descriptive errors for:
- Invalid GraphQL resolve info
- Circular fragment references
- Invalid transformation configurations
- Path extraction failures

## 🔄 Migration Guide

### From Manual Select/Include

**Before (Manual):**
```typescript
@Query(() => User)
async user(@Args('id') id: number) {
  return this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      posts: {
        select: {
          id: true,
          title: true,
          content: true
        }
      }
    }
  });
}
```

**After (GQLPrismaSelect):**
```typescript
@Query(() => User)
async user(@Info() info: GraphQLResolveInfo, @Args('id') id: number) {
  const { include, select } = new GQLPrismaSelect(info);
  return this.prisma.user.findUnique({
    where: { id },
    include,
    select,
  });
}
```

### From Other Libraries

#### Comparison with `graphql-fields`

```typescript
// graphql-fields approach
import graphqlFields from 'graphql-fields';

const fields = graphqlFields(info);
// Manual processing required...

// GQLPrismaSelect approach
const { include, select } = new GQLPrismaSelect(info);
// Ready for Prisma!
```

#### Benefits Over Manual Approaches

- **Automatic**: No need to manually define select/include objects
- **Accurate**: Fetches exactly what GraphQL requests
- **Maintainable**: Changes to GraphQL schema automatically reflected
- **Type-Safe**: Full TypeScript support
- **Flexible**: Advanced features like transformations and fragments

### Common Migration Patterns

#### 1. Basic Queries
Replace static select objects with dynamic generation.

#### 2. Nested Relations
The library handles all nesting automatically.

#### 3. Field Filtering
Use `excludeFields` option instead of manual filtering.

#### 4. Custom Logic
Use field transformations for complex mappings.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/NazariiStrohush/gql-prisma-select.git
cd gql-prisma-select
npm install
npm run build
npm test
```

### Reporting Issues

- Use [GitHub Issues](https://github.com/NazariiStrohush/gql-prisma-select/issues) for bugs
- Check existing issues before creating new ones
- Include code examples and GraphQL schemas when possible

### Feature Requests

- Open a [GitHub Issue](https://github.com/NazariiStrohush/gql-prisma-select/issues) with the "enhancement" label
- Describe the use case and expected behavior
- Consider submitting a pull request if you have implementation ideas

## 📄 License

ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the Apollo Server and Prisma ecosystems
- Inspired by the need for better GraphQL-Prisma integration
- Thanks to all contributors and the open-source community
