import { Client, type ClientConfig } from 'pg';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Postgres data source implementation using `pg`.
 *
 * Provides basic SQL execution methods and a helper to inspect table schema
 * and indexes via information_schema and pg_indexes.
 */
export class Postgres extends SqlDataSource {
  /** The active PG client instance (not connected until connect() is called) */
  private connection!: Client;
  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }
  /** Store client configuration and prepare a Client instance.
   * @param config connection configuration containing ClientConfig in options
   */
  async connect(): Promise<void> {
    this.connection = new Client(this.connectionConfig.options as ClientConfig);
    try {
      await this.connection.connect();
    } catch (error) {
      throw error;
    }
  }
  /**
   * Execute an arbitrary SQL statement and return the driver result.
   */
  async mutation(): Promise<any> {
    try {
      if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
      const result = await this.connection.query(this.payload.sql);
      console.error('mutation success');
      return result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }
  /**
   * Run a SELECT query and return the driver result.
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.connection.query(this.payload.sql);
    return result;
  }
  /**
   * Execute an INSERT statement.
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.connection.query(this.payload.sql);
    return result;
  }
  /**
   * Execute an UPDATE statement.
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.connection.query(this.payload.sql);
    return result;
  }
  /**
   * Execute a DELETE statement.
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.connection.query(this.payload.sql);
    return result;
  }
  /**
   * Return column and index information for a given table.
   */
  async showSchema(): Promise<any> {
    const tableName = this.payload.tableName ?? '';
    if (this.payload.tableName) {
      const [columns, indexes] = await Promise.all([
        this.connection.query('SELECT * FROM information_schema.columns WHERE table_name = $1', [tableName]),
        this.connection.query('SELECT * FROM pg_indexes WHERE tablename = $1', [tableName]),
      ]);
      return { columns, indexes };
    } else {
      // get everything
      const [columns, indexes] = await Promise.all([
        this.connection.query('SELECT * FROM information_schema.columns'),
        this.connection.query('SELECT * FROM pg_indexes'),
      ]);
      return { columns, indexes };
    }
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
