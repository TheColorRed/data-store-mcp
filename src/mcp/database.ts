import http from 'http';
import https from 'https';
import nodeSqlParser from 'node-sql-parser';

export type DataSourceTypes = 'mysql' | 'sqlite' | 'postgres' | 'mssql' | 'crud' | 'graphql';

export interface DatabaseSourceConfig<Cfg = unknown> {
  id: string;
  type: DataSourceTypes;
  options: {
    [key: string]: any;
  } & Cfg;
}

export class UnsupportedActionError extends Error {
  constructor(action: string) {
    super(`Unsupported action: ${action}`);
    this.name = 'UnsupportedActionError';
  }
}

export type TablePayload = { tableName?: string };

export type ActionPayload<T = Record<string, any>> = {
  connectionId?: string;
  // Database options
  sql?: string;
  // Http options
  endpoint?: string;
  payload?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  // Other options
  params?: any[];
} & Partial<T>;

export abstract class DataSource<Cfg = unknown, T = unknown> {
  // Abstract methods for CRUD operations
  abstract select(settings: ActionPayload): Promise<T>;
  abstract insert(settings: ActionPayload): Promise<T>;
  abstract update(settings: ActionPayload): Promise<T>;
  abstract delete(settings: ActionPayload): Promise<T>;
  abstract mutation(settings: ActionPayload): Promise<T>;

  // Abstract methods for testing the type of queries
  abstract isMutation(settings: ActionPayload): Promise<boolean> | boolean;
  abstract isSelect(settings: ActionPayload): Promise<boolean> | boolean;
  abstract isInsert(settings: ActionPayload): Promise<boolean> | boolean;
  abstract isUpdate(settings: ActionPayload): Promise<boolean> | boolean;
  abstract isDelete(settings: ActionPayload): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract listCollections(settings: ActionPayload): Promise<T>;
  abstract showSchema(settings: ActionPayload<TablePayload>): Promise<T>;

  // Abstract methods for connecting and closing the data source
  abstract connect(settings: ActionPayload): Promise<void>;
  abstract close(settings: ActionPayload): Promise<void>;

  constructor(protected connectionConfig: DatabaseSourceConfig & { options: Cfg }) {}
}

export abstract class SqlDataSource<T = unknown> extends DataSource<T> {
  abstract select(settings: ActionPayload): Promise<T>;
  abstract mutation(settings: ActionPayload): Promise<T>;
  abstract insert(settings: ActionPayload): Promise<T>;
  abstract update(settings: ActionPayload): Promise<T>;
  abstract delete(settings: ActionPayload): Promise<T>;
  abstract listCollections(settings: ActionPayload): Promise<T>;
  abstract showSchema(settings: ActionPayload<TablePayload>): Promise<T>;
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
  isMutation(settings: ActionPayload) {
    const ast = this.#parseQuery(settings.sql ?? '');
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
  isSelect(settings: ActionPayload) {
    const ast = this.#parseQuery(settings.sql ?? '');
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @param sql The SQL query to check.
   */
  isInsert(settings: ActionPayload) {
    const ast = this.#parseQuery(settings.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @param sql The SQL query to check.
   */
  isUpdate(settings: ActionPayload) {
    const ast = this.#parseQuery(settings.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @param sql The SQL query to check.
   */
  isDelete(settings: ActionPayload) {
    const ast = this.#parseQuery(settings.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @param sql The SQL query to analyze.
   */
  queryTypes(settings: ActionPayload) {
    const types: string[] = [];
    if (this.isSelect(settings)) types.push('select');
    if (this.isInsert(settings)) types.push('insert');
    if (this.isUpdate(settings)) types.push('update');
    if (this.isDelete(settings)) types.push('delete');
    return types;
  }
}

export abstract class HttpDataSource<Cfg = unknown, T = unknown> extends DataSource<Cfg, T> {
  abstract select(settings: ActionPayload): Promise<T>;
  abstract mutation(settings: ActionPayload): Promise<T>;
  abstract insert(settings: ActionPayload): Promise<T>;
  abstract update(settings: ActionPayload): Promise<T>;
  abstract delete(settings: ActionPayload): Promise<T>;
  abstract listCollections(settings: ActionPayload): Promise<T>;
  abstract showSchema(settings: ActionPayload<TablePayload>): Promise<T>;

  /**
   * Makes an HTTP request to the GraphQL endpoint.
   * @param payload The payload containing the request details.
   */
  protected makeHttpRequest(payload: ActionPayload): Promise<string> {
    if (!payload.endpoint) return Promise.reject(new Error('No endpoint specified'));

    const url = new URL(payload.endpoint ?? '');
    const isHttps = url.protocol === 'https:';
    const reqFn = isHttps ? https.request : http.request;
    const options: https.RequestOptions = url;
    if (isHttps) {
      options.rejectUnauthorized = false; // Allow self-signed certs
    }
    options.method = payload.method ?? 'GET';
    options.headers = payload.headers ?? {};
    return new Promise((resolve, reject) => {
      const req = reqFn(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', err => reject(err));
      if (payload.payload) req.write(payload.payload);
      req.end();
    });
  }

  isSelect() {
    return true;
  }

  isInsert() {
    return false;
  }

  isUpdate() {
    return false;
  }

  isDelete() {
    return false;
  }

  isMutation() {
    return false;
  }
}
