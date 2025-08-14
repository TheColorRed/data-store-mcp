import { Client, type ClientConfig } from 'pg';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

/**
 * Postgres data source implementation using `pg`.
 *
 * Provides basic SQL execution methods and a helper to inspect table schema
 * and indexes via information_schema and pg_indexes.
 */
export class Postgres extends SqlDataSource {
  /** The active PG client instance (not connected until connect() is called) */
  private connection!: Client;

  /** Store client configuration and prepare a Client instance.
   * @param config connection configuration containing ClientConfig in options
   */
  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = new Client(config.options as ClientConfig);
  }

  /** Execute an arbitrary SQL statement and return the driver result.
   * @param payload action payload containing `sql` and optional `params`
   */
  async mutation(payload: ActionPayload): Promise<any> {
    const result = await this.connection.query(payload.sql ?? '');
    return result;
  }

  /** Run a SELECT query and return the driver result.
   * @param payload action payload containing `sql` and optional `params`
   */
  async select(payload: ActionPayload): Promise<any> {
    if (!this.isSelect(payload)) throw new Error('The provided SQL query is not a SELECT statement.');
    const result = await this.connection.query(payload.sql ?? '');
    return result;
  }

  /** Execute an INSERT statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async insert(payload: ActionPayload): Promise<any> {
    if (!this.isInsert(payload)) throw new Error('The provided SQL query is not an INSERT statement.');
    const result = await this.connection.query(payload.sql ?? '');
    return result;
  }

  /** Execute an UPDATE statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async update(payload: ActionPayload): Promise<any> {
    if (!this.isUpdate(payload)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const result = await this.connection.query(payload.sql ?? '');
    return result;
  }

  /** Execute a DELETE statement.
   * @param payload action payload containing `sql` and optional `params`
   */
  async delete(payload: ActionPayload): Promise<any> {
    if (!this.isDelete(payload)) throw new Error('The provided SQL query is not a DELETE statement.');
    const result = await this.connection.query(payload.sql ?? '');
    return result;
  }

  /**
   * Return column and index information for a given table.
   * @param payload must include `tableName`
   */
  async showSchema(payload: ActionPayload<TablePayload>): Promise<any> {
    const tableName = payload.tableName;
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
