import { getIntrospectionQuery, parse, Source } from 'graphql';
import z from 'zod';
import { BaseHttpPayload, HttpDataSource, type ActionRequest, type PayloadDescription } from '../../database-source.js';

export class GraphQL<P extends BaseHttpPayload> extends HttpDataSource {
  /**
   * Parse the GraphQL query string found in payload.payload into an AST.
   * Accepts either a parsed object or a JSON-encoded string containing `{ query }`.
   * @throws on invalid JSON or invalid GraphQL syntax
   * @param payload the action payload containing `payload.query`
   */
  #parse(payload: P) {
    try {
      let rootPayload: Record<string, any>;
      if (!payload.body)
        throw new Error('Missing request body containing a `query` key and optionally a `variables` key.');

      if (typeof payload.body === 'string') rootPayload = JSON.parse(payload.body ?? '{"query": ""}');
      else rootPayload = payload.body ?? { query: '' };
      const source = new Source(rootPayload.query);
      return parse(source);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Ensure the action payload includes a `payload` key (which should contain
   * the GraphQL `query` and optional `variables`).
   * @param payload the action payload to validate
   */
  #checkForPayload(payload: P) {
    if (!payload)
      throw new Error(
        `A \`payload\` key is required for a graphql operation containing JSON with \`query\` and optionally \`variables\`.`
      );
    if (!payload.body) throw new Error('A `body` key is required in the payload for GraphQL operations.');
  }

  /**
   * Build and send the HTTP POST request to the GraphQL endpoint. Merges
   * headers from the payload and the connection config and sets JSON content
   * type.
   * @param payload the action payload containing endpoint, headers and body
   */
  #buildAndSendRequest(payload: P) {
    return this.makeHttpRequest({
      ...payload,
      endpoint: this.connectionConfig.options.url,
      method: 'POST',
      headers: {
        ...payload.headers,
        ...this.connectionConfig.options.headers,
        'Content-Type': 'application/json',
      },
    });
  }
  describePayload(): PayloadDescription {
    return this.combinePayload({
      query: z.string(),
      variables: z.record(z.any()).optional(),
    });
  }
  /**
   * Execute a GraphQL query (read operation).
   *
   * Validates that the payload contains a GraphQL `query` and that the AST
   * represents a `query` operation. Returns the result of the HTTP request.
   * @param payload the action payload containing the GraphQL query
   */
  select(request: ActionRequest<P>): Promise<string> {
    const payload = this.getPayloadObject(request);
    try {
      this.#checkForPayload(payload);
      const ast = this.#parse(payload);
      if (ast.definitions.some(def => def.kind !== 'OperationDefinition' || def.operation !== 'query'))
        throw new Error('Invalid GraphQL query: Must be a `query` operation.');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
    return this.#buildAndSendRequest(payload);
  }
  /**
   * Execute a GraphQL mutation (create/update/delete operations).
   * @param payload the action payload containing the GraphQL mutation
   */
  mutation(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);
    try {
      this.#checkForPayload(payload);
      return this.#buildAndSendRequest(payload);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }
  insert(request: ActionRequest<P>): Promise<unknown> {
    return this.mutation(request);
  }
  update(request: ActionRequest<P>): Promise<unknown> {
    return this.mutation(request);
  }
  delete(request: ActionRequest<P>): Promise<unknown> {
    return this.mutation(request);
  }
  /**
   * Request GraphQL introspection and return the server schema.
   */
  showSchema(): Promise<unknown> {
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
}
