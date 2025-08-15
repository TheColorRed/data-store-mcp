import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import z from 'zod';
import {
  SqlDataSource,
  type ActionRequest,
  type DatabaseBasePayload,
  type PayloadDescription,
} from '../../database-source.js';

/**
 * Microsoft SQL Server (mssql) data source implementation.
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config database configuration passed from the connection layer
   */
export class MSSQL<P extends DatabaseBasePayload> extends SqlDataSource {
  /** Active connection pool instance */
  private connection!: ConnectionPool;
  describePayload(): PayloadDescription {
    return {
      sql: z.string(),
      params: z.record(z.any()).optional(),
    };
  }
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config - database configuration passed from the connection layer
   */
  async connect(): Promise<void> {
    this.connection = await sql.connect(this.connectionConfig.options as unknown as MSSQLConfig);
  }
  /** Execute a raw SQL mutation and return the recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async mutation(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
    const sqlRequest = this.connection.request();
    if (!payload.sql) throw new Error('SQL query is required for mutation.');
    const result = await sqlRequest.query(payload.sql);
    return result.recordset;
  }
  /** Run a SELECT query and return rows.
   * @param payload action payload containing `sql` and optional `params`
   */
  async select(request: ActionRequest<P>): Promise<any> {
    if (!this.isSelect(request)) throw new Error('The provided SQL query is not a SELECT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for select.');
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(payload.sql);
    return result.recordset;
  }
  /** Execute an INSERT statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async insert(request: ActionRequest<P>): Promise<any> {
    if (!this.isInsert(request)) throw new Error('The provided SQL query is not an INSERT statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for insert.');
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(payload.sql);
    return result.recordset;
  }
  /** Execute an UPDATE statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async update(request: ActionRequest<P>): Promise<any> {
    if (!this.isUpdate(request)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for update.');
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(payload.sql);
    return result.recordset;
  }
  /** Execute a DELETE statement and return the resulting recordset.
   * @param payload action payload containing `sql` and optional `params`
   */
  async delete(request: ActionRequest<P>): Promise<any> {
    if (!this.isDelete(request)) throw new Error('The provided SQL query is not a DELETE statement.');
    const payload = this.getPayloadObject(request);
    if (!payload.sql) throw new Error('SQL query is required for delete.');
    const sqlRequest = this.connection.request();
    const result = await sqlRequest.query(payload.sql);
    return result.recordset;
  }
  /**
   * Return column information for a table using INFORMATION_SCHEMA.
   * @param payload must contain `tableName`
   */
  async showSchema(request: ActionRequest<P>): Promise<any> {
    const payload = this.getPayloadObject(request);
    const result = await this.connection
      .request()
      .input('table', sql.VarChar, payload.tableName ?? '')
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
