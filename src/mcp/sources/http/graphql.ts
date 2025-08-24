import { getIntrospectionQuery, parse } from 'graphql';
import z from 'zod';
import { HttpDataSource, type PayloadDescription } from '../../database-source.js';

export interface GraphQLPayload {
  query: string;
  variables?: Record<string, any>;
  headers?: Record<string, string>;
}

export interface GraphQLConfig {
  url: string;
  headers?: Record<string, string>;
}

export class GraphQL<P extends GraphQLPayload> extends HttpDataSource<P, GraphQLConfig> {
  /**
   * Build and send the HTTP POST request to the GraphQL endpoint. Merges
   * headers from the payload and the connection config and sets JSON content
   * type.
   * @param payload the action payload containing endpoint, headers and body
   */
  #buildAndSendRequest() {
    const payload = this.payload;
    return this.makeHttpRequest({
      ...payload,
      body: { query: payload.query, variables: payload.variables },
      // Use the connection config URL as the endpoint
      // and ensure the request is a POST with JSON content type.
      endpoint: this.connectionConfig.options.url,
      method: 'POST',
      headers: {
        ...this.connectionConfig.options.headers,
        ...payload.headers,
        'Content-Type': 'application/json',
      },
    });
  }
  describePayload(): PayloadDescription<GraphQLPayload> {
    return {
      query: z.string().describe('GraphQL query string. Example: "query { users { id name } }".'),
      variables: z
        .record(z.any())
        .optional()
        .describe('Optional variables for the GraphQL query that will be passed in the request body.'),
      headers: z
        .record(z.any())
        .optional()
        .describe('Optional headers to include in the HTTP request. Merges with connection config headers.'),
    };
  }
  /**
   * Execute a GraphQL query (read operation).
   *
   * Validates that the payload contains a GraphQL `query` and that the AST
   * represents a `query` operation. Returns the result of the HTTP request.
   * @param payload the action payload containing the GraphQL query
   */
  select(): Promise<string> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('query'));
    return this.#buildAndSendRequest();
  }
  /**
   * Execute a GraphQL mutation (create/update/delete operations).
   * @param payload the action payload containing the GraphQL mutation
   */
  mutation(): Promise<string> {
    if (!this.isMutation()) throw new Error(this.getPayloadInvalidValueError('query'));
    return this.#buildAndSendRequest();
  }
  insert(): Promise<string> {
    return this.mutation();
  }
  update(): Promise<string> {
    return this.mutation();
  }
  delete(): Promise<string> {
    return this.mutation();
  }
  /**
   * Request GraphQL introspection and return the server schema.
   */
  showSchema(): Promise<string> {
    // Get GraphQL collection schema
    const query = getIntrospectionQuery();
    const payload = this.getPayloadObject({}) as P;
    return this.makeHttpRequest({
      ...payload,
      endpoint: this.connectionConfig.options.url,
      method: 'POST',
      headers: {
        ...this.connectionConfig.options.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
  }
  /** No-op connect for remote GraphQL endpoints. */
  connect(): Promise<void> {
    return Promise.resolve();
  }
  /** No-op close for remote GraphQL endpoints (kept for API symmetry). */
  close(): Promise<void> {
    return this.safeClose(() => Promise.resolve());
  }

  isSelect(): boolean {
    const parsed = parse(this.payload.query);
    return parsed.definitions.every(i => i.kind === 'OperationDefinition' && i.operation === 'query');
  }

  isMutation(): boolean {
    const parsed = parse(this.payload.query);
    return parsed.definitions.some(i => i.kind === 'OperationDefinition' && i.operation === 'mutation');
  }
}
