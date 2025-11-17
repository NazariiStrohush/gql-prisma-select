import { GQLPrismaSelect } from '../GQLPrismaSelect';
import {
  FieldTransformers,
  TransformationEngine,
  ResultTransformer
} from '../transforms';
import type { TransformOptions, FieldTransforms } from '../GQLPrismaSelect';
import { createMockGraphQLInfo } from './helpers/mockGraphQLInfo';
import { buildSimpleSelection, buildComplexSelection } from './helpers/testBuilders';

describe('Phase 2: Query Transformation & Field Mapping', () => {
  describe('FieldTransformers - Built-in Transformers', () => {
    describe('camelToSnake', () => {
      it('should convert camelCase to snake_case', () => {
        expect(FieldTransformers.camelToSnake('userName')).toBe('user_name');
        expect(FieldTransformers.camelToSnake('firstName')).toBe('first_name');
        expect(FieldTransformers.camelToSnake('userId')).toBe('user_id');
        expect(FieldTransformers.camelToSnake('createdAt')).toBe('created_at');
      });

      it('should handle single words', () => {
        expect(FieldTransformers.camelToSnake('name')).toBe('name');
        expect(FieldTransformers.camelToSnake('id')).toBe('id');
      });
    });

    describe('snakeToCamel', () => {
      it('should convert snake_case to camelCase', () => {
        expect(FieldTransformers.snakeToCamel('user_name')).toBe('userName');
        expect(FieldTransformers.snakeToCamel('first_name')).toBe('firstName');
        expect(FieldTransformers.snakeToCamel('user_id')).toBe('userId');
        expect(FieldTransformers.snakeToCamel('created_at')).toBe('createdAt');
      });

      it('should handle single words', () => {
        expect(FieldTransformers.snakeToCamel('name')).toBe('name');
        expect(FieldTransformers.snakeToCamel('id')).toBe('id');
      });
    });

    describe('pluralize', () => {
      it('should pluralize words ending with y', () => {
        expect(FieldTransformers.pluralize('category')).toBe('categories');
        expect(FieldTransformers.pluralize('company')).toBe('companies');
      });

      it('should pluralize words ending with s, sh, ch, x, z', () => {
        expect(FieldTransformers.pluralize('bus')).toBe('buses');
        expect(FieldTransformers.pluralize('wish')).toBe('wishes');
        expect(FieldTransformers.pluralize('church')).toBe('churches');
        expect(FieldTransformers.pluralize('box')).toBe('boxes');
        expect(FieldTransformers.pluralize('quiz')).toBe('quizzes');
      });

      it('should pluralize regular words', () => {
        expect(FieldTransformers.pluralize('user')).toBe('users');
        expect(FieldTransformers.pluralize('post')).toBe('posts');
        expect(FieldTransformers.pluralize('comment')).toBe('comments');
      });
    });

    describe('singularize', () => {
      it('should singularize words ending with ies', () => {
        expect(FieldTransformers.singularize('categories')).toBe('category');
        expect(FieldTransformers.singularize('companies')).toBe('company');
      });

      it('should singularize words ending with es', () => {
        expect(FieldTransformers.singularize('buses')).toBe('bus');
        expect(FieldTransformers.singularize('wishes')).toBe('wish');
        expect(FieldTransformers.singularize('churches')).toBe('church');
        expect(FieldTransformers.singularize('boxes')).toBe('box');
        expect(FieldTransformers.singularize('quizzes')).toBe('quiz');
      });

      it('should singularize regular plural words', () => {
        expect(FieldTransformers.singularize('users')).toBe('user');
        expect(FieldTransformers.singularize('posts')).toBe('post');
        expect(FieldTransformers.singularize('comments')).toBe('comment');
      });
    });

    describe('prefix and suffix', () => {
      it('should add prefix to field names', () => {
        const addPrefix = FieldTransformers.prefix('db_');
        expect(addPrefix('name')).toBe('db_name');
        expect(addPrefix('email')).toBe('db_email');
      });

      it('should add suffix to field names', () => {
        const addSuffix = FieldTransformers.suffix('_field');
        expect(addSuffix('name')).toBe('name_field');
        expect(addSuffix('email')).toBe('email_field');
      });
    });

    describe('case transformers', () => {
      it('should convert to uppercase', () => {
        expect(FieldTransformers.uppercase('name')).toBe('NAME');
        expect(FieldTransformers.uppercase('UserName')).toBe('USERNAME');
      });

      it('should convert to lowercase', () => {
        expect(FieldTransformers.lowercase('NAME')).toBe('name');
        expect(FieldTransformers.lowercase('UserName')).toBe('username');
      });
    });
  });

  describe('TransformationEngine', () => {
    describe('constructor', () => {
      it('should create engine with default options', () => {
        const engine = new TransformationEngine();
        expect(engine).toBeInstanceOf(TransformationEngine);
      });

      it('should create engine with field transforms', () => {
        const transforms: FieldTransforms = {
          'userName': 'user_name',
          'firstName': 'first_name'
        };
        const engine = new TransformationEngine({ fieldTransforms: transforms });
        expect(engine).toBeInstanceOf(TransformationEngine);
      });

      it('should create engine with default transforms', () => {
        const engine = new TransformationEngine({
          defaultTransforms: ['camelToSnake']
        });
        expect(engine).toBeInstanceOf(TransformationEngine);
      });
    });

    describe('transformSelections', () => {
      it('should transform simple selections', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name',
            'firstName': 'first_name'
          }
        });

        const selections = {
          userName: true,
          firstName: true,
          email: true
        };

        const result = engine.transformSelections(selections);
        expect(result).toEqual({
          user_name: true,
          first_name: true,
          email: true
        });
      });

      it('should transform nested selections', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name',
            'posts': 'user_posts'
          }
        });

        const selections = {
          userName: true,
          posts: {
            title: true,
            content: true
          }
        };

        const result = engine.transformSelections(selections);
        expect(result).toEqual({
          user_name: true,
          user_posts: {
            title: true,
            content: true
          }
        });
      });

      it('should apply default transforms', () => {
        const engine = new TransformationEngine({
          defaultTransforms: ['camelToSnake']
        });

        const selections = {
          userName: true,
          firstName: true,
          email: true
        };

        const result = engine.transformSelections(selections);
        expect(result).toEqual({
          user_name: true,
          first_name: true,
          email: true
        });
      });
    });

    describe('transformFieldName', () => {
      it('should use explicit field transforms', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name'
          }
        });

        expect(engine.transformFieldName('userName')).toBe('user_name');
        expect(engine.transformFieldName('email')).toBe('email');
      });

      it('should apply default transforms', () => {
        const engine = new TransformationEngine({
          defaultTransforms: ['camelToSnake']
        });

        expect(engine.transformFieldName('userName')).toBe('user_name');
        expect(engine.transformFieldName('firstName')).toBe('first_name');
      });

      it('should handle case insensitive matching', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'username': 'user_name'
          },
          caseSensitive: false
        });

        expect(engine.transformFieldName('userName')).toBe('user_name');
        expect(engine.transformFieldName('USERNAME')).toBe('user_name');
      });
    });

    describe('transformFieldValue', () => {
      it('should apply function transforms', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'fullName': (value: string) => value.toUpperCase()
          }
        });

        const context = {
          fieldName: 'fullName',
          modelName: 'User',
          selectionPath: [],
          originalValue: 'john doe'
        };

        expect(engine.transformFieldValue('john doe', context)).toBe('JOHN DOE');
      });

      it('should return original value for non-function transforms', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name'
          }
        });

        const context = {
          fieldName: 'userName',
          modelName: 'User',
          selectionPath: [],
          originalValue: 'john_doe'
        };

        expect(engine.transformFieldValue('john_doe', context)).toBe('john_doe');
      });
    });

    describe('reverseTransform', () => {
      it('should reverse transform simple results', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name',
            'firstName': 'first_name'
          }
        });

        const result = {
          user_name: 'john_doe',
          first_name: 'John',
          email: 'john@example.com'
        };

        const selections = {
          userName: true,
          firstName: true,
          email: true
        };

        const reversed = engine.reverseTransform(result, selections);
        expect(reversed).toEqual({
          userName: 'john_doe',
          firstName: 'John',
          email: 'john@example.com'
        });
      });

      it('should reverse transform nested results', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'userName': 'user_name',
            'posts': 'user_posts'
          }
        });

        const result = {
          user_name: 'john_doe',
          user_posts: [
            { title: 'Post 1', content: 'Content 1' },
            { title: 'Post 2', content: 'Content 2' }
          ]
        };

        const selections = {
          userName: true,
          posts: {
            title: true,
            content: true
          }
        };

        const reversed = engine.reverseTransform(result, selections);
        expect(reversed).toEqual({
          userName: 'john_doe',
          posts: [
            { title: 'Post 1', content: 'Content 1' },
            { title: 'Post 2', content: 'Content 2' }
          ]
        });
      });

      it('should apply function transforms during reverse transformation', () => {
        const engine = new TransformationEngine({
          fieldTransforms: {
            'fullName': (value: string) => value.toUpperCase()
          }
        });

        const result = {
          fullName: 'john doe'
        };

        const selections = {
          fullName: true
        };

        const reversed = engine.reverseTransform(result, selections);
        expect(reversed).toEqual({
          fullName: 'JOHN DOE'
        });
      });
    });
  });

  describe('ResultTransformer', () => {
    it('should transform results using the engine', () => {
      const engine = new TransformationEngine({
        fieldTransforms: {
          'userName': 'user_name'
        }
      });
      const transformer = new ResultTransformer(engine);

      const result = { user_name: 'john_doe' };
      const selections = { userName: true };

      const transformed = transformer.transform(result, selections);
      expect(transformed).toEqual({ userName: 'john_doe' });
    });

    it('should transform field values', () => {
      const engine = new TransformationEngine({
        fieldTransforms: {
          'fullName': (value: string) => value.toUpperCase()
        }
      });
      const transformer = new ResultTransformer(engine);

      const context = {
        fieldName: 'fullName',
        modelName: 'User',
        selectionPath: [],
        originalValue: 'john doe'
      };

      const transformed = transformer.transformField('john doe', 'fullName', context);
      expect(transformed).toBe('JOHN DOE');
    });
  });

  describe('GQLPrismaSelect with Transforms', () => {
    describe('constructor with transforms', () => {
      it('should create instance with field transforms', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'firstName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'userName': 'user_name',
            'firstName': 'first_name'
          }
        };

        const selector = new GQLPrismaSelect(info, { transforms });
        expect(selector).toBeInstanceOf(GQLPrismaSelect);
        expect(selector.select).toEqual({
          user_name: true,
          first_name: true
        });
      });

      it('should create instance with default transforms', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'firstName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          defaultTransforms: ['camelToSnake']
        };

        const selector = new GQLPrismaSelect(info, { transforms });
        expect(selector.select).toEqual({
          user_name: true,
          first_name: true
        });
      });

      it('should preserve original selections', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'firstName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'userName': 'user_name'
          }
        };

        const selector = new GQLPrismaSelect(info, { transforms });
        expect(selector.originalSelect).toEqual({
          userName: true,
          firstName: true
        });
      });
    });

    describe('static withTransforms method', () => {
      it('should create instance with transforms', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'userName': 'user_name'
          }
        };

        const selector = GQLPrismaSelect.withTransforms(info, transforms);
        expect(selector.select).toEqual({
          user_name: true,
          email: true
        });
      });
    });

    describe('transformResult method', () => {
      it('should transform results back to GraphQL format', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'firstName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'userName': 'user_name',
            'firstName': 'first_name'
          }
        };

        const selector = new GQLPrismaSelect(info, { transforms });

        const prismaResult = {
          user_name: 'john_doe',
          first_name: 'John'
        };

        const transformed = selector.transformResult(prismaResult);
        expect(transformed).toEqual({
          userName: 'john_doe',
          firstName: 'John'
        });
      });

      it('should apply function transforms to results', () => {
        const fieldNodes = buildSimpleSelection(['fullName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'fullName': (value: string) => value.toUpperCase()
          }
        };

        const selector = new GQLPrismaSelect(info, { transforms });

        const prismaResult = {
          fullName: 'john doe'
        };

        const transformed = selector.transformResult(prismaResult);
        expect(transformed).toEqual({
          fullName: 'JOHN DOE'
        });
      });

      it('should return original result when no transforms', () => {
        const fieldNodes = buildSimpleSelection(['userName', 'email']);
        const info = createMockGraphQLInfo(fieldNodes);

        const selector = new GQLPrismaSelect(info);

        const prismaResult = {
          userName: 'john_doe',
          email: 'john@example.com'
        };

        const transformed = selector.transformResult(prismaResult);
        expect(transformed).toBe(prismaResult);
      });
    });

    describe('getTransformationEngine method', () => {
      it('should return transformation engine when transforms are provided', () => {
        const fieldNodes = buildSimpleSelection(['userName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const transforms: TransformOptions = {
          fieldTransforms: {
            'userName': 'user_name'
          }
        };

        const selector = new GQLPrismaSelect(info, { transforms });
        const engine = selector.getTransformationEngine();
        expect(engine).toBeInstanceOf(TransformationEngine);
      });

      it('should return undefined when no transforms', () => {
        const fieldNodes = buildSimpleSelection(['userName']);
        const info = createMockGraphQLInfo(fieldNodes);

        const selector = new GQLPrismaSelect(info);
        const engine = selector.getTransformationEngine();
        expect(engine).toBeUndefined();
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end with field transforms', () => {
      // Simulate GraphQL query with camelCase fields
      const fieldNodes = buildSimpleSelection(['userName', 'firstName', 'email']);
      const info = createMockGraphQLInfo(fieldNodes);

      // Configure transforms to convert to snake_case for database
      const transforms: TransformOptions = {
        defaultTransforms: ['camelToSnake']
      };

      // Create selector with transforms
      const selector = new GQLPrismaSelect(info, { transforms });

      // Verify selections are transformed for Prisma
      expect(selector.select).toEqual({
        user_name: true,
        first_name: true,
        email: true
      });

      // Simulate Prisma result with snake_case
      const prismaResult = {
        user_name: 'john_doe',
        first_name: 'John',
        email: 'john@example.com'
      };

      // Transform result back to GraphQL format
      const graphqlResult = selector.transformResult(prismaResult);

      // Verify result is back in camelCase
      expect(graphqlResult).toEqual({
        userName: 'john_doe',
        firstName: 'John',
        email: 'john@example.com'
      });
    });

    it('should work with mixed explicit and default transforms', () => {
      const fieldNodes = buildSimpleSelection(['userName', 'firstName', 'lastName']);
      const info = createMockGraphQLInfo(fieldNodes);

      const transforms: TransformOptions = {
        fieldTransforms: {
          'userName': 'username' // Explicit transform
        },
        defaultTransforms: ['camelToSnake'] // Default for others
      };

      const selector = new GQLPrismaSelect(info, { transforms });

      expect(selector.select).toEqual({
        username: true,
        first_name: true,
        last_name: true
      });
    });

    it('should handle complex nested selections with transforms', () => {
      const fieldNodes = buildComplexSelection({
        user: {
          userName: [],
          firstName: [],
          posts: ['title', 'createdAt']
        }
      });
      const info = createMockGraphQLInfo(fieldNodes);

      const transforms: TransformOptions = {
        defaultTransforms: ['camelToSnake']
      };

      const selector = new GQLPrismaSelect(info, { transforms });

      expect(selector.include).toEqual({
        user: {
          select: {
            user_name: true,
            first_name: true,
            posts: {
              select: {
                title: true,
                created_at: true
              }
            }
          }
        }
      });
    });
  });
});
