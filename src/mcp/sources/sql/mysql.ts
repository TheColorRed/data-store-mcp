import mysql, { type Connection, type ConnectionOptions } from 'mysql2/promise';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * MySQL data source implementation using `mysql2/promise`.
 *
 * This class manages a single `Connection` instance and exposes basic SQL
 * operations (select, insert, update, delete, mutation) plus a schema
 * inspection helper. Methods return raw driver results and may throw when
 * the provided SQL does not match the expected statement type.
 */
export class MySQL extends SqlDataSource {
  /** The active MySQL connection, set by `connect()` */
  private connection?: Connection;
  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }
  async connect(): Promise<void> {
    // ensure there's a reasonable connect timeout and attach an error handler
    const opts = { ...(this.connectionConfig.options as ConnectionOptions) } as ConnectionOptions;
    if (opts.connectTimeout === undefined || opts.connectTimeout === null) opts.connectTimeout = 10000; // 10s default
    this.connection = await mysql.createConnection(opts);
    // prevent uncaught exceptions from leaving sockets open
    this.connection.on('error', (err: any) => {
      console.error('MySQL connection error:', err?.message ?? err);
    });
  }
  /**
   * Execute an SQL statement.
   *
   * The payload should contain `sql` and optional `params` for prepared
   * statements. This returns the raw driver result for execute() (insert/update
   * metadata, etc.).
   *
   * @returns Promise resolving to the driver result (shape depends on query)
   */
  async mutation(): Promise<any> {
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const [result] = (await this.connection?.execute(this.payload.sql, this.payload.params)) ?? [];
    return result;
  }
  /**
   * Run a SELECT query and return rows.
   *
   * This method validates the payload with `isSelect` and then runs
   * `connection.query`. The resolved value is the `rows` array returned by the
   * driver.
   *
   * @throws if the provided SQL is not a SELECT statement
   * @returns Promise resolving to the rows returned by the query
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const baseSql = this.payload.sql.trimEnd().replace(/;$/, '');
    const { timeout, params } = this.payload;

    if (this.shouldPaginate(baseSql)) {
      const { pagedSql, countSql, currentPage, pageSize } = this.buildPaginationSql(baseSql);
      const [[rows], [countRows]] = await Promise.all([
        typeof timeout === 'number'
          ? (this.connection?.query({ sql: pagedSql, timeout }, params) ?? Promise.resolve([[]] as any))
          : (this.connection?.query(pagedSql, params) ?? Promise.resolve([[]] as any)),
        typeof timeout === 'number'
          ? (this.connection?.query({ sql: countSql, timeout }, params) ?? Promise.resolve([[]] as any))
          : (this.connection?.query(countSql, params) ?? Promise.resolve([[]] as any)),
      ]);
      const totalRows = Number((countRows as any[])[0]?.total ?? 0);
      return this.assemblePaginationResult(rows, totalRows, currentPage, pageSize);
    }

    const [rows] =
      typeof timeout === 'number'
        ? ((await this.connection?.query({ sql: baseSql, timeout }, params)) ?? [])
        : ((await this.connection?.query(baseSql, params)) ?? []);
    return rows;
  }
  /**
   * Execute an INSERT statement.
   *
   * Validates via `isInsert` then executes the statement. The returned value
   * is the driver result for `execute()` (contains insertId, affectedRows, etc.).
   *
   * @throws if the provided SQL is not an INSERT statement
   * @returns Promise resolving to the driver execute result
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const [result] = (await this.connection?.execute(this.payload.sql, this.payload.params)) ?? [];
    return result;
  }
  /**
   * Execute an UPDATE statement.
   *
   * Validates via `isUpdate` and returns the raw execute result (affectedRows,
   * changedRows, etc.).
   *
   * @throws if the provided SQL is not an UPDATE statement
   * @returns Promise resolving to the driver execute result
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const [result] = (await this.connection?.execute(this.payload.sql, this.payload.params)) ?? [];
    return result;
  }
  /**
   * Execute a DELETE statement.
   *
   * Validates via `isDelete` and returns the raw execute result.
   *
   * @throws if the provided SQL is not a DELETE statement
   * @returns Promise resolving to the driver execute result
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const [result] = (await this.connection?.execute(this.payload.sql, this.payload.params)) ?? [];
    return result;
  }
  /**
   * Inspect database schema information.
   *
   * When `this.payload.tableName` is provided this returns the result of
   * `SHOW CREATE TABLE <table>`. When omitted the method attempts to list all
   * tables, procedures and functions for the current database and returns an
   * array of schema objects.
   *
   * @param request - optional ActionPayload with `tableName` to limit the result
   * @returns Promise resolving to either a single table's create statement or
   *          an array of schema objects for tables, procedures and functions
   */
  async showSchema(): Promise<any> {
    const tableName = this.payload.tableName;
    const listTables = this.payload.listTables;
    const listProcedures = this.payload.listProcedures;
    const listFunctions = this.payload.listFunctions;
    const listViews = this.payload.listViews;
    const listTriggers = this.payload.listTriggers;

    if (listTables || listProcedures || listFunctions || listViews || listTriggers) {
      const results = await Promise.all([
        listTables &&
          this.connection?.query(`
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_COMMENT
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA NOT IN('mysql', 'sys', 'information_schema', 'performance_schema')
          `),
        listProcedures &&
          this.connection?.query(`
            SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_COMMENT
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_SCHEMA NOT IN('mysql', 'sys', 'information_schema', 'performance_schema')
          `),
        listFunctions &&
          this.connection?.query(`
            SELECT ROUTINE_SCHEMA, ROUTINE_NAME, ROUTINE_TYPE, ROUTINE_COMMENT
            FROM INFORMATION_SCHEMA.ROUTINES
            WHERE ROUTINE_TYPE = 'FUNCTION' AND ROUTINE_SCHEMA NOT IN('mysql', 'sys', 'information_schema', 'performance_schema')
          `),
        listViews &&
          this.connection?.query(`
            SELECT TABLE_SCHEMA, TABLE_NAME, VIEW_DEFINITION, CHECK_OPTION, IS_UPDATABLE
            FROM INFORMATION_SCHEMA.VIEWS
            WHERE TABLE_SCHEMA NOT IN('mysql', 'sys', 'information_schema', 'performance_schema')
          `),
        listTriggers &&
          this.connection?.query(`
            SELECT TRIGGER_SCHEMA, TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE, ACTION_STATEMENT, ACTION_TIMING
            FROM INFORMATION_SCHEMA.TRIGGERS
            WHERE TRIGGER_SCHEMA NOT IN('mysql', 'sys', 'information_schema', 'performance_schema')
          `),
      ]);
      return this.buildSchemaResult(
        results,
        [
          [listTables, 'tables'],
          [listProcedures, 'procedures'],
          [listFunctions, 'functions'],
          [listViews, 'views'],
          [listTriggers, 'triggers'],
        ],
        res => res[0],
      );
    }

    if (tableName) {
      const [rows] = (await this.connection?.query('SHOW CREATE TABLE ??', [tableName])) ?? [];
      return rows;
    }

    const [database] = (await this.connection?.query('SELECT DATABASE() AS current_db')) ?? [];
    const currentDb = (database as any).current_db ?? this.connectionConfig.options.database ?? '';
    // Get all table schemas if no table name is provided
    const [tablesResult, proceduresResult, functionsResult] = await Promise.all([
      this.connection?.query('SHOW TABLES'),
      this.connection?.query('SHOW PROCEDURE STATUS WHERE Db = ?', [currentDb]),
      this.connection?.query('SHOW FUNCTION STATUS WHERE Db = ?', [currentDb]),
    ]);
    const tables = tablesResult ? tablesResult[0] : [];
    const procedures = proceduresResult ? proceduresResult[0] : [];
    const functions = functionsResult ? functionsResult[0] : [];

    const tablePromises = (tables as any[]).map(async table => {
      const tableName = Object.values(table)[0];
      const [schema] = (await this.connection?.query('SHOW CREATE TABLE ??', [tableName])) ?? [];
      return { tableName, schema };
    });
    const procedurePromises = (procedures as any[]).map(async proc => {
      const procedureName = proc.Name;
      const [schema] = (await this.connection?.query('SHOW CREATE PROCEDURE ??', [procedureName])) ?? [];
      return { procedureName, schema };
    });
    const functionPromises = (functions as any[]).map(async func => {
      const functionName = func.Name;
      const [schema] = (await this.connection?.query('SHOW CREATE FUNCTION ??', [functionName])) ?? [];
      return { functionName, schema };
    });
    return Promise.all([...tablePromises, ...procedurePromises, ...functionPromises]);
  }
  /**
   * Close the underlying connection when present.
   *
   * Uses `safeClose` (inherited) to attempt a graceful shutdown and falls
   * back to `destroy()` if the shutdown doesn't complete in time.
   */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await this.connection?.end(),
      () => this.connection?.destroy(),
      2000,
    );
  }
}
