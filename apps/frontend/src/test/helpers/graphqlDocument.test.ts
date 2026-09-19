import { describe, expect, it } from 'vitest';
import { buildSchema, parse } from 'graphql';
import { addFieldToGraphQLDocument } from '../../helpers/graphqlDocument';

function createSchema() {
  return buildSchema(`
    enum Role { ADMIN USER }
    type User {
      id: ID!
      name: String
      role: Role
      friends: [User]
      profile: Profile
    }
    type Profile {
      user: User!
      bio: String
    }
    type Post {
      id: ID!
      title: String
      author: User
    }
    type Query {
      user: User
      posts: [Post]
      greeting: String
    }
    type Mutation {
      createUser(name: String!): User
      createPost(input: CreatePostInput!): Post
    }
    input CreatePostInput {
      title: String!
      rating: Int!
      tags: [String]
    }
  `);
}

const selectionNames = (document: string): string[] => {
  const operation = parse(document).definitions.find(
    definition => definition.kind === 'OperationDefinition',
  ) as { selectionSet: { selections: Array<{ name: { value: string } }> } };
  return operation.selectionSet.selections.map(selection => selection.name.value);
};

describe('addFieldToGraphQLDocument', () => {
  it('creates an anonymous query when the document is empty', () => {
    const result = addFieldToGraphQLDocument('', 'query', 'greeting', createSchema());

    expect(result.replace(/\s+/g, ' ')).toBe('{ greeting }');
  });

  it('appends a root field to an existing operation with leaf-expanded subfields', () => {
    const schema = createSchema();
    const result = addFieldToGraphQLDocument('{ posts { title } }', 'query', 'user', schema);

    const printed = result.replace(/\s+/g, ' ');
    expect(printed).toContain('posts { title }');
    expect(printed).toContain('user { id name role profile { bio } }');
  });

  it('creates a mutation operation when none exists in a document with a query', () => {
    const result = addFieldToGraphQLDocument('{ greeting }', 'mutation', 'createUser', createSchema());

    expect(result).toContain('mutation CreateUserMutation');
    expect(result.replace(/\s+/g, ' ')).toContain('{ greeting }');
  });

  it('appends to the existing operation of the matching kind', () => {
    const result = addFieldToGraphQLDocument('mutation DoThing { createUser(name: "x") { id } }', 'mutation', 'createUser', createSchema());

    const printed = result.replace(/\s+/g, ' ');
    expect(printed).toContain('mutation DoThing');
    expect(printed).toContain('createUser(name: "x") { id }');
  });

  it('returns the document unchanged when the field is already present', () => {
    const document = '{ greeting }';
    const result = addFieldToGraphQLDocument(document, 'query', 'greeting', createSchema());

    expect(result).toBe(document);
  });

  it('omits circular references so the document stays valid', () => {
    const result = addFieldToGraphQLDocument('', 'query', 'user', createSchema());

    const names = selectionNames(result);
    expect(names).toEqual(['user']);
    expect(result.replace(/\s+/g, ' ')).toContain('user { id name role profile { bio } }');
    expect(result).not.toContain('friends');
    expect(() => parse(result)).not.toThrow();
  });

  it('omits fields that cycle back to an ancestor type', () => {
    const result = addFieldToGraphQLDocument('', 'query', 'user', createSchema());

    expect(result.replace(/\s+/g, ' ')).toContain('profile { bio }');
    expect(result.replace(/\s+/g, ' ')).not.toContain('profile { user bio }');
  });

  it('inserts placeholder arguments for required scalar arguments', () => {
    const result = addFieldToGraphQLDocument('', 'mutation', 'createUser', createSchema());

    expect(result.replace(/\s+/g, ' ')).toContain('createUser(name: "") { id name role profile { bio } }');
  });

  it('expands required input-object arguments with their required fields', () => {
    const result = addFieldToGraphQLDocument('', 'mutation', 'createPost', createSchema());

    const printed = result.replace(/\s+/g, ' ');
    expect(printed).toContain('createPost(input: { title: "", rating: 0 }) { id title author { id name role profile { bio } } }');
  });

  it('does not insert arguments that have defaults or are optional', () => {
    const result = addFieldToGraphQLDocument('', 'query', 'greeting', createSchema());

    expect(result.replace(/\s+/g, ' ')).toBe('{ greeting }');
  });

  it('expands nested object types recursively down to leaves', () => {
    const result = addFieldToGraphQLDocument('', 'query', 'posts', createSchema());

    const printed = result.replace(/\s+/g, ' ');
    expect(printed).toContain('posts { id title author { id name role profile { bio } } }');
  });

  it('returns the original document when the schema is missing or field is unknown', () => {
    expect(addFieldToGraphQLDocument('{ greeting }', 'query', 'unknown', createSchema())).toBe('{ greeting }');
    expect(addFieldToGraphQLDocument('{ greeting }', 'mutation', 'createUser', null)).toBe('{ greeting }');
  });

  it('throws when the current document cannot be parsed', () => {
    expect(() => addFieldToGraphQLDocument('{ greeting', 'query', 'greeting', createSchema())).toThrow(
      'Cannot add field: the current document has syntax errors',
    );
  });
});
