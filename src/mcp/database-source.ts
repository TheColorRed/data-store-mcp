import http from 'http';
import https from 'https';
import nodeSqlParser from 'node-sql-parser';
import z, { ZodTypeAny, type ZodType } from 'zod';

/** Supported data source types for the MCP server. */
export type DataSourceTypes = 'mysql' | 'sqlite' | 'postgres' | 'mssql' | 'crud' | 'graphql' | 'mongodb' | 's3';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
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
  /** The list of tools that are not allowed to run for this connection. */
  disallowedTools?: string[];
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

/**
 * Generic action payload passed to data source methods.
 *
 * The shape depends on the data source: SQL sources will use `sql` and
 * `params`, HTTP sources will use `endpoint`, `payload` and `headers`, and
 * NoSQL sources may expect provider-specific keys in the payload body.
 */
export type ActionRequest<T = string | Record<string, any>> = {
  /** Optional connection identifier. */
  connectionId?: string;
  /** The payload for the action. */
  payload?: T;
  // Database options
  // sql?: string;
  // Http options
  // endpoint?: string;
  // method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  // headers?: Record<string, string>;
  // Other options
  // params?: any[];
};

export interface PayloadDescription {
  [key: string]: ZodType<any>;
}

export interface DatabaseBasePayload {
  /** The SQL query to execute */
  sql: string;
  /** Optional parameters for prepared statements */
  params?: Record<string, any>;
  /** Optional table name for the query */
  tableName?: string;
}

export interface BaseHttpPayload {
  /** The URL endpoint to call */
  endpoint: string;
  /** The HTTP method to use */
  method?: HttpMethod;
  /** Optional headers to include in the request */
  headers?: Record<string, string>;
  /** Optional body for the request */
  body?: string | Record<string, any>;
}

/**
 * Base class for all data source implementations.
 *
 * T is the type returned by operation methods (select/insert/etc.). Cfg is
 * the type of the provider-specific connection options available on
 * `connectionConfig.options`.
 */
export abstract class DataSource<Payload = unknown, Response = unknown> {
  // Abstract methods for different operations
  abstract select(request: ActionRequest<Payload>): Promise<Response>;
  abstract insert(request: ActionRequest<Payload>): Promise<Response>;
  abstract update(request: ActionRequest<Payload>): Promise<Response>;
  abstract delete(request: ActionRequest<Payload>): Promise<Response>;
  abstract mutation(request: ActionRequest<Payload>): Promise<Response>;
  abstract describePayload(): PayloadDescription;

  // Abstract methods for testing the type of queries
  abstract isMutation(request: ActionRequest<Payload>): Promise<boolean> | boolean;
  abstract isSelect(request: ActionRequest<Payload>): Promise<boolean> | boolean;
  abstract isInsert(request: ActionRequest<Payload>): Promise<boolean> | boolean;
  abstract isUpdate(request: ActionRequest<Payload>): Promise<boolean> | boolean;
  abstract isDelete(request: ActionRequest<Payload>): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract showSchema(request: ActionRequest<Payload>): Promise<Response>;

  // Abstract methods for connecting and closing the data source
  abstract connect(): Promise<void>;
  abstract close(): Promise<void>;

  constructor(readonly connectionConfig: DatabaseSourceConfig & { options: any }) {}
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
  /**
   * Ensure the incoming payload is an object. If a string is supplied the
   * function will attempt to parse JSON.
   * @param payload The raw action payload passed to the data source
   */
  protected getPayloadObject<T>(payload: ActionRequest<T>): T {
    const raw = payload.payload ?? {};
    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as T;
      } catch (e) {
        const err = e as Error;
        throw new Error('Invalid JSON in payload string.\n' + err.message);
      }
    }
    return raw as T;
  }
}

export abstract class SqlDataSource<
  Payload extends DatabaseBasePayload = DatabaseBasePayload,
  Response = unknown
