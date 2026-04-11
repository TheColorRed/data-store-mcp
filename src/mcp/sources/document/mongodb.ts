import mongodb from 'mongodb';
import z from 'zod';
import { NoSqlDataSource, type PayloadDescription } from '../../database-source.js';

export interface MongoDbConfig {
  url: string;
  options: mongodb.MongoClientOptions;
}

export interface MongoPayload {
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
export class MongoDB<P extends MongoPayload> extends NoSqlDataSource<P> {
  client?: mongodb.MongoClient | undefined;
  db?: mongodb.Db | undefined;
  describePayload(): PayloadDescription<MongoPayload> {
    return {
      method: z
        .enum(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DELETE_TABLE'])
        .describe('The operation to perform on the collection.'),
      tableName: z.string().describe('The name of the collection to operate on.'),
      filter: z.record(z.any()).describe('The filter to apply to the collection.'),
      value: z.record(z.any()).optional().describe('The value to insert or update in the collection.'),
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
  async showSchema(): Promise<object> {
    const table = this.payload?.tableName ?? '';
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
  async select(): Promise<object> {
    if (!this.db) throw new Error('Database not found.');
    if (!this.payload) throw new Error(this.getPayloadMissingKeyError());
    if (!this.payload.tableName) throw new Error(this.getPayloadMissingKeyError('tableName'));
    if (!this.payload.filter) throw new Error(this.getPayloadMissingKeyError('filter'));

    const collection = this.db?.collection(this.payload.tableName);
    return (await collection?.find(this.payload.filter).toArray()) ?? [];
  }
  /**
   * Dispatch a MongoDB style action based on `method` in the this.payload. Supports
   * SELECT, INSERT, UPDATE, DELETE and DELETE_TABLE.
   * @param payload action payload with `method` and other parameters
   */
  async mutation(): Promise<object | boolean> {
    if (this.payload.method === 'SELECT') return this.select();
    else if (this.payload.method === 'INSERT') return this.insert();
    else if (this.payload.method === 'UPDATE') return this.update();
    else if (this.payload.method === 'DELETE') return this.delete();
    else if (this.payload.method === 'DELETE_TABLE') return this.dropTable();

    throw new Error(this.getPayloadInvalidValueError(this.payload.method));
  }

  /** Drop (delete) the specified collection from the database. */
  /**
   * Drop (delete) the specified collection from the database.
   * @param payload payload containing `tableName` of the collection to drop
   */
  async dropTable(): Promise<boolean> {
    if (!this.db) throw new Error('Database not found.');
    if (!this.payload) throw new Error(this.getPayloadMissingKeyError());
    if (!this.payload.tableName) throw new Error(this.getPayloadMissingKeyError('tableName'));

    const collection = this.db.collection(this.payload.tableName);
    return collection.drop();
  }

  /**
   * Insert a single document or an array of documents into a collection.
   * @param payload payload containing `tableName` and `value` to insert
   */
  async insert(): Promise<object> {
    if (!this.db) throw new Error('Database not found.');
    if (!this.payload) throw new Error(this.getPayloadMissingKeyError());
    if (!this.payload.value) throw new Error(this.getPayloadMissingKeyError('value'));

    const collection = this.db?.collection(this.payload.tableName);
    if (Array.isArray(this.payload.value)) return collection?.insertMany(this.payload.value);
    return collection?.insertOne(this.payload.value);
  }
  /**
   * Update documents matching `filter` with the provided `value` document.
   * @param payload payload containing `tableName`, `filter`, and `value`
   */
  async update(): Promise<object> {
    if (!this.db) throw new Error('Database not found.');
    if (!this.payload) throw new Error(this.getPayloadMissingKeyError());
    if (!this.payload.filter) throw new Error(this.getPayloadMissingKeyError('filter'));
    if (!this.payload.value) throw new Error(this.getPayloadMissingKeyError('value'));

    const collection = this.db?.collection(this.payload.tableName);
    if (Array.isArray(this.payload.value)) return collection?.updateOne(this.payload.filter, this.payload.value);
    return collection?.updateMany(this.payload.filter, this.payload.value);
  }
  /**
   * Delete documents matching `filter` (supports array of filters for `$or`).
   * @param payload payload containing `tableName` and `filter`
   */
  async delete(): Promise<object> {
    if (!this.db) throw new Error('Database not found.');
    if (!this.payload) throw new Error(this.getPayloadMissingKeyError());
    if (!this.payload.tableName) throw new Error(this.getPayloadMissingKeyError('tableName'));
    if (!this.payload.filter) throw new Error(this.getPayloadMissingKeyError('filter'));

    const collection = this.db?.collection(this.payload.tableName);
    if (Array.isArray(this.payload.filter)) return collection?.deleteMany({ $or: this.payload.filter });
    return collection?.deleteMany(this.payload.filter);
  }
  isMutation(): Promise<boolean> | boolean {
    /**
     * Check whether the payload represents a mutation (insert/update/delete).
     * @param payload The action payload to inspect
     * @returns true when the payload method is a mutation
     */
    return (
      this.payload.method === 'INSERT' ||
      this.payload.method === 'UPDATE' ||
      this.payload.method === 'DELETE' ||
      this.payload.method === 'DELETE_TABLE'
    );
  }
  isSelect(): Promise<boolean> | boolean {
    return this.payload.method === 'SELECT';
  }
  isInsert(): Promise<boolean> | boolean {
    return this.payload.method === 'INSERT';
  }
  isUpdate(): Promise<boolean> | boolean {
    return this.payload.method === 'UPDATE';
  }
  isDelete(): Promise<boolean> | boolean {
    return this.payload.method === 'DELETE';
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
