import mongodb from 'mongodb';
import z from 'zod';
import { NoSqlDataSource, type ActionRequest, type PayloadDescription } from '../../database-source.js';

export interface MongoDbConfig {
  url: string;
  options: mongodb.MongoClientOptions;
}

export interface MongoDbPayload {
  method: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'DELETE_TABLE';
  tableName: string;
  filter: { [key: string]: any };
  value?: { [key: string]: any } | { [key: string]: any }[];
}

/**
 * MongoDB NoSQL data source implementation.
 *
 * Supports basic operations expressed via an ActionPayload containing a
 * `method` (SELECT|INSERT|UPDATE|DELETE|DELETE_TABLE), `tableName` (collection),
 * `filter` and an optional `value` for writes.
 *
 * The class keeps a connected `MongoClient` on `this.client` and the database
 * handle on `this.db`. Call `connect()` before issuing queries and `close()`
 * when finished to release sockets.
 */
export class MongoDB<P extends MongoDbPayload> extends NoSqlDataSource {
  client?: mongodb.MongoClient | undefined;
  db?: mongodb.Db | undefined;
  /**
   * Return a helpful payload error message describing the expected payload shape.
   * @returns A human-readable error string explaining the required `payload` format
   */
  #payloadError() {
    return `A valid \`payload\` key should be formatted as an object like this:
    {
      "method": "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "DELETE_TABLE", // Required
      "tableName": "collection_name", // Required
      "filter": { "key": "value" }, // Required
      "value": { "key": "value" }, // Optional
    }`;
  }
  describePayload(): PayloadDescription {
    return {
      method: z.enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DELETE_TABLE']),
      tableName: z.string(),
      filter: z.record(z.any()),
      value: z.record(z.any()).optional(),
    };
  }
  async connect(): Promise<void> {
    /**
     * Connect to MongoDB and set `this.client` and `this.db`.
     * @param config Database connection configuration returned from the MCP
     * @returns void
     */
    const url = this.connectionConfig.options.url ?? '';
    const opts = { ...(this.connectionConfig.options.options ?? {}) } as mongodb.MongoClientOptions;
    // sensible defaults to avoid long hangs while connecting
    if (opts.serverSelectionTimeoutMS === undefined || opts.serverSelectionTimeoutMS === null)
      opts.serverSelectionTimeoutMS = 10000;
    if (opts.connectTimeoutMS === undefined || opts.connectTimeoutMS === null) opts.connectTimeoutMS = 10000;

    this.client = await mongodb.MongoClient.connect(url, opts);
    // surface and log client errors so sockets don't remain in bad states silently
    if (this.client && typeof (this.client as any).on === 'function') {
      try {
        (this.client as any).on('error', (err: any) => console.error('MongoDB client error:', err?.message ?? err));
      } catch (e) {
        // ignore if the client doesn't support events in this driver version
      }
    }
    this.db = this.client.db();
  }
  /**
   * Return index and index info for a specific collection, or list all
   * collections when no `tableName` is provided.
   * @param payload optional payload with `tableName` to restrict results
   */
  async showSchema(request: ActionRequest<P>): Promise<unknown> {
    const table = request.payload?.tableName ?? '';
    if (table) {
      return {
        tableName: table,
        indexInfo: await this.db?.collection(table).indexInformation(),
        indexes: await this.db?.collection(table).indexes(),
      };
    }
    // Call "Show collections"
    const collections = (await this.db?.listCollections().toArray()) ?? [];
    const info: {
      tableName: string;
      indexesInfo?: mongodb.IndexDescriptionCompact;
      indexes?: mongodb.IndexDescriptionInfo[];
    }[] = [];
    for (const collection of collections) {
      const name = collection.name;
      const indexesInfo = await this.db?.collection(name).indexInformation();
      const indexes_2 = await this.db?.collection(name).indexes();
      info.push({
        tableName: name,
        indexesInfo: indexesInfo,
        indexes: indexes_2,
      });
    }
    return { info };
  }
  /**
   * Run a find() query against the named collection using `filter` and
   * return the resulting documents array.
   * @param payload payload containing method, tableName, filter, and value
   */
  async select(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (!this.db) throw new Error('Database not found.');
    if (!payload) throw new Error(this.#payloadError());
    if (!payload.tableName) throw new Error('Missing key `tableName`. This is the collection that you want to query.');
    if (!payload.filter) throw new Error(this.#payloadError());

    const collection = this.db?.collection(payload.tableName);
    return (await collection?.find(payload.filter).toArray()) ?? [];
  }
  /**
   * Dispatch a MongoDB style action based on `method` in the payload. Supports
   * SELECT, INSERT, UPDATE, DELETE and DELETE_TABLE.
   * @param payload action payload with `method` and other parameters
   */
  async mutation(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (payload.method === 'SELECT') return this.select(request);
    else if (payload.method === 'INSERT') return this.insert(request);
    else if (payload.method === 'UPDATE') return this.update(request);
    else if (payload.method === 'DELETE') return this.delete(request);
    else if (payload.method === 'DELETE_TABLE') return this.dropTable(request);

    throw new Error(
      `Unsupported method: ${payload.method} expected \`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`, or \`DELETE_TABLE\`.`
    );
  }

  /** Drop (delete) the specified collection from the database. */
  /**
   * Drop (delete) the specified collection from the database.
   * @param payload payload containing `tableName` of the collection to drop
   */
  async dropTable(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (!this.db) throw new Error('Database not found.');
    if (!payload) throw new Error(this.#payloadError());
    if (!payload.tableName) throw new Error(`Missing key \`tableName\`.\n${this.#payloadError()}`);

    const collection = this.db.collection(payload.tableName);
    return collection.drop();
  }

  /**
   * Insert a single document or an array of documents into a collection.
   * @param payload payload containing `tableName` and `value` to insert
   */
  async insert(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (!this.db) throw new Error('Database not found.');
    if (!payload) throw new Error(this.#payloadError());
    if (!payload.value) throw new Error(`Missing key \`value\`.\n${this.#payloadError()}`);

    const collection = this.db?.collection(payload.tableName);
    if (Array.isArray(payload.value)) return collection?.insertMany(payload.value);
    return collection?.insertOne(payload.value);
  }
  /**
   * Update documents matching `filter` with the provided `value` document.
   * @param payload payload containing `tableName`, `filter`, and `value`
   */
  async update(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (!this.db) throw new Error('Database not found.');
    if (!payload) throw new Error(this.#payloadError());
    if (!payload.filter) throw new Error(`Missing key \`filter\`.\n${this.#payloadError()}`);
    if (!payload.value) throw new Error(`Missing key \`value\`.\n${this.#payloadError()}`);

    const collection = this.db?.collection(payload.tableName);
    if (Array.isArray(payload.value)) return collection?.updateOne(payload.filter, payload.value);
    return collection?.updateMany(payload.filter, payload.value);
  }
  /**
   * Delete documents matching `filter` (supports array of filters for `$or`).
   * @param payload payload containing `tableName` and `filter`
   */
  async delete(request: ActionRequest<P>): Promise<unknown> {
    const payload = this.getPayloadObject(request);

    if (!this.db) throw new Error('Database not found.');
    if (!payload) throw new Error(this.#payloadError());
    if (!payload.tableName) throw new Error(`Missing key \`tableName\`.\n${this.#payloadError()}`);
    if (!payload.filter) throw new Error(`Missing key \`filter\`.\n${this.#payloadError()}`);

    const collection = this.db?.collection(payload.tableName);
    if (Array.isArray(payload.filter)) return collection?.deleteMany({ $or: payload.filter });
    return collection?.deleteMany(payload.filter);
  }
  isMutation(request: ActionRequest<P>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents a mutation (insert/update/delete).
     * @param payload The action payload to inspect
     * @returns true when the payload method is a mutation
     */
    const payloadObj = this.getPayloadObject(request);
    return (
      payloadObj.method === 'INSERT' ||
      payloadObj.method === 'UPDATE' ||
      payloadObj.method === 'DELETE' ||
      payloadObj.method === 'DELETE_TABLE'
    );
  }
  isSelect(request: ActionRequest<P>): Promise<boolean> | boolean {
    const payload = this.getPayloadObject(request);
    return payload.method === 'SELECT';
  }
  isInsert(request: ActionRequest<P>): Promise<boolean> | boolean {
    const payload = this.getPayloadObject(request);
    return payload.method === 'INSERT';
  }
  isUpdate(request: ActionRequest<P>): Promise<boolean> | boolean {
    const payload = this.getPayloadObject(request);
    return payload.method === 'UPDATE';
  }
  isDelete(request: ActionRequest<P>): Promise<boolean> | boolean {
    const payload = this.getPayloadObject(request);
    return payload.method === 'DELETE';
  }
  async close(): Promise<void> {
    if (!this.client) return;
    await this.safeClose(
      async () => await this.client!.close(),
      async () => await (this.client as any).close(true),
      2000
    );
    this.client = undefined;
    this.db = undefined;
  }
}
