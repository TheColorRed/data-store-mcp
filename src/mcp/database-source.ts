import http from 'http';
import https from 'https';
import nodeSqlParser from 'node-sql-parser';
import z, { ZodTypeAny, type ZodType } from 'zod';

/** Supported data source types for the MCP server. */
export type DataSourceTypes = 'mysql' | 'sqlite' | 'postgres' | 'mssql' | 'rest' | 'ftp' | 'graphql' | 'mongodb' | 's3';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
/**
 * Generic connection configuration passed to data source implementations.
 *
 * Cfg represents provider-specific options (for example `ConnectionOptions`
 * for mysql or `ClientConfig` for pg). The top-level `options` property
 * contains provider-specific fields merged with any generic settings.
 */
export interface DataSourceConfig<Cfg = unknown> {
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
};
/** The return type of an action, such as select, insert, etc. */
export type ReturnType = string | boolean | object | string[] | boolean[] | object[];
/** The response type of an action, such as select, insert, etc. */
export type ResponseType = string | boolean | object | Record<string, any>;
/** The format for how a payload should be structured. */
export type PayloadDescription<T extends object> = {
  [K in keyof Required<T>]: ZodType<any>;
};
/** The base payload for database actions. */
export interface DatabasePayloadBase {
  /** The SQL query to execute. */
  sql: string;
  /** Optional parameters for prepared statements. */
  params?: Record<string, any>;
  /** Optional table name for the query */
  tableName?: string;
}
/** The base payload for HTTP actions. */
export interface HttpPayloadBase {
  /** The URL endpoint to call. */
  endpoint: string;
  /** The HTTP method to use. */
  method?: HttpMethod;
  /** Optional headers to include in the request. */
  headers?: Record<string, string>;
  /** Optional body for the request. */
  body?: string | Record<string, any>;
}
/** Error thrown when a requested action is not supported by a data source. */
export class UnsupportedActionError extends Error {
  constructor(action: string) {
    super(`Unsupported action: ${action}`);
    this.name = 'UnsupportedActionError';
  }
}
/**
 * Base class for all data source implementations.
 *
 * T is the type returned by operation methods (select/insert/etc.). Cfg is
 * the type of the provider-specific connection options available on
 * `connectionConfig.options`.
 */
export abstract class DataSource<P = unknown, Cfg = unknown> {
  // Abstract methods for connecting and closing the data source
  abstract connect(): Promise<void>;
  abstract close(): Promise<void>;
  abstract describePayload(): PayloadDescription<object>;

  // Abstract methods for different operations
  abstract select(): Promise<ReturnType>;
  abstract insert(): Promise<ReturnType>;
  abstract update(): Promise<ReturnType>;
  abstract delete(): Promise<ReturnType>;
  abstract mutation(): Promise<ReturnType>;

  // Abstract methods for testing the type of queries
  abstract isMutation(): Promise<boolean> | boolean;
  abstract isSelect(): Promise<boolean> | boolean;
  abstract isInsert(): Promise<boolean> | boolean;
  abstract isUpdate(): Promise<boolean> | boolean;
  abstract isDelete(): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract showSchema(): Promise<ReturnType>;

  readonly payload: P;
  constructor(readonly connectionConfig: DataSourceConfig<Cfg>, readonly request: ActionRequest<P>) {
    this.payload = this.getPayloadObject(request);
  }
  /**
   * A message that hints to the agent to run the 'payload' tool.
   * @param missingKeys The missing key or keys in the payload. If not provided, it will return a generic payload error message.
   */
  getPayloadMissingKeyError(...missingKeys: string[]) {
    const missingKeyString =
      missingKeys.length > 1
        ? `The payload is missing the following keys: \`${missingKeys.join('`, `')}\`.\n`
        : missingKeys.length === 1
        ? `The payload is missing the following key \`${missingKeys[0]}\`.\n`
        : '';
    return `${missingKeyString}To get a valid \`payload\`, run the #payload tool.`;
  }
  /**
   * A message that instructs the agent to run the 'payload' tool.
   * @param invalidKeyValues The invalid key or keys in the payload. If not provided, it will return a generic payload error message.
   */
  getPayloadInvalidValueError(...invalidKeyValues: string[]) {
    const missingKeyString =
      invalidKeyValues.length > 1
        ? `The payload has invalid values for the following keys: \`${invalidKeyValues.join('`, `')}\`.\n`
        : invalidKeyValues.length === 1
        ? `The payload has an invalid value for the following key: \`${invalidKeyValues[0]}\`.\n`
        : '';
    return `${missingKeyString}To get a valid \`payload\`, run the #payload tool.`;
  }
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
        throw new Error(`Invalid JSON in payload string.\n${err.message}\n${this.getPayloadMissingKeyError()}`);
      }
    }
    return raw as T;
  }
}

