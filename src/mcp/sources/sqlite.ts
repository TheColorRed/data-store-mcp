import sqlite, { type Database } from 'sqlite3';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

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

export class SQLite extends SqlDataSource {
  private connection!: Database;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = new sqlite.Database(config.options.filename, parseInt(config.options.mode));
  }

  /** Execute a statement that mutates the database.
   * @param payload action payload containing `sql`
   */
  async mutation(payload: ActionPayload): Promise<any> {
    return await Promisify(this.connection.run.bind(this.connection))(payload.sql);
  }

  /** Run a SELECT query and return rows as an array.
   * @param payload action payload containing `sql`
   */
  async select(payload: ActionPayload): Promise<any> {
    if (!this.isSelect(payload)) throw new Error('The provided SQL query is not a SELECT statement.');
    return await Promisify(this.connection.all.bind(this.connection))(payload.sql);
  }

  /** Execute an INSERT statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async insert(payload: ActionPayload): Promise<any> {
    if (!this.isInsert(payload)) throw new Error('The provided SQL query is not an INSERT statement.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }

  /** Execute an UPDATE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async update(payload: ActionPayload): Promise<any> {
    if (!this.isUpdate(payload)) throw new Error('The provided SQL query is not an UPDATE statement.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }

  /** Execute a DELETE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async delete(payload: ActionPayload): Promise<any> {
    if (!this.isDelete(payload)) throw new Error('The provided SQL query is not a DELETE statement.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }

  /** Return the CREATE statement for the named table from sqlite_master.
   * @param payload action payload with optional `tableName`
   */
  async showSchema(payload: ActionPayload<TablePayload>): Promise<any> {
    const tableName = payload.tableName ?? '';
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
