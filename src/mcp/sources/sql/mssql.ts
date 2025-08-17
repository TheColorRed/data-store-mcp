import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Microsoft SQL Server (mssql) data source implementation.
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config database configuration passed from the connection layer
   */
export class MSSQL<P extends DatabasePayloadBase> extends SqlDataSource<P> {
  /** Active connection pool instance */
  private connection!: ConnectionPool;
  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config - database configuration passed from the connection layer
   */
  async connect(): Promise<void> {
    this.connection = await sql.connect(this.connectionConfig.options as unknown as MSSQLConfig);
  }
  /**
   * Execute a raw SQL mutation and return the recordset.
   */
  async mutation(): Promise<any> {
    const sqlRequest = this.connection.request();
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Run a SELECT query and return rows.
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute an INSERT statement and return the resulting recordset.
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute an UPDATE statement and return the resulting recordset.
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute a DELETE statement and return the resulting recordset.
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Return column information for a table using INFORMATION_SCHEMA.
   */
  async showSchema(): Promise<any> {
    const result = await this.connection
      .request()
      .input('table', sql.VarChar, this.payload.tableName ?? '')
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
