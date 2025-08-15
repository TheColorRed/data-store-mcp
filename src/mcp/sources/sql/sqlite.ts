import sqlite, { type Database } from 'sqlite3';
import z from 'zod';
import {
  SqlDataSource,
  type ActionRequest,
  type DatabaseBasePayload,
  type PayloadDescription,
} from '../../database-source.js';

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

export class SQLite<P extends DatabaseBasePayload> extends SqlDataSource {
  private connection!: Database;

  describePayload(): PayloadDescription {
    return {
      sql: z.string(),
    };
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
  async mutation(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for mutation.');
    return await Promisify(this.connection.run.bind(this.connection))(payload.sql);
  }
  /**
   * Run a SELECT query and return rows as an array.
   * @param payload action payload containing `sql`
   */
  async select(request: ActionRequest<P>): Promise<any> {
    if (!this.isSelect(request)) throw new Error('The provided SQL query is not a SELECT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for select.');
    return await Promisify(this.connection.all.bind(this.connection))(payload.sql);
  }
  /**
   * Execute an INSERT statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async insert(request: ActionRequest<P>): Promise<any> {
    if (!this.isInsert(request)) throw new Error('The provided SQL query is not an INSERT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for insert.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }
  /**
   * Execute an UPDATE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async update(request: ActionRequest<P>): Promise<any> {
    if (!this.isUpdate(request)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for update.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }
  /**
   * Execute a DELETE statement and return the driver result or `true`.
   * @param payload action payload containing `sql`
   */
  async delete(request: ActionRequest<P>): Promise<any> {
    if (!this.isDelete(request)) throw new Error('The provided SQL query is not a DELETE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for delete.');
    return (await Promisify(this.connection.run.bind(this.connection))(payload.sql)) ?? true;
  }
  /**
   * Return the CREATE statement for the named table from sqlite_master.
   * @param payload action payload with optional `tableName`
   */
  async showSchema(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
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