> extends DataSource<Payload, Response> {
  abstract select(request: ActionRequest<Payload>): Promise<Response>;
  abstract mutation(request: ActionRequest<Payload>): Promise<Response>;
  abstract insert(request: ActionRequest<Payload>): Promise<Response>;
  abstract update(request: ActionRequest<Payload>): Promise<Response>;
  abstract delete(request: ActionRequest<Payload>): Promise<Response>;
  abstract showSchema(request: ActionRequest<Payload>): Promise<Response>;
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
  isMutation<Payload extends DatabaseBasePayload>(request: ActionRequest<Payload>) {
    const ast = this.#parseQuery(request.payload?.sql ?? '');
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
  isSelect(request: ActionRequest<Payload>) {
    const ast = this.#parseQuery(request.payload?.sql ?? '');
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @parm sql The SQL query to check.
   */
  isInsert(request: ActionRequest<Payload>) {
    const ast = this.#parseQuery(request.payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @parm sql The SQL query to check.
   */
  isUpdate(request: ActionRequest<Payload>) {
    const ast = this.#parseQuery(request.payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @parm sql The SQL query to check.
   */
  isDelete(request: ActionRequest<Payload>) {
    const ast = this.#parseQuery(request.payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @parm sql The SQL query to analyze.
   */
  queryTypes(request: ActionRequest<Payload>) {
    const types: string[] = [];
    if (this.isSelect(request)) types.push('select');
    if (this.isInsert(request)) types.push('insert');
    if (this.isUpdate(request)) types.push('update');
    if (this.isDelete(request)) types.push('delete');
    return types;
  }
}

export abstract class NoSqlDataSource<Payload = unknown, Response = unknown> extends DataSource<Payload, Response> {
  abstract select(payload: ActionRequest<Payload>): Promise<Response>;
  abstract mutation(payload: ActionRequest<Payload>): Promise<Response>;
  abstract insert(payload: ActionRequest<Payload>): Promise<Response>;
  abstract update(payload: ActionRequest<Payload>): Promise<Response>;
  abstract delete(payload: ActionRequest<Payload>): Promise<Response>;
  abstract showSchema(payload: ActionRequest<Payload>): Promise<Response>;
}

export abstract class HttpDataSource<
  P extends BaseHttpPayload = BaseHttpPayload,
  Response = unknown
> extends DataSource<P, Response> {
  abstract select(request: ActionRequest<P>): Promise<Response>;
  abstract mutation(request: ActionRequest<P>): Promise<Response>;
  abstract insert(request: ActionRequest<P>): Promise<Response>;
  abstract update(request: ActionRequest<P>): Promise<Response>;
  abstract delete(request: ActionRequest<P>): Promise<Response>;
  abstract showSchema(request: ActionRequest<P>): Promise<Response>;

  protected combinePayload(types: { [key: string]: ZodTypeAny } | ZodTypeAny) {
    const objectSchema =
      typeof types === 'object' && !('parse' in types)
        ? z.object(types as { [key: string]: ZodTypeAny }).optional()
        : (types as ZodTypeAny);

    return {
      endpoint: z.string().url().describe('The URL endpoint to call'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('The HTTP method to use'),
      headers: z.record(z.string()).optional().describe('Optional headers to include in the request'),
      body: z.union([z.string(), objectSchema]).optional().describe('Optional body for the request'),
    } as PayloadDescription;
  }

  /**
   * Makes an HTTP request to the specified endpoint.
   * @param payload The payload containing the request details.
   */
  protected makeHttpRequest(payload: P): Promise<string> {
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
      if (payload) req.write(payload);
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

export abstract class UnknownDataSource<Payload = unknown, Response = unknown> extends DataSource<Payload, Response> {
  abstract select(payload: ActionRequest<Payload>): Promise<Response>;
  abstract mutation(payload: ActionRequest<Payload>): Promise<Response>;
  abstract insert(payload: ActionRequest<Payload>): Promise<Response>;
  abstract update(payload: ActionRequest<Payload>): Promise<Response>;
  abstract delete(payload: ActionRequest<Payload>): Promise<Response>;
  abstract showSchema(payload: ActionRequest<Payload>): Promise<Response>;

  isSelect() {
    return false;
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
