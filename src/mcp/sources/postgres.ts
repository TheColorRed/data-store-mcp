import { Client, type ClientConfig } from 'pg';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

export class Postgres extends SqlDataSource {
  private connection!: Client;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = new Client(config.options as ClientConfig);
  }

  async mutation(settings: ActionPayload): Promise<any> {
    const result = await this.connection.query(settings.sql ?? '');
    return result;
  }

  async select(settings: ActionPayload): Promise<any> {
    if (!this.isSelect(settings)) throw new Error('The provided SQL query is not a SELECT statement.');
    const result = await this.connection.query(settings.sql ?? '');
    return result;
  }

  async insert(settings: ActionPayload): Promise<any> {
    if (!this.isInsert(settings)) throw new Error('The provided SQL query is not an INSERT statement.');
    const result = await this.connection.query(settings.sql ?? '');
    return result;
  }

  async update(settings: ActionPayload): Promise<any> {
    if (!this.isUpdate(settings)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const result = await this.connection.query(settings.sql ?? '');
    return result;
  }

  async delete(settings: ActionPayload): Promise<any> {
    if (!this.isDelete(settings)) throw new Error('The provided SQL query is not a DELETE statement.');
    const result = await this.connection.query(settings.sql ?? '');
    return result;
  }

  async listCollections(): Promise<any> {
    const result = await this.connection.query('SELECT tablename FROM pg_tables WHERE schemaname = $1', ['public']);
    return result;
  }

  async showSchema(settings: ActionPayload<TablePayload>): Promise<any> {
    const tableName = settings.tableName;
    const [columns, indexes] = await Promise.all([
      this.connection.query('SELECT * FROM information_schema.columns WHERE table_name = $1', [tableName]),
      this.connection.query('SELECT * FROM pg_indexes WHERE tablename = $1', [tableName]),
    ]);
    return { columns, indexes };
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.end();
  }
}
