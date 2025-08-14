import http from 'http';
import https from 'https';
import nodeSqlParser from 'node-sql-parser';

/** Supported data source types for the MCP server. */
export type DataSourceTypes = 'mysql' | 'sqlite' | 'postgres' | 'mssql' | 'crud' | 'graphql' | 'mongodb';

/**
 * Generic connection configuration passed to data source implementations.
 *
 * Cfg represents provider-specific options (for example `ConnectionOptions`
 * for mysql or `ClientConfig` for pg). The top-level `options` property
 * contains provider-specific fields merged with any generic settings.
 */
export interface DatabaseSourceConfig<Cfg = unknown> {
  /** Unique connection id */
  id: string;
  /** The kind of data source (mysql, sqlite, etc.) */
  type: DataSourceTypes;
  /** Provider-specific options */
  options: {
    [key: string]: any;
  } & Cfg;
}

/** Error thrown when a requested action is not supported by a data source. */
export class UnsupportedActionError extends Error {
  constructor(action: string) {
    super(`Unsupported action: ${action}`);
    this.name = 'UnsupportedActionError';
  }
}

/** Payload extension carrying an optional table/collection name. */
export type TablePayload = { tableName?: string };

/**
 * Generic action payload passed to data source methods.
 *
 * The shape depends on the data source: SQL sources will use `sql` and
 * `params`, HTTP sources will use `endpoint`, `payload` and `headers`, and
 * NoSQL sources may expect provider-specific keys in the payload body.
 */
export type ActionPayload<T = Record<string, any>> = {
  /** Optional connection identifier */
  connectionId?: string;
  // Database options
  sql?: string;
  // Http options
  endpoint?: string;
  payload?: string | Record<string, any>;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  // Other options
  params?: any[];
} & Partial<T>;

/**
 * Base class for all data source implementations.
 *
 * T is the type returned by operation methods (select/insert/etc.). Cfg is
 * the type of the provider-specific connection options available on
 * `connectionConfig.options`.
 */
export abstract class DataSource<Cfg = unknown, T = unknown> {
  // Abstract methods for different operations
  abstract select(payload: ActionPayload): Promise<T>;
  abstract insert(payload: ActionPayload): Promise<T>;
  abstract update(payload: ActionPayload): Promise<T>;
  abstract delete(payload: ActionPayload): Promise<T>;
  abstract mutation(payload: ActionPayload): Promise<T>;

  // Abstract methods for testing the type of queries
  abstract isMutation(payload: ActionPayload): Promise<boolean> | boolean;
  abstract isSelect(payload: ActionPayload): Promise<boolean> | boolean;
  abstract isInsert(payload: ActionPayload): Promise<boolean> | boolean;
  abstract isUpdate(payload: ActionPayload): Promise<boolean> | boolean;
  abstract isDelete(payload: ActionPayload): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract showSchema(payload: ActionPayload<TablePayload>): Promise<T>;

  // Abstract methods for connecting and closing the data source
  abstract connect(payload: ActionPayload): Promise<void>;
  abstract close(payload: ActionPayload): Promise<void>;

  constructor(protected connectionConfig: DatabaseSourceConfig & { options: Cfg }) {}

  /**
   * Helper to attempt a graceful close and fall back after a timeout.
   * - closeFn: function that performs the graceful close (may return a Promise)
   * - fallbackFn: best-effort function to force-close resources if closeFn stalls
   * - timeoutMs: how long to wait before running fallbackFn
   *
   * This method unrefs the internal timer so it won't keep Node alive.
   */
  protected async safeClose(
    closeFn: () => Promise<any> | void,
    fallbackFn?: () => void | Promise<void>,
    timeoutMs = 2000
  ): Promise<void> {
    let closed = false;
    try {
      const p = (async () => {
        await closeFn();
        closed = true;
      })();

      const fallback = new Promise<void>(resolve => {
        const t = setTimeout(() => {
          if (!closed && fallbackFn) {
            try {
              // best-effort fallback, don't await
              (fallbackFn as any)();
            } catch (_) {
              /* ignore */
            }
          }
          resolve();
        }, timeoutMs);
        if (typeof (t as any).unref === 'function') (t as any).unref();
      });

      await Promise.race([p, fallback]);
    } catch (e) {
      // If closeFn throws, run fallbackFn as a last resort
      if (fallbackFn) {
        try {
          // best-effort
          (fallbackFn as any)();
        } catch (_) {
          /* ignore */
        }
      }
    }
  }
}

