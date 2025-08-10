import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

export class MSSQL extends SqlDataSource {
  private connection!: ConnectionPool;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = await sql.connect(config.options as unknown as MSSQLConfig);
  }

  async mutation(settings: ActionPayload): Promise<any> {
    const request = this.connection.request();
    const result = await request.query(settings.sql ?? '');
    return result.recordset;
  }

  async select(settings: ActionPayload): Promise<any> {
    if (!this.isSelect(settings)) throw new Error('The provided SQL query is not a SELECT statement.');
    const request = this.connection.request();
    const result = await request.query(settings.sql ?? '');
    return result.recordset;
  }

  async insert(settings: ActionPayload): Promise<any> {
    if (!this.isInsert(settings)) throw new Error('The provided SQL query is not an INSERT statement.');
    const request = this.connection.request();
    const result = await request.query(settings.sql ?? '');
    return result.recordset;
  }

  async update(settings: ActionPayload): Promise<any> {
    if (!this.isUpdate(settings)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const request = this.connection.request();
    const result = await request.query(settings.sql ?? '');
    return result.recordset;
  }

  async delete(settings: ActionPayload): Promise<any> {
    if (!this.isDelete(settings)) throw new Error('The provided SQL query is not a DELETE statement.');
    const request = this.connection.request();
    const result = await request.query(settings.sql ?? '');
    return result.recordset;
  }

  async listCollections(): Promise<any> {
    const result = await this.connection
      .request()
      .query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'");
    return result.recordset;
  }

  async showSchema(settings: ActionPayload<TablePayload>): Promise<any> {
    const result = await this.connection
      .request()
      .input('table', sql.VarChar, settings.tableName)
      .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`);
    return result.recordset;
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.close();
  }
}
