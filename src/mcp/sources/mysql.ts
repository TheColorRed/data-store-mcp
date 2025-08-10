import mysql, { type Connection, type ConnectionOptions } from 'mysql2/promise';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

export class MySQL extends SqlDataSource {
  private connection!: Connection;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = await mysql.createConnection(config.options as ConnectionOptions);
  }

  async mutation(settings: ActionPayload): Promise<any> {
    const [result] = await this.connection.execute(settings.sql ?? '', settings.params);
    return result;
  }

  async select(settings: ActionPayload): Promise<any> {
    if (!this.isSelect(settings)) throw new Error('The provided SQL query is not a SELECT statement.');
    const [rows] = await this.connection.query(settings.sql ?? '', settings.params);
    return rows;
  }

  async insert(settings: ActionPayload): Promise<any> {
    if (!this.isInsert(settings)) throw new Error('The provided SQL query is not an INSERT statement.');
    const [result] = await this.connection.execute(settings.sql ?? '', settings.params);
    return result;
  }

  async update(settings: ActionPayload): Promise<any> {
    if (!this.isUpdate(settings)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const [result] = await this.connection.execute(settings.sql ?? '', settings.params);
    return result;
  }

  async delete(settings: ActionPayload): Promise<any> {
    if (!this.isDelete(settings)) throw new Error('The provided SQL query is not a DELETE statement.');
    const [result] = await this.connection.execute(settings.sql ?? '', settings.params);
    return result;
  }

  async listCollections(): Promise<any> {
    const [rows] = await this.connection.query('SHOW TABLES');
    return rows;
  }

  async showSchema(settings?: ActionPayload<TablePayload>): Promise<any> {
    const tableName = settings?.tableName;
    if (tableName) {
      const [rows] = await this.connection.query('SHOW CREATE TABLE ??', [tableName]);
      return rows;
    }

    const [database] = await this.connection.query('SELECT DATABASE() AS current_db');
    const currentDb = (database as any).current_db ?? this.connectionConfig.options.database ?? '';
    // Get all table schemas if no table name is provided
    const [[tables], [procedures], [functions]] = await Promise.all([
      this.connection.query('SHOW TABLES'),
      this.connection.query('SHOW PROCEDURE STATUS WHERE Db = ?', [currentDb]),
      this.connection.query('SHOW FUNCTION STATUS WHERE Db = ?', [currentDb]),
    ]);
    const tablePromises = (tables as any[]).map(async table => {
      const tableName = Object.values(table)[0];
      const [schema] = await this.connection.query('SHOW CREATE TABLE ??', [tableName]);
      return { tableName, schema };
    });
    const procedurePromises = (procedures as any[]).map(async proc => {
      const procedureName = proc.Name;
      const [schema] = await this.connection.query('SHOW CREATE PROCEDURE ??', [procedureName]);
      return { procedureName, schema };
    });
    const functionPromises = (functions as any[]).map(async func => {
      const functionName = func.Name;
      const [schema] = await this.connection.query('SHOW CREATE FUNCTION ??', [functionName]);
      return { functionName, schema };
    });
    return Promise.all([...tablePromises, ...procedurePromises, ...functionPromises]);
  }

  async close(): Promise<void> {
    if (this.connection) await this.connection.end();
  }
}
