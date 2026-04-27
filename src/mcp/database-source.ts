import http from 'http';
import https from 'https';
import nodeSqlParser from 'node-sql-parser';
import z, { ZodTypeAny, type ZodType } from 'zod';

/** Supported data source types for the MCP server. */
export type DataSourceTypes =
  // Databases
  | 'mysql'
  | 'mariadb'
  | 'sqlite'
  | 'postgres'
  | 'mssql'
  // APIs
  | 'rest'
  | 'ftp'
  | 'graphql'
  // Document
  | 'mongodb'
  // Key-Value
  | 'redis'
  // Other
  | 'azure-blob'
  | 's3';
/** HTTP methods supported by HTTP-based data sources. */
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
export type ActionReturnType = string | boolean | object | string[] | boolean[] | object[] | null | undefined;
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
  /** Optional flag to list all tables */
  listTables?: boolean;
  /** Optional flag to list all stored procedures */
  listProcedures?: boolean;
  /** Optional flag to list all stored functions */
  listFunctions?: boolean;
  /** Optional flag to list all views */
  listViews?: boolean;
  /** Optional flag to list all triggers */
  listTriggers?: boolean;
  /** Optional query timeout in milliseconds */
  timeout?: number;
  /** Optional page number (1-based). Use together with limit as the page size. When set, select returns rows, page, totalPages, and totalRows. */
  page?: number;
  /** Optional page size for pagination. Defaults to 20 if page is set without limit. */
  pageSize?: number;
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
  /**
   * @param action The name of the unsupported action that was requested.
   */
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
  abstract select(): Promise<ActionReturnType>;
  abstract insert(): Promise<ActionReturnType>;
  abstract update(): Promise<ActionReturnType>;
  abstract delete(): Promise<ActionReturnType>;
  abstract mutation(): Promise<ActionReturnType>;

  // Abstract methods for testing the type of queries
  abstract isMutation(): Promise<boolean> | boolean;
  abstract isSelect(): Promise<boolean> | boolean;
  abstract isInsert(): Promise<boolean> | boolean;
  abstract isUpdate(): Promise<boolean> | boolean;
  abstract isDelete(): Promise<boolean> | boolean;

  // Abstract methods for schema operations
  abstract showSchema(): Promise<ActionReturnType>;

  /** The resolved payload object extracted from the incoming request. */
  readonly payload: P;
  /**
   * @param connectionConfig The connection configuration for this data source instance.
   * @param request The incoming action request containing the connection id and payload.
   */
  constructor(
    readonly connectionConfig: DataSourceConfig<Cfg>,
    readonly request: ActionRequest<P>,
  ) {
    this.payload = this.getPayloadObject(request);
  }
  /**
   * A message that hints to the agent to run the 'payload' tool.
   * @param missingKeys The missing key or keys in the payload. If not provided, it will return a generic payload error message.
   */
  getPayloadMissingKeyError(...missingKeys: (string | { key: string; message: string })[]) {
    const missingKeyString =
      missingKeys.length > 1
        ? `The payload is missing the following keys: \n${missingKeys.map(kv => '  - ' + (typeof kv === 'string' ? `\`${kv}\`` : `\`${kv.key}\`` + ': ' + kv.message + '\n')).join('')}`
        : missingKeys.length === 1
          ? `The payload is missing the following key: ${typeof missingKeys[0] === 'string' ? `\`${missingKeys[0]}\`` : `\`${missingKeys[0].key}\`` + ': ' + missingKeys[0].message}.\n`
          : '';
    return `${missingKeyString}To get a valid \`payload\`, run the #payload tool.`;
  }
  /**
   * A message that instructs the agent to run the 'payload' tool.
   * @param invalidKeyValues The invalid key or keys in the payload. If not provided, it will return a generic payload error message.
   */
  getPayloadInvalidValueError(...invalidKeyValues: (string | { key: string; message: string })[]) {
    const missingKeyString =
      invalidKeyValues.length > 1
        ? `The payload has invalid values for the following keys: \n${invalidKeyValues.map(kv => '  - ' + (typeof kv === 'string' ? `\`${kv}\`` : `\`${kv.key}\`` + ': ' + kv.message + '\n')).join('')}`
        : invalidKeyValues.length === 1
          ? `The payload has an invalid value for the following key: ${typeof invalidKeyValues[0] === 'string' ? `\`${invalidKeyValues[0]}\`` : `\`${invalidKeyValues[0].key}\`` + ': ' + invalidKeyValues[0].message}.\n`
          : '';
    return `${missingKeyString}To get a valid \`payload\`, run the #payload tool.`;
  }
  /**
   * Helper to attempt a graceful close and fall back after a timeout.
   * @param closeFn Function that performs the graceful close (may return a Promise).
   * @param fallbackFn Best-effort function to force-close resources if closeFn stalls.
   * @param timeoutMs How long to wait before running fallbackFn.
   *
   * This method unrefs the internal timer so it won't keep Node alive.
   */
  protected async safeClose(
    closeFn: () => Promise<any> | void,
    fallbackFn?: () => void | Promise<void>,
    timeoutMs = 2000,
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

/**
 * Abstract base class for SQL database data sources.
 *
 * Extends `DataSource` with SQL-specific helpers for query parsing, pagination,
 * and schema introspection. P must extend `DatabasePayloadBase`; Cfg is the
 * provider-specific connection options type.
 */
export abstract class SqlDataSource<
  P extends DatabasePayloadBase = DatabasePayloadBase,
  Cfg = unknown,
> extends DataSource<P, Cfg> {
  abstract select(): Promise<ActionReturnType>;
  abstract mutation(): Promise<ActionReturnType>;
  abstract insert(): Promise<ActionReturnType>;
  abstract update(): Promise<ActionReturnType>;
  abstract delete(): Promise<ActionReturnType>;
  abstract showSchema(): Promise<ActionReturnType>;
  /**
   * Parse the given SQL query and return its AST (Abstract Syntax Tree).
   * @param sql The SQL query to parse.
   */
  protected parseQuery(sql: string) {
    let { Parser } = nodeSqlParser;
    const parser = new Parser();
    const opt = { database: 'MySQL' }; // Default to MySQL/MariaDB syntax
    if (this.connectionConfig.type === 'postgres') opt.database = 'Postgresql';
    if (this.connectionConfig.type === 'sqlite') opt.database = 'SQLite';
    if (this.connectionConfig.type === 'mssql') opt.database = 'TransactSQL';
    return parser.astify(sql, opt);
  }
  /**
   * Returns true when the SQL has no WHERE clause and no LIMIT, meaning the
   * agent provided no filtering and the result set should be paginated automatically.
   * @param sql The SQL query to check.
   */
  protected shouldPaginate(sql: string): boolean {
    try {
      const ast = this.parseQuery(sql);
      const node = Array.isArray(ast) ? ast[0] : ast;
      return !(node as any)?.where && !(node as any)?.limit;
    } catch {
      return false;
    }
  }
  /**
   * Assemble a schema result object from parallel query results.
   * @param results The array of query results, where some may be false if the query was not run.
   * @param keys An ordered list of `[flag, label]` pairs matching the result array.
   * @param extractRows A function that converts a single driver result to a plain array of rows.
   */
  protected buildSchemaResult(
    results: (any | false)[],
    keys: [boolean | undefined, string][],
    extractRows: (res: any) => any[],
  ): Record<string, any[]> {
    return Object.fromEntries(
      keys
        .map(([flag, label], i) => (flag && typeof results[i] !== 'boolean' ? [label, extractRows(results[i])] : null))
        .filter((e): e is [string, any[]] => e !== null),
    );
  }
  /**
   * Compute the paginated and count SQL strings plus resolved page/size values
   * from the current payload. Call after confirming shouldPaginate is true.
   * @param baseSql The original SQL string without a trailing semicolon.
   */
  protected buildPaginationSql(baseSql: string): {
    pagedSql: string;
    countSql: string;
    currentPage: number;
    pageSize: number;
  } {
    const { pageSize, page } = this.payload as DatabasePayloadBase;
    const size = typeof pageSize === 'number' ? Math.max(1, Math.trunc(Math.abs(pageSize))) : 20;
    const currentPage = typeof page === 'number' ? Math.max(1, Math.trunc(Math.abs(page))) : 1;
    const rowOffset = (currentPage - 1) * size;
    return {
      pagedSql: `${baseSql} LIMIT ${size} OFFSET ${rowOffset}`,
      countSql: `SELECT COUNT(*) AS total FROM (${baseSql}) AS _pagination_count`,
      currentPage,
      pageSize: size,
    };
  }
  /**
   * Assemble the standard pagination response envelope.
   * @param rows The rows returned by the paged query.
   * @param totalRows The total number of rows returned by the count query.
   * @param currentPage The current page number.
   * @param pageSize The number of rows per page.
   */
  protected assemblePaginationResult(
    rows: any[],
    totalRows: number,
    currentPage: number,
    pageSize: number,
  ): { rows: any[]; page: number; totalPages: number; totalRows: number } {
    return { rows, page: currentPage, totalPages: Math.ceil(totalRows / pageSize), totalRows };
  }
  /**
   * Returns the Zod schema description for all standard SQL payload fields.
   * Use this inside `describePayload()` implementations to expose the full
   * set of supported SQL payload options to the MCP tool layer.
   */
  protected sqlPayloadInformation(): PayloadDescription<DatabasePayloadBase> {
    return {
      sql: z.string().describe('Required SQL query to execute.'),
      params: z
        .record(z.array(z.any()))
        .optional()
        .describe(
          `Optional parameters for the SQL query for prepared statements.
This should be an array or object, depending on the database driver.
- MySQL -- uses an array for \`?\` (values) and \`??\` (columns) placeholders.
- Postgres -- uses an array for \`$1, $2, ...\` placeholders.
- SQLite -- uses an array for \`?\` placeholders.
- MSSQL -- uses an array for \`@\` placeholders.`,
        ),
      tableName: z
        .string()
        .optional()
        .describe(
          'Optional table name for the SQL query. This is used for better schema inference and is not required for query execution.',
        ),
      listTables: z
        .boolean()
        .optional()
        .describe(
          'Optional flag to list all tables in the database. If set to true, the tool will return a list of all tables without column details. This is used for better schema inference and is not required for query execution.',
        ),
      listProcedures: z
        .boolean()
        .optional()
        .describe(
          'Optional flag to list all stored procedures in the database. If set to true, the tool will return a list of all stored procedures without parameter details. This is used for better schema inference and is not required for query execution.',
        ),
      listFunctions: z
        .boolean()
        .optional()
        .describe(
          'Optional flag to list all stored functions in the database. If set to true, the tool will return a list of all stored functions without parameter details. This is used for better schema inference and is not required for query execution.',
        ),
      listViews: z.boolean().optional().describe('Optional flag to list all views in the database.'),
      listTriggers: z.boolean().optional().describe('Optional flag to list all triggers in the database.'),
      timeout: z
        .number()
        .optional()
        .describe('Optional query timeout in milliseconds. Defaults to the driver default if not set.'),
      page: z
        .number()
        .optional()
        .describe(
          'Optional 1-based page number. Use together with pageSize. When set, select returns { rows, page, totalPages, totalRows } instead of a plain array.',
        ),
      pageSize: z
        .number()
        .optional()
        .describe(
          'Optional page size for pagination. Defaults to 20 if page is set without pageSize. Use together with page. When set, select returns { rows, page, totalPages, totalRows } instead of a plain array.',
        ),
    };
  }
  /**
   * Check if the given SQL query is a mutation (INSERT, UPDATE, DELETE).
   * @param sql The SQL query to check.
   */
  isMutation() {
    const ast = this.parseQuery(this.request.payload?.sql ?? '');
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
  isSelect() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.every(node => node.type === 'select') : ast.type === 'select';
  }
  /**
   * Check if the given SQL query is an INSERT statement.
   * @param sql The SQL query to check.
   */
  isInsert() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'insert') : ast.type === 'insert';
  }
  /**
   * Check if the given SQL query is an UPDATE statement.
   * @param sql The SQL query to check.
   */
  isUpdate() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'update') : ast.type === 'update';
  }
  /**
   * Check if the given SQL query is a DELETE statement.
   * @param sql The SQL query to check.
   */
  isDelete() {
    const payload = this.getPayloadObject(this.request);
    const ast = this.parseQuery(payload?.sql ?? '');
    return Array.isArray(ast) ? ast.some(node => node.type === 'delete') : ast.type === 'delete';
  }
  /**
   * Get the types of SQL queries present in the given SQL string.
   * @param sql The SQL query to analyze.
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

/**
 * Abstract base class for NoSQL document data sources (e.g. MongoDB).
 *
 * P is the payload type; Cfg is the provider-specific connection options type.
 */
