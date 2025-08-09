import { Database } from 'sqlite3';
import { SqlDataSource, type DatabaseSourceConfig } from '../database.js';

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
    this.connection = new Database(config.options.filename, parseInt(config.options.mode));
  }

  async mutation(sql: string): Promise<any> {
    const result = await Promisify(this.connection.run.bind(this.connection))(sql);
    return result;
  }

  async select(sql: string): Promise<any> {
    if (!this.isSelect(sql)) {
      throw new Error('The provided SQL query is not a SELECT statement.');
    }
    const result = await Promisify(this.connection.all.bind(this.connection))(sql);
    return result;
  }

  async insert(sql: string): Promise<any> {
    if (!this.isInsert(sql)) {
      throw new Error('The provided SQL query is not an INSERT statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(sql);
    return result ?? true;
  }

  async update(sql: string): Promise<any> {
    if (!this.isUpdate(sql)) {
      throw new Error('The provided SQL query is not an UPDATE statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(sql);
    return result ?? true;
  }

  async delete(sql: string): Promise<any> {
    if (!this.isDelete(sql)) {
      throw new Error('The provided SQL query is not a DELETE statement.');
    }
    const result = await Promisify(this.connection.run.bind(this.connection))(sql);
    return result ?? true;
  }

  async listCollections(): Promise<any> {
    const result = await Promisify(this.connection.all.bind(this.connection))(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    return result ?? [];
  }

  async showCollectionSchema(collection: string): Promise<any> {
    const result = await Promisify(this.connection.all.bind(this.connection))(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
      [collection]
    );
    return result ?? [];
  }

  async close(): Promise<void> {
    if (this.connection) {
      await Promisify(this.connection.close.bind(this.connection))();
    }
  }
}
