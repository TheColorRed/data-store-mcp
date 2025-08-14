import mongodb from 'mongodb';
import { ActionPayload, DatabaseSourceConfig, NoSqlDataSource, TablePayload } from '../database.js';

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
export class MongoDB extends NoSqlDataSource {
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
  /**
   * Ensure the incoming payload is an object. If a string is supplied the
   * function will attempt to parse JSON.
   * @param payload The raw action payload passed to the data source
   * @returns The parsed payload as a MongoDbPayload
   */
  #getPayloadObject(payload: ActionPayload<TablePayload & MongoDbPayload>) {
    const raw = payload.payload ?? {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as MongoDbPayload;
      } catch (err) {
        throw new Error('Invalid JSON in payload string.');
      }
    }
    return raw as MongoDbPayload;
  }
  async connect(config: DatabaseSourceConfig): Promise<void> {
    /**
     * Connect to MongoDB and set `this.client` and `this.db`.
     * @param config Database connection configuration returned from the MCP
     * @returns void
     */
    const url = config.options.url ?? '';
    const opts = { ...(config.options.options ?? {}) } as mongodb.MongoClientOptions;
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
  async showSchema(payload: ActionPayload<TablePayload>): Promise<unknown> {
    const table = payload.tableName ?? '';
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
  async select(payload: ActionPayload<TablePayload & MongoDbPayload>): Promise<unknown> {
    if (!payload.payload) throw new Error(this.#payloadError());
    const payloadObj = this.#getPayloadObject(payload);

    if (!payloadObj.tableName)
      throw new Error('Missing key `tableName`. This is the collection that you want to query.');
    if (!payloadObj.filter) throw new Error(this.#payloadError());
    if (!this.db) throw new Error('Database not found.');
    const collection = this.db?.collection(payloadObj.tableName);
    return (await collection?.find(payloadObj.filter).toArray()) ?? [];
  }
  /**
   * Dispatch a MongoDB style action based on `method` in the payload. Supports
   * SELECT, INSERT, UPDATE, DELETE and DELETE_TABLE.
   * @param payload action payload with `method` and other parameters
   */
  async mutation(payload: ActionPayload<MongoDbPayload>): Promise<unknown> {
    const payloadObject = this.#getPayloadObject(payload);

    if (payloadObject.method === 'SELECT') return this.select(payload);
    else if (payloadObject.method === 'INSERT') return this.insert(payload);
    else if (payloadObject.method === 'UPDATE') return this.update(payload);
    else if (payloadObject.method === 'DELETE') return this.delete(payload);
    else if (payloadObject.method === 'DELETE_TABLE') {
      if (!payloadObject.tableName) throw new Error(this.#payloadError());
      return this.dropTable(payload);
    }
    throw new Error(
      `Unsupported method: ${payload.method} expected \`SELECT\`, \`INSERT\`, \`UPDATE\`, \`DELETE\`, or \`DELETE_TABLE\`.`
    );
  }

  /** Drop (delete) the specified collection from the database. */
  /**
   * Drop (delete) the specified collection from the database.
   * @param payload payload containing `tableName` of the collection to drop
   */
  async dropTable(payload: ActionPayload<TablePayload>): Promise<unknown> {
    if (!this.db) throw new Error('Database not found.');
    if (!payload.tableName) throw new Error(`Missing key \`tableName\`.\n${this.#payloadError()}`);
    const collection = this.db.collection(payload.tableName);
    return collection.drop();
  }

  /**
   * Insert a single document or an array of documents into a collection.
   * @param payload payload containing `tableName` and `value` to insert
   */
  async insert(payload: ActionPayload<MongoDbPayload>): Promise<unknown> {
    const payloadObject = this.#getPayloadObject(payload);
    if (!payloadObject.value) throw new Error(`Missing key \`value\`.\n${this.#payloadError()}`);
    const collection = this.db?.collection(payloadObject.tableName);
    if (Array.isArray(payloadObject.value)) return collection?.insertMany(payloadObject.value);
    return collection?.insertOne(payloadObject.value);
  }
  /**
   * Update documents matching `filter` with the provided `value` document.
   * @param payload payload containing `tableName`, `filter`, and `value`
   */
  async update(payload: ActionPayload<MongoDbPayload>): Promise<unknown> {
    const payloadObject = this.#getPayloadObject(payload);
    if (!payloadObject.filter) throw new Error(`Missing key \`filter\`.\n${this.#payloadError()}`);
    if (!payloadObject.value) throw new Error(`Missing key \`value\`.\n${this.#payloadError()}`);
    return this.db?.collection(payloadObject.tableName).updateMany(payloadObject.filter, payloadObject.value);
  }
  /**
   * Delete documents matching `filter` (supports array of filters for `$or`).
   * @param payload payload containing `tableName` and `filter`
   */
  async delete(payload: ActionPayload<MongoDbPayload>): Promise<unknown> {
    const payloadObj = this.#getPayloadObject(payload);
    if (!payload.payload) throw new Error(this.#payloadError());

    if (!payloadObj.tableName) throw new Error(`Missing key \`tableName\`.\n${this.#payloadError()}`);
    if (!payloadObj.filter) throw new Error(`Missing key \`filter\`.\n${this.#payloadError()}`);
    const collection = this.db?.collection(payloadObj.tableName);
    if (Array.isArray(payloadObj.filter)) return collection?.deleteMany({ $or: payloadObj.filter });
    return collection?.deleteMany(payloadObj.filter);
  }
  isMutation(payload: ActionPayload<MongoDbPayload>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents a mutation (insert/update/delete).
     * @param payload The action payload to inspect
     * @returns true when the payload method is a mutation
     */
    const payloadObj = this.#getPayloadObject(payload);
    return (
      payloadObj.method === 'INSERT' ||
      payloadObj.method === 'UPDATE' ||
      payloadObj.method === 'DELETE' ||
      payloadObj.method === 'DELETE_TABLE'
    );
  }
  isSelect(payload: ActionPayload<MongoDbPayload>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents a SELECT operation.
     * @param payload The action payload to inspect
     * @returns true when the payload method is SELECT
     */
    const payloadObj = this.#getPayloadObject(payload);
    return payloadObj.method === 'SELECT';
  }
  isInsert(payload: ActionPayload<MongoDbPayload>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents an INSERT operation.
     * @param payload The action payload to inspect
     * @returns true when the payload method is INSERT
     */
    const payloadObj = this.#getPayloadObject(payload);
    return payloadObj.method === 'INSERT';
  }
  isUpdate(payload: ActionPayload<MongoDbPayload>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents an UPDATE operation.
     * @param payload The action payload to inspect
     * @returns true when the payload method is UPDATE
     */
    const payloadObj = this.#getPayloadObject(payload);
    return payloadObj.method === 'UPDATE';
  }
  isDelete(payload: ActionPayload<MongoDbPayload>): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents a DELETE operation.
     * @param payload The action payload to inspect
     * @returns true when the payload method is DELETE
     */
    const payloadObj = this.#getPayloadObject(payload);
    return payloadObj.method === 'DELETE';
  }
  async close(): Promise<void> {
    /**
     * Close the MongoDB client connection and clear internal references.
     * Uses `safeClose` to attempt graceful shutdown with a small fallback.
     */
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
