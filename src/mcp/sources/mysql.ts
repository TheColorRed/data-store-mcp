import { createConnection, type Connection, type ConnectionOptions } from 'mysql2/promise';
import { SqlDataSource, type DatabaseSourceConfig } from '../database.js';

export class MySQL extends SqlDataSource {
  private connection!: Connection;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = await createConnection(config.options as ConnectionOptions);
  }

  async mutation(sql: string, params?: any[]): Promise<any> {
    const [result] = await this.connection.execute(sql, params);
    return result;
  }

  async select(sql: string, params?: any[]): Promise<any> {
    if (!this.isSelect(sql)) throw new Error('The provided SQL query is not a SELECT statement.');
    const [rows] = await this.connection.query(sql, params);
    return rows;
  }

  async insert(sql: string, params?: any[]): Promise<any> {
    if (!this.isInsert(sql)) throw new Error('The provided SQL query is not an INSERT statement.');
    const [result] = await this.connection.execute(sql, params);
    return result;
  }

  async update(sql: string, params?: any[]): Promise<any> {
    if (!this.isUpdate(sql)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const [result] = await this.connection.execute(sql, params);
    return result;
  }

  async delete(sql: string, params?: any[]): Promise<any> {
    if (!this.isDelete(sql)) throw new Error('The provided SQL query is not a DELETE statement.');
    const [result] = await this.connection.execute(sql, params);
    return result;
  }

  async listCollections(): Promise<any> {
    const [rows] = await this.connection.query('SHOW TABLES');
    return rows;
  }

  async showCollectionSchema(collection: string): Promise<any> {
    const [rows] = await this.connection.query('SHOW CREATE TABLE ??', [collection]);
    return rows;
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.end();
  }
}