export abstract class NoSqlDataSource<P = unknown, Cfg = unknown> extends DataSource<P, Cfg> {
  abstract select(): Promise<ActionReturnType>;
  abstract mutation(): Promise<ActionReturnType>;
  abstract insert(): Promise<ActionReturnType>;
  abstract update(): Promise<ActionReturnType>;
  abstract delete(): Promise<ActionReturnType>;
  abstract showSchema(): Promise<ActionReturnType>;
}

/**
 * Abstract base class for HTTP-based data sources (REST, GraphQL, FTP, etc.).
 *
 * P defaults to `HttpPayloadBase`; Cfg is the provider-specific connection
 * options type. All query-type guards return `true` since HTTP sources are
 * not SQL and every operation is permitted by default.
 */
export abstract class HttpDataSource<P = HttpPayloadBase, Cfg = unknown> extends DataSource<P, Cfg> {
  abstract select(): Promise<ActionReturnType>;
  abstract mutation(): Promise<ActionReturnType>;
  abstract insert(): Promise<ActionReturnType>;
  abstract update(): Promise<ActionReturnType>;
  abstract delete(): Promise<ActionReturnType>;
  abstract showSchema(): Promise<ActionReturnType>;

  /**
   * Build a `PayloadDescription` for HTTP-based payloads by merging the
   * standard HTTP fields (`endpoint`, `method`, `headers`, `body`) with
   * provider-specific body fields.
   * @param types A Zod schema or a plain object of Zod field definitions
   *   describing the provider-specific body shape.
   */
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

/**
 * Abstract base class for data sources whose query semantics are unknown
 * (e.g. key-value stores, object storage). All query-type guards return
 * `false` since the source does not support typed SQL operations.
 */
export abstract class UnknownDataSource<Payload = unknown> extends DataSource<Payload> {
  abstract select(): Promise<ActionReturnType>;
  abstract mutation(): Promise<ActionReturnType>;
  abstract insert(): Promise<ActionReturnType>;
  abstract update(): Promise<ActionReturnType>;
  abstract delete(): Promise<ActionReturnType>;
  abstract showSchema(): Promise<ActionReturnType>;

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
