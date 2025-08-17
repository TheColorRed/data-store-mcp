import sqlite, { type Database } from 'sqlite3';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Tiny helper to convert callback-style sqlite3 functions into promises.
 * Accepts a function with a Node-style callback and returns a function that
 * returns a Promise resolving with the callback's result.
 */
const Promisify =
  (fn: Function) =>
  (...args: any[]) =>
    new Promise((resolve, reject) =>
      fn(...args, (err: Error | null, result: any) => (err ? reject(err) : resolve(result)))
    );

export class SQLite<P extends DatabasePayloadBase> extends SqlDataSource<P> {
  private connection!: Database;

  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }

  async connect(): Promise<void> {
    this.connection = new sqlite.Database(
      this.connectionConfig.options.filename,
      parseInt(this.connectionConfig.options.mode)
    );
  }
  /**
   * Execute a statement that mutates the database.
   * @param payload action payload containing `sql`
   */
  async mutation(): Promise<any> {
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return await Promisify(this.connection.run.bind(this.connection))(this.payload.sql);
  }
  /**
   * Run a SELECT query and return rows as an array.
   * @param payload action payload containing `sql`
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return await Promisify(this.connection.all.bind(this.connection))(this.payload.sql);
  }
  /**
   * Execute an INSERT statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return (await Promisify(this.connection.run.bind(this.connection))(this.payload.sql)) ?? true;
  }
  /**
   * Execute an UPDATE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return (await Promisify(this.connection.run.bind(this.connection))(this.payload.sql)) ?? true;
  }
  /**
   * Execute a DELETE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return (await Promisify(this.connection.run.bind(this.connection))(this.payload.sql)) ?? true;
  }
  /**
   * Return the CREATE statement for the named table from sqlite_master.
   * @param payload action payload with optional `tableName`
   */
  async showSchema(): Promise<any> {
    const tableName = this.payload.tableName ?? '';
    return (
      (await Promisify(this.connection.all.bind(this.connection))(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      )) ?? []
    );
  }
  /** Close the sqlite database handle cleanly. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await Promisify(this.connection.close.bind(this.connection))(),
      () => (this.connection as any).close?.(),
      2000
    );
  }
}