export abstract class SqlDataSource<
  P extends DatabasePayloadBase = DatabasePayloadBase,
  Cfg = unknown
> extends DataSource<P, Cfg> {
  abstract select(): Promise<ReturnType>;
  abstract mutation(): Promise<ReturnType>;
  abstract insert(): Promise<ReturnType>;
  abstract update(): Promise<ReturnType>;
  abstract delete(): Promise<ReturnType>;
  abstract showSchema(): Promise<ReturnType>;
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
  protected sqlPayloadInformation(): PayloadDescription<DatabasePayloadBase> {
    return {
      sql: z.string().describe('Required SQL query to execute'),
      params: z.record(z.any()).optional().describe('Optional parameters for the SQL query'),
      tableName: z.string().optional().describe('Optional table name for the SQL query'),
    };
  }
  /**
   * Check if the given SQL query is a mutation (INSERT, UPDATE, DELETE).
   * @parm sql The SQL query to check.
   */
  isMutation() {
    const ast = this.#parseQuery(this.request.payload?.sql ?? '');
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
  isSelect() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.#parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @parm sql The SQL query to check.
   */
  isInsert() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.#parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @parm sql The SQL query to check.
   */
  isUpdate() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.#parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @parm sql The SQL query to check.
   */
  isDelete() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.#parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @parm sql The SQL query to analyze.
   */
  queryTypes() {
    const types: string[] = [];
    if (this.isSelect()) types.push('select');
    if (this.isInsert()) types.push('insert');
    if (this.isUpdate()) types.push('update');
    if (this.isDelete()) types.push('delete');
    return types;
  }
}

export abstract class NoSqlDataSource<P = unknown, Cfg = unknown> extends DataSource<P, Cfg> {
  abstract select(): Promise<ReturnType>;
  abstract mutation(): Promise<ReturnType>;
  abstract insert(): Promise<ReturnType>;
  abstract update(): Promise<ReturnType>;
  abstract delete(): Promise<ReturnType>;
  abstract showSchema(): Promise<ReturnType>;
}

export abstract class HttpDataSource<P = HttpPayloadBase, Cfg = unknown> extends DataSource<P, Cfg> {
  abstract select(): Promise<ReturnType>;
  abstract mutation(): Promise<ReturnType>;
  abstract insert(): Promise<ReturnType>;
  abstract update(): Promise<ReturnType>;
  abstract delete(): Promise<ReturnType>;
  abstract showSchema(): Promise<ReturnType>;

  protected combinePayload(types: { [key: string]: ZodTypeAny } | ZodTypeAny) {
    const objectSchema =
      typeof types === 'object' && !('parse' in types)
        ? z.object(types as { [key: string]: ZodTypeAny }).optional()
        : (types as ZodTypeAny);

    return {
      endpoint: z.string().url().describe('The URL endpoint to call.'),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe('The HTTP method to use.'),
      headers: z.record(z.string()).optional().describe('Optional headers to include in the request.'),
      body: z
        .union([z.string(), objectSchema])
        .optional()
        .describe('Optional body for the request. This can be either a string or an object.'),
    } as PayloadDescription<HttpPayloadBase>;
  }

  /**
   * Makes an HTTP request to the specified endpoint.
   * @param payload The payload containing the request details.
   */
  protected makeHttpRequest(payload: HttpPayloadBase): Promise<string> {
    if (!payload.endpoint) return Promise.reject(new Error('No endpoint specified'));

    const url = new URL(payload.endpoint ?? '');
    const isHttps = url.protocol === 'https:';
    const reqFn = isHttps ? https.request : http.request;
    const options: https.RequestOptions = url;
    if (isHttps) {
      options.rejectUnauthorized = false; // Allow self-signed certs
    }
    options.method = payload.method ?? 'GET';
    options.headers = {
      ...this.connectionConfig.options.headers,
      ...(payload.headers ?? {}),
    };
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
      if (payload.body) req.write(typeof payload.body === 'string' ? payload.body : JSON.stringify(payload.body));
      req.end();
    });
  }

  isSelect(): boolean {
    return true;
  }

  isInsert(): boolean {
    return true;
  }

  isUpdate(): boolean {
    return true;
  }

  isDelete(): boolean {
    return true;
  }

  isMutation(): boolean {
    return true;
  }
}

export abstract class UnknownDataSource<Payload = unknown> extends DataSource<Payload> {
  abstract select(): Promise<ReturnType>;
  abstract mutation(): Promise<ReturnType>;
  abstract insert(): Promise<ReturnType>;
  abstract update(): Promise<ReturnType>;
  abstract delete(): Promise<ReturnType>;
  abstract showSchema(): Promise<ReturnType>;

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
