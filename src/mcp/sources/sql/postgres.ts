import { Client, type ClientConfig } from 'pg';
import z from 'zod';
import {
  SqlDataSource,
  type ActionRequest,
  type DatabaseBasePayload,
  type PayloadDescription,
} from '../../database-source.js';

/**
 * Postgres data source implementation using `pg`.
 *
 * Provides basic SQL execution methods and a helper to inspect table schema
 * and indexes via information_schema and pg_indexes.
 */
export class Postgres<P extends DatabaseBasePayload> extends SqlDataSource {
  /** The active PG client instance (not connected until connect() is called) */
  private connection!: Client;
  describePayload(): PayloadDescription {
    return {
      sql: z.string(),
      params: z.record(z.any()).optional(),
    };
  }
  /** Store client configuration and prepare a Client instance.
   * @param config connection configuration containing ClientConfig in options
   */
  async connect(): Promise<void> {
    this.connection = new Client(this.connectionConfig.options as ClientConfig);
  }

  /** Execute an arbitrary SQL statement and return the driver result.
   * @param payload action payload containing `sql` and optional `params`
   */
  async mutation(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for mutation.');
    const result = await this.connection.query(payload.sql);
    return result;
  }

  /** Run a SELECT query and return the driver result.
   * @param payload action payload containing `sql` and optional `params`
   */
  async select(request: ActionRequest<P>): Promise<any> {
    if (!this.isSelect(request)) throw new Error('The provided SQL query is not a SELECT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for select.');
    const result = await this.connection.query(payload.sql);
    return result;
  }

  /** Execute an INSERT statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async insert(request: ActionRequest<P>): Promise<any> {
    if (!this.isInsert(request)) throw new Error('The provided SQL query is not an INSERT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for insert.');
    const result = await this.connection.query(payload.sql);
    return result;
  }

  /** Execute an UPDATE statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async update(request: ActionRequest<P>): Promise<any> {
    if (!this.isUpdate(request)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for update.');
    const result = await this.connection.query(payload.sql);
    return result;
  }

  /** Execute a DELETE statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async delete(request: ActionRequest<P>): Promise<any> {
    if (!this.isDelete(request)) throw new Error('The provided SQL query is not a DELETE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for delete.');
    const result = await this.connection.query(payload.sql);
    return result;
  }

  /**
   * Return column and index information for a given table.
   * @param payload must include `tableName`
   */
  async showSchema(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
    const tableName = payload.tableName ?? '';
    const [columns, indexes] = await Promise.all([
      this.connection.query('SELECT * FROM information_schema.columns WHERE table_name = $1', [tableName]),
      this.connection.query('SELECT * FROM pg_indexes WHERE tablename = $1', [tableName]),
    ]);
    return { columns, indexes };
  }

  /** Close the client connection gracefully. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await this.connection.end(),
      () => (this.connection as any).destroy?.(),
      2000
    );
  }
}
