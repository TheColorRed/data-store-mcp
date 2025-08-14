import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

/**
 * Microsoft SQL Server (mssql) data source implementation.
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config database configuration passed from the connection layer
   */
export class MSSQL extends SqlDataSource {
  /** Active connection pool instance */
  private connection!: ConnectionPool;

  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config - database configuration passed from the connection layer
   */
  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = await sql.connect(config.options as unknown as MSSQLConfig);
  }

  /** Execute a raw SQL mutation and return the recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async mutation(payload: ActionPayload): Promise<any> {
    const request = this.connection.request();
    const result = await request.query(payload.sql ?? '');
    return result.recordset;
  }

  /** Run a SELECT query and return rows.
   * @param payload action payload containing `sql` and optional `params`
   */
  async select(payload: ActionPayload): Promise<any> {
    if (!this.isSelect(payload)) throw new Error('The provided SQL query is not a SELECT statement.');
    const request = this.connection.request();
    const result = await request.query(payload.sql ?? '');
    return result.recordset;
  }

  /** Execute an INSERT statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async insert(payload: ActionPayload): Promise<any> {
    if (!this.isInsert(payload)) throw new Error('The provided SQL query is not an INSERT statement.');
    const request = this.connection.request();
    const result = await request.query(payload.sql ?? '');
    return result.recordset;
  }

  /** Execute an UPDATE statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async update(payload: ActionPayload): Promise<any> {
    if (!this.isUpdate(payload)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const request = this.connection.request();
    const result = await request.query(payload.sql ?? '');
    return result.recordset;
  }

  /** Execute a DELETE statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async delete(payload: ActionPayload): Promise<any> {
    if (!this.isDelete(payload)) throw new Error('The provided SQL query is not a DELETE statement.');
    const request = this.connection.request();
    const result = await request.query(payload.sql ?? '');
    return result.recordset;
  }

  /**
   * Return column information for a table using INFORMATION_SCHEMA.
   * @param payload must contain `tableName`
   */
  async showSchema(payload: ActionPayload<TablePayload>): Promise<any> {
    const result = await this.connection
      .request()
      .input('table', sql.VarChar, payload.tableName)
      .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`);
    return result.recordset;
  }

  /** Close the connection pool gracefully. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await this.connection.close(),
      () => (this.connection as any).close?.(),
      2000
    );
  }
}