export abstract class SqlDataSource<T = unknown> extends DataSource<T> {
  abstract select(payload: ActionPayload): Promise<T>;
  abstract mutation(payload: ActionPayload): Promise<T>;
  abstract insert(payload: ActionPayload): Promise<T>;
  abstract update(payload: ActionPayload): Promise<T>;
  abstract delete(payload: ActionPayload): Promise<T>;
  abstract showSchema(payload: ActionPayload<TablePayload>): Promise<T>;
  /**
   * Parse the given SQL query and return its AST (Abstract Syntax Tree).
   * @parm sql The SQL query to parse.
   */
  #parseQuery(sql: string) {
    const { Parser } = nodeSqlParser;
    const parser = new Parser();
    const ast = parser.astify(sql);
    return ast;
  }
  /**
   * Check if the given SQL query is a mutation (INSERT, UPDATE, DELETE).
   * @parm sql The SQL query to check.
   */
  isMutation(payload: ActionPayload) {
    const ast = this.#parseQuery(payload.sql ?? '');
    if (Array.isArray(ast)) {
      // return false if the ast type has a non-select node
      return ast.some(node => node.type === 'insert' || node.type === 'update' || node.type === 'delete');
    }
    return true; // If the AST is not an array, we assume it's a non-select query
  }
  /**
   * Check if the given SQL query is a SELECT statement.
   * @parm sql The SQL query to check.
   */
  isSelect(payload: ActionPayload) {
    const ast = this.#parseQuery(payload.sql ?? '');
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @parm sql The SQL query to check.
   */
  isInsert(payload: ActionPayload) {
    const ast = this.#parseQuery(payload.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @parm sql The SQL query to check.
   */
  isUpdate(payload: ActionPayload) {
    const ast = this.#parseQuery(payload.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @parm sql The SQL query to check.
   */
  isDelete(payload: ActionPayload) {
    const ast = this.#parseQuery(payload.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @parm sql The SQL query to analyze.
   */
  queryTypes(payload: ActionPayload) {
    const types: string[] = [];
    if (this.isSelect(payload)) types.push('select');
    if (this.isInsert(payload)) types.push('insert');
    if (this.isUpdate(payload)) types.push('update');
    if (this.isDelete(payload)) types.push('delete');
    return types;
  }
}

export abstract class NoSqlDataSource<T = unknown> extends DataSource<T> {
  abstract select(payload: ActionPayload): Promise<T>;
  abstract mutation(payload: ActionPayload): Promise<T>;
  abstract insert(payload: ActionPayload): Promise<T>;
  abstract update(payload: ActionPayload): Promise<T>;
  abstract delete(payload: ActionPayload): Promise<T>;
  abstract showSchema(payload: ActionPayload<TablePayload>): Promise<T>;
}

export abstract class HttpDataSource<Cfg = unknown, T = unknown> extends DataSource<Cfg, T> {
  abstract select(payload: ActionPayload): Promise<T>;
  abstract mutation(payload: ActionPayload): Promise<T>;
  abstract insert(payload: ActionPayload): Promise<T>;
  abstract update(payload: ActionPayload): Promise<T>;
  abstract delete(payload: ActionPayload): Promise<T>;
  abstract showSchema(payload: ActionPayload<TablePayload>): Promise<T>;

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
    // Set a default timeout (e.g., 10 seconds) to prevent hanging requests
    const REQUEST_TIMEOUT = 10000;
    return new Promise((resolve, reject) => {
      const req = reqFn(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', err => reject(err));
      req.setTimeout(REQUEST_TIMEOUT, () => {
        req.destroy(new Error('Request timed out'));
        reject(new Error('Request timed out'));
      });
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
