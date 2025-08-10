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

export class Crud extends HttpDataSource<CrudConfigOptions> {
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

  select(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'GET') throw new Error('Method must be `GET` for select operations.');
    return this.#buildAndSendRequest(payload);
  }
  mutation(payload: ActionPayload): Promise<string> {
    return this.#buildAndSendRequest(payload);
  }
  insert(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'POST') throw new Error('Method must be `POST` for insert operations.');
    return this.#buildAndSendRequest(payload);
  }
  update(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'PUT') throw new Error('Method must be `PUT` for update operations.');
    return this.#buildAndSendRequest(payload);
  }
  delete(payload: ActionPayload): Promise<string> {
    if (payload.method && payload.method !== 'DELETE')
      throw new Error('Method must be `DELETE` for delete operations.');
    return this.#buildAndSendRequest(payload);
  }
  listCollections(): Promise<unknown> {
    return this.#buildAndSendRequest({});
  }
  showSchema(settings: ActionPayload): Promise<unknown> {
    return this.#buildAndSendRequest(settings);
  }
  connect(_config: any): Promise<void> {
    return Promise.resolve();
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}
