import { HttpDataSource, type ActionPayload } from '../database.js';

export interface CrudConfigOptions {
  endpoints: (
    | {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE';
        url: string;
        search: Record<string, string>;
        description: string;
      }
    | string
  )[];
  headers: Record<string, string>;
}

/**
 * Simple CRUD HTTP data source.
 *
 * This data source proxies requests to configured HTTP endpoints. It expects
 * an `endpoint` key on the payload or resolves endpoints from the connection
 * configuration. Methods delegate to `makeHttpRequest` while merging headers
 * from the connection config and the payload.
 */
export class Crud extends HttpDataSource<CrudConfigOptions> {
  /**
   * Build the HTTP request payload and forward to the base class helper.
   * @param payload the action payload describing the request
   * @returns promise resolving to the response body as string
   */
  #buildAndSendRequest(payload: ActionPayload): Promise<string> {
    if (!payload.endpoint) throw new Error('An `endpoint` key is required for a CRUD operation.');
    return this.makeHttpRequest({
      ...payload,
      headers: {
        ...this.connectionConfig.options.headers,
        ...payload.headers,
      },
    });
  }

  /**
   * Perform a GET request for read operations.
   * @param payload action payload with endpoint, headers, query params, etc.
   */
  select(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'GET') throw new Error('Method must be `GET` for select operations.');
    return this.#buildAndSendRequest(payload);
  }
  /**
   * Perform a generic HTTP request (mutation).
   * @param payload action payload with endpoint, method and body
   */
  mutation(payload: ActionPayload): Promise<string> {
    return this.#buildAndSendRequest(payload);
  }
  /**
   * Perform a POST request for create operations.
   * @param payload action payload describing the insert request
   */
  insert(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'POST') throw new Error('Method must be `POST` for insert operations.');
    return this.#buildAndSendRequest(payload);
  }
  /**
   * Perform a PUT request for update operations.
   * @param payload action payload describing the update request
   */
  update(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'PUT') throw new Error('Method must be `PUT` for update operations.');
    return this.#buildAndSendRequest(payload);
  }

  /**
   * Perform a DELETE request for delete operations.
   * @param payload action payload describing the delete request
   */
  delete(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'DELETE')
      throw new Error('Method must be `DELETE` for delete operations.');
    return this.#buildAndSendRequest(payload);
  }

  /**
   * Use the configured endpoint to fetch schema information. Implementations
   * vary depending on the remote service but the method forwards to the
   * configured endpoint.
   * @param settings action payload used to request schema information
   */
  showSchema(settings: ActionPayload): Promise<unknown> {
    return this.#buildAndSendRequest(settings);
  }

  /**
   * No-op connect for HTTP-backed sources; the connection configuration is read
   * from `connectionConfig` when sending requests.
   * @param _config connection options (ignored)
   */
  connect(_config: any): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Close is a no-op for remote HTTP sources; use safeClose for symmetry with
   * other data sources.
   */
  close(): Promise<void> {
    return this.safeClose(() => Promise.resolve());
  }
}
