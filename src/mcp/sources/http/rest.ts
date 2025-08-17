import z from 'zod';
import { HttpDataSource, type HttpPayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Simple Rest HTTP data source.
 *
 * This data source proxies requests to configured HTTP endpoints. It expects
 * an `endpoint` key on the payload or resolves endpoints from the connection
 * configuration. Methods delegate to `makeHttpRequest` while merging headers
 * from the connection config and the payload.
 */
export class Rest<P extends HttpPayloadBase> extends HttpDataSource<P> {
  /**
   * Build the HTTP request payload and forward to the base class helper.
   * @returns promise resolving to the response body as string
   */
  #buildAndSendRequest(): Promise<string> {
    const payload = this.payload;
    if (!payload.endpoint) throw new Error('An `endpoint` key is required for a REST API operation.');
    return this.makeHttpRequest({
      ...payload,
      endpoint: payload.endpoint,
      method: payload.method ?? 'GET',
      headers: {
        ...this.connectionConfig.options.headers,
        ...payload.headers,
      },
    });
  }
  describePayload(): PayloadDescription<HttpPayloadBase> {
    return this.combinePayload(z.any());
  }
  /**
   * Perform a GET request for read operations.
   */
  select(): Promise<string> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('method'));

    return this.#buildAndSendRequest();
  }
  /**
   * Perform a generic HTTP request (mutation).
   */
  mutation(): Promise<string> {
    return this.#buildAndSendRequest();
  }
  /**
   * Perform a POST request for create operations.
   */
  insert(): Promise<string> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('method'));
    if (this.payload.method && this.payload.method !== 'POST')
      throw new Error('Method must be `POST` for insert operations.');
    return this.#buildAndSendRequest();
  }
  /**
   * Perform a PUT request for update operations.
   */
  update(): Promise<string> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('method'));
    if (this.payload.method && this.payload.method !== 'PUT')
      throw new Error('Method must be `PUT` for update operations.');
    return this.#buildAndSendRequest();
  }
  /**
   * Perform a DELETE request for delete operations.
   */
  delete(): Promise<string> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('method'));
    if (this.payload.method && this.payload.method !== 'DELETE')
      throw new Error('Method must be `DELETE` for delete operations.');
    return this.#buildAndSendRequest();
  }
  /**
   * Use the configured endpoint to fetch schema information. Implementations
   * vary depending on the remote service but the method forwards to the
   * configured endpoint.
   * @param request action payload used to request schema information
   */
  showSchema(): Promise<string> {
    return this.#buildAndSendRequest();
  }
  override isSelect(): boolean {
    return this.payload.method === 'GET';
  }
  override isInsert(): boolean {
    return this.payload.method === 'POST';
  }
  override isUpdate(): boolean {
    return this.payload.method === 'PUT';
  }
  override isDelete(): boolean {
    return this.payload.method === 'DELETE';
  }
  /**
   * No-op connect for HTTP-backed sources; the connection configuration is read
   * from `connectionConfig` when sending requests.
   * @param _config connection options (ignored)
   */
  connect(): Promise<void> {
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
