import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import { SqlDataSource, type DatabaseSourceConfig } from '../database.js';

export class MSSQL extends SqlDataSource {
  private connection!: ConnectionPool;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = await sql.connect(config.options as unknown as MSSQLConfig);
  }

  async mutation(sql: string): Promise<any> {
    const request = this.connection.request();
    const result = await request.query(sql);
    return result.recordset;
  }

  async select(sql: string): Promise<any> {
    if (!this.isSelect(sql)) throw new Error('The provided SQL query is not a SELECT statement.');
    const request = this.connection.request();
    const result = await request.query(sql);
    return result.recordset;
  }

  async insert(sql: string): Promise<any> {
    if (!this.isInsert(sql)) throw new Error('The provided SQL query is not an INSERT statement.');
    const request = this.connection.request();
    const result = await request.query(sql);
    return result.recordset;
  }

  async update(sql: string): Promise<any> {
    if (!this.isUpdate(sql)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const request = this.connection.request();
    const result = await request.query(sql);
    return result.recordset;
  }

  async delete(sql: string): Promise<any> {
    if (!this.isDelete(sql)) throw new Error('The provided SQL query is not a DELETE statement.');
    const request = this.connection.request();
    const result = await request.query(sql);
    return result.recordset;
  }

  async listCollections(): Promise<any> {
    const result = await this.connection
      .request()
      .query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    return result.recordset;
  }

  async showCollectionSchema(collection: string): Promise<any> {
    const result = await this.connection
      .request()
      .input('table', sql.VarChar, collection)
      .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`);
    return result.recordset;
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.close();
  }
}
