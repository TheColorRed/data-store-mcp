import nodeSqlParser from 'node-sql-parser';

export type DataSourceTypes = 'mysql' | 'sqlite' | 'postgres' | 'mssql';

export interface DatabaseSourceConfig {
  id: string;
  type: DataSourceTypes;
  options: {
    [key: string]: string;
  };
}

export class UnsupportedActionError extends Error {
  constructor(action: string) {
    super(`Unsupported action: ${action}`);
    this.name = 'UnsupportedActionError';
  }
}

export abstract class DataSource<T = unknown> {
  // Abstract methods for CRUD operations
  abstract select(sql: string, params?: any[]): Promise<T>;
  abstract insert(sql: string, params?: any[]): Promise<T>;
  abstract update(sql: string, params?: any[]): Promise<T>;
  abstract delete(sql: string, params?: any[]): Promise<T>;
  abstract mutation(sql: string, params?: any[]): Promise<T>;

  // Abstract methods for testing the type of queries
  abstract isMutation(sql: string): Promise<boolean> | boolean;
  abstract isSelect(sql: string): Promise<boolean> | boolean;
  abstract isInsert(sql: string): Promise<boolean> | boolean;
  abstract isUpdate(sql: string): Promise<boolean> | boolean;
  abstract isDelete(sql: string): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract listCollections(): Promise<T>;
  abstract showCollectionSchema(collection: string): Promise<T>;

  // Abstract methods for connecting and closing the data source
  abstract connect(config: any): Promise<void>;
  abstract close(): Promise<void>;
}

export abstract class SqlDataSource<T = unknown> extends DataSource<T> {
  abstract select(sql: string): Promise<T>;
  abstract insert(sql: string): Promise<T>;
  abstract update(sql: string): Promise<T>;
  abstract delete(sql: string): Promise<T>;
  abstract mutation(sql: string): Promise<T>;
  abstract listCollections(): Promise<T>;
  abstract showCollectionSchema(collection: string): Promise<T>;
  /**
   * Parse the given SQL query and return its AST (Abstract Syntax Tree).
   * @param sql The SQL query to parse.
   */
  #parseQuery(sql: string) {
    const { Parser } = nodeSqlParser;
    const parser = new Parser();
    const ast = parser.astify(sql);
    return ast;
  }
  /**
   * Check if the given SQL query is a mutation (INSERT, UPDATE, DELETE).
   * @param sql The SQL query to check.
   */
  isMutation(sql: string) {
    const ast = this.#parseQuery(sql);
    if (Array.isArray(ast)) {
      // return false if the ast type has a non-select node
      return ast.some(node => node.type === 'insert' || node.type === 'update' || node.type === 'delete');
    }
    return true; // If the AST is not an array, we assume it's a non-select query
  }
  /**
   * Check if the given SQL query is a SELECT statement.
   * @param sql The SQL query to check.
   */
  isSelect(sql: string) {
    const ast = this.#parseQuery(sql);
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @param sql The SQL query to check.
   */
  isInsert(sql: string) {
    const ast = this.#parseQuery(sql);
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @param sql The SQL query to check.
   */
  isUpdate(sql: string) {
    const ast = this.#parseQuery(sql);
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @param sql The SQL query to check.
   */
  isDelete(sql: string) {
    const ast = this.#parseQuery(sql);
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @param sql The SQL query to analyze.
   */
  queryTypes(sql: string) {
    const types: string[] = [];
    if (this.isSelect(sql)) types.push('select');
    if (this.isInsert(sql)) types.push('insert');
    if (this.isUpdate(sql)) types.push('update');
    if (this.isDelete(sql)) types.push('delete');
    return types;
  }
}
