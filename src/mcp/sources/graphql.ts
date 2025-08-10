import { getIntrospectionQuery, parse, Source } from 'graphql';
import { ActionPayload, HttpDataSource } from '../database.js';

export interface GraphQLConfigOptions {
  headers: Record<string, string>;
  url: string;
}

export class GraphQL extends HttpDataSource<GraphQLConfigOptions> {
  #parse(payload: ActionPayload) {
    try {
      const rootPayload = JSON.parse(payload.payload ?? '{"query": ""}');
      const source = new Source(rootPayload.query);
      return parse(source);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }

  #checkForPayload(settings: ActionPayload) {
    if (!settings.payload)
      throw new Error(
        `A \`payload\` key is required for a graphql operation containing JSON with \`query\` and optionally \`variables\`.`
      );
  }

  #buildAndSendRequest(settings: ActionPayload) {
    return this.makeHttpRequest({
      ...settings,
      endpoint: this.connectionConfig.options.url ?? settings.endpoint,
      method: 'POST',
      headers: {
        ...settings.headers,
        ...this.connectionConfig.options.headers,
        'Content-Type': 'application/json',
      },
    });
  }

  select(settings: ActionPayload): Promise<unknown> {
    try {
      this.#checkForPayload(settings);
      const ast = this.#parse(settings);
      if (ast.definitions.some(def => def.kind !== 'OperationDefinition' || def.operation !== 'query'))
        throw new Error('Invalid GraphQL query: Must be a `query` operation.');
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
    return this.#buildAndSendRequest(settings);
  }
  mutation(settings: ActionPayload): Promise<unknown> {
    try {
      this.#checkForPayload(settings);
      return this.#buildAndSendRequest(settings);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }
  insert(settings: ActionPayload): Promise<unknown> {
    return this.mutation(settings);
  }
  update(settings: ActionPayload): Promise<unknown> {
    return this.mutation(settings);
  }
  delete(settings: ActionPayload): Promise<unknown> {
    return this.mutation(settings);
  }
  listCollections(): Promise<unknown> {
    throw new Error('Method not implemented.');
  }
  showSchema(): Promise<unknown> {
    // Get GraphQL collection schema
    const query = getIntrospectionQuery();
    return this.makeHttpRequest({
      endpoint: this.connectionConfig.options.url,
      method: 'POST',
      headers: {
        ...this.connectionConfig.options.headers,
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify({ query }),
    });
  }
  connect(): Promise<void> {
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}
