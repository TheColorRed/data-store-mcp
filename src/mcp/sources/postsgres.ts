import { Client, type ClientConfig } from 'pg';
import { SqlDataSource, type DatabaseSourceConfig } from '../database.js';

export class Postgres extends SqlDataSource {
  private connection!: Client;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = new Client(config.options as ClientConfig);
  }

  async mutation(sql: string): Promise<any> {
    const result = await this.connection.query(sql);
    return result;
  }

  async select(sql: string): Promise<any> {
    if (!this.isSelect(sql)) throw new Error('The provided SQL query is not a SELECT statement.');
    const result = await this.connection.query(sql);
    return result;
  }

  async insert(sql: string): Promise<any> {
    if (!this.isInsert(sql)) throw new Error('The provided SQL query is not an INSERT statement.');
    const result = await this.connection.query(sql);
    return result;
  }

  async update(sql: string): Promise<any> {
    if (!this.isUpdate(sql)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const result = await this.connection.query(sql);
    return result;
  }

  async delete(sql: string): Promise<any> {
    if (!this.isDelete(sql)) throw new Error('The provided SQL query is not a DELETE statement.');
    const result = await this.connection.query(sql);
    return result;
  }

  async listCollections(): Promise<any> {
    const result = await this.connection.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', ['public']);
    return result;
  }

  async showCollectionSchema(collection: string): Promise<any> {
    const [columns, indexes] = await Promise.all([
      this.connection.query('SELECT * FROM information_schema.columns WHERE table_name = $1', [collection]),
      this.connection.query('SELECT * FROM pg_indexes WHERE tablename = $1', [collection]),
    ]);
    return { columns, indexes };
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.end();
  }
}
