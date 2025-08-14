import mysql, { type Connection, type ConnectionOptions } from 'mysql2/promise';
import { SqlDataSource, TablePayload, type ActionPayload, type DatabaseSourceConfig } from '../database.js';

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

  async connect(config: DatabaseSourceConfig): Promise<void> {
    // ensure there's a reasonable connect timeout and attach an error handler
    const opts = { ...(config.options as ConnectionOptions) } as ConnectionOptions;
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
   * @param payload an ActionPayload containing `sql` and optional `params`
   * @returns Promise resolving to the driver result (shape depends on query)
   */
  async mutation(payload: ActionPayload): Promise<any> {
    const [result] = (await this.connection?.execute(payload.sql ?? '', payload.params)) ?? [];
    return result;
  }
  /**
   * Run a SELECT query and return rows.
   *
   * This method validates the payload with `isSelect` and then runs
   * `connection.query`. The resolved value is the `rows` array returned by the
   * driver.
   *
   * @param payload an ActionPayload with `sql` (SELECT) and optional `params`
   * @throws if the provided SQL is not a SELECT statement
   * @returns Promise resolving to the rows returned by the query
   */
  async select(payload: ActionPayload): Promise<any> {
    if (!this.isSelect(payload)) throw new Error('The provided SQL query is not a SELECT statement.');
    const [rows] = (await this.connection?.query(payload.sql ?? '', payload.params)) ?? [];
    return rows;
  }
  /**
   * Execute an INSERT statement.
   *
   * Validates via `isInsert` then executes the statement. The returned value
   * is the driver result for `execute()` (contains insertId, affectedRows, etc.).
   *
   * @param payload ActionPayload with `sql` (INSERT) and optional `params`
   * @throws if the provided SQL is not an INSERT statement
   * @returns Promise resolving to the driver execute result
   */
  async insert(payload: ActionPayload): Promise<any> {
    if (!this.isInsert(payload)) throw new Error('The provided SQL query is not an INSERT statement.');
    const [result] = (await this.connection?.execute(payload.sql ?? '', payload.params)) ?? [];
    return result;
  }
  /**
   * Execute an UPDATE statement.
   *
   * Validates via `isUpdate` and returns the raw execute result (affectedRows,
   * changedRows, etc.).
   *
   * @param payload ActionPayload with `sql` (UPDATE) and optional `params`
   * @throws if the provided SQL is not an UPDATE statement
   * @returns Promise resolving to the driver execute result
   */
  async update(payload: ActionPayload): Promise<any> {
    if (!this.isUpdate(payload)) throw new Error('The provided SQL query is not an UPDATE statement.');
    const [result] = (await this.connection?.execute(payload.sql ?? '', payload.params)) ?? [];
    return result;
  }
  /**
   * Execute a DELETE statement.
   *
   * Validates via `isDelete` and returns the raw execute result.
   *
   * @param payload ActionPayload with `sql` (DELETE) and optional `params`
   * @throws if the provided SQL is not a DELETE statement
   * @returns Promise resolving to the driver execute result
   */
  async delete(payload: ActionPayload): Promise<any> {
    if (!this.isDelete(payload)) throw new Error('The provided SQL query is not a DELETE statement.');
    const [result] = (await this.connection?.execute(payload.sql ?? '', payload.params)) ?? [];
    return result;
  }
  /**
   * Inspect database schema information.
   *
   * When `payload.tableName` is provided this returns the result of
   * `SHOW CREATE TABLE <table>`. When omitted the method attempts to list all
   * tables, procedures and functions for the current database and returns an
   * array of schema objects.
   *
   * @param payload - optional ActionPayload with `tableName` to limit the result
   * @returns Promise resolving to either a single table's create statement or
   *          an array of schema objects for tables, procedures and functions
   */
  async showSchema(payload?: ActionPayload<TablePayload>): Promise<any> {
    const tableName = payload?.tableName;
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
      2000
    );
  }
}
