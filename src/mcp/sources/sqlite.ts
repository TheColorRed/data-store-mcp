import sqlite, { type Database } from 'sqlite3';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

const Promisify =
  (fn: Function) =>
  (...args: any[]) =>
    new Promise((resolve, reject) => {
      fn(...args, (err: Error | null, result: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });

export class SQLite extends SqlDataSource {
  private connection!: Database;

  async connect(config: DatabaseSourceConfig): Promise<void> {
    this.connection = new sqlite.Database(config.options.filename, parseInt(config.options.mode));
  }

  async mutation(settings: ActionPayload): Promise<any> {
    const result = await Promisify(this.connection.run.bind(this.connection))(settings.sql);
    return result;
  }

  async select(settings: ActionPayload): Promise<any> {
    if (!this.isSelect(settings)) {
      throw new Error('The provided SQL query is not a SELECT statement.');
    }
    const result = await Promisify(this.connection.all.bind(this.connection))(settings.sql);
    return result;
  }

  async insert(settings: ActionPayload): Promise<any> {
    if (!this.isInsert(settings)) {
      throw new Error('The provided SQL query is not an INSERT statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(settings.sql);
    return result ?? true;
  }

  async update(settings: ActionPayload): Promise<any> {
    if (!this.isUpdate(settings)) {
      throw new Error('The provided SQL query is not an UPDATE statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(settings.sql);
    return result ?? true;
  }

  async delete(settings: ActionPayload): Promise<any> {
    if (!this.isDelete(settings)) {
      throw new Error('The provided SQL query is not a DELETE statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(settings.sql);
    return result ?? true;
  }

  async listCollections(): Promise<any> {
    const result = await Promisify(this.connection.all.bind(this.connection))(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    return result ?? [];
  }

  async showSchema(settings: ActionPayload<TablePayload>): Promise<any> {
    const tableName = settings.tableName ?? '';
    const result = await Promisify(this.connection.all.bind(this.connection))(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return result ?? [];
  }

  async close(): Promise<void> {
    if (this.connection) {
      await Promisify(this.connection.close.bind(this.connection))();
    }
  }
}
