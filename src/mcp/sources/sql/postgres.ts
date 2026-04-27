import { Client, type ClientConfig } from 'pg';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Postgres data source implementation using `pg`.
 *
 * Provides basic SQL execution methods and a helper to inspect table schema
 * and indexes via information_schema and pg_indexes.
 */
export class Postgres extends SqlDataSource {
  /** The active PG client instance (not connected until connect() is called) */
  private connection!: Client;
  private runQuery(sql: string) {
    const params = this.payload.params;
    if (Array.isArray(params)) return this.connection.query(sql, params);
    return this.connection.query(sql);
  }
  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }
  /** Store client configuration and prepare a Client instance.
   * @param config connection configuration containing ClientConfig in options
   */
  async connect(): Promise<void> {
    this.connection = new Client(this.connectionConfig.options as ClientConfig);
    try {
      await this.connection.connect();
    } catch (error) {
      throw error;
    }
  }
  /**
   * Execute an arbitrary SQL statement and return the driver result.
   */
  async mutation(): Promise<any> {
    try {
      if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
      const result = await this.runQuery(this.payload.sql);
      console.error('mutation success');
      return result;
    } catch (error) {
      throw new Error((error as Error).message);
    }
  }
  /**
   * Run a SELECT query and return the driver result.
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const baseSql = this.payload.sql.trimEnd().replace(/;$/, '');
    if (this.shouldPaginate(baseSql)) {
      const { pagedSql, countSql, currentPage, pageSize } = this.buildPaginationSql(baseSql);
      const [pagedResult, countResult] = await Promise.all([this.runQuery(pagedSql), this.runQuery(countSql)]);
      const totalRows = Number(countResult.rows[0]?.total ?? 0);
      return this.assemblePaginationResult(pagedResult.rows, totalRows, currentPage, pageSize);
    }
    const result = await this.runQuery(baseSql);
    return result.rows;
  }
  /**
   * Execute an INSERT statement.
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.runQuery(this.payload.sql);
    return result;
  }
  /**
   * Execute an UPDATE statement.
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.runQuery(this.payload.sql);
    return result;
  }
  /**
   * Execute a DELETE statement.
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await this.runQuery(this.payload.sql);
    return result;
  }
  /**
   * Return column and index information for a given table.
   */
  async showSchema(): Promise<any> {
    const tableName = this.payload.tableName ?? '';
    const listTables = this.payload.listTables;
    const listProcedures = this.payload.listProcedures;
    const listFunctions = this.payload.listFunctions;
    const listViews = this.payload.listViews;
    const listTriggers = this.payload.listTriggers;

    if (listTables || listProcedures || listFunctions || listViews || listTriggers) {
      const result = await Promise.all([
        listTables &&
          this.connection.query(
            `SELECT t.table_schema, t.table_name, obj_description(c.oid, 'pg_class') AS table_comment FROM information_schema.tables t JOIN pg_class c ON c.relname = t.table_name JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema WHERE t.table_type = 'BASE TABLE' AND t.table_schema NOT IN ('pg_catalog', 'information_schema') AND t.table_schema NOT LIKE 'pg_toast%'`,
          ),
        listProcedures &&
          this.connection.query(
            `SELECT r.routine_schema, r.routine_name, obj_description(p.oid, 'pg_proc') AS routine_comment FROM information_schema.routines r JOIN pg_proc p ON p.proname = r.routine_name JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = r.routine_schema WHERE r.routine_type = 'PROCEDURE' AND r.routine_schema NOT IN ('pg_catalog', 'information_schema')`,
          ),
        listFunctions &&
          this.connection.query(
            `SELECT r.routine_schema, r.routine_name, obj_description(p.oid, 'pg_proc') AS routine_comment FROM information_schema.routines r JOIN pg_proc p ON p.proname = r.routine_name JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = r.routine_schema WHERE r.routine_type = 'FUNCTION' AND r.routine_schema NOT IN ('pg_catalog', 'information_schema')`,
          ),
        listViews &&
          this.connection.query(
            `SELECT v.table_schema, v.table_name, obj_description(c.oid, 'pg_class') AS view_comment, v.is_updatable FROM information_schema.views v JOIN pg_class c ON c.relname = v.table_name JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.table_schema WHERE v.table_schema NOT IN ('pg_catalog', 'information_schema') AND v.table_schema NOT LIKE 'pg_toast%'`,
          ),
        listTriggers &&
          this.connection.query(
            `SELECT trigger_schema, trigger_name, event_manipulation, event_object_table, action_statement, action_timing FROM information_schema.triggers WHERE trigger_schema NOT IN ('pg_catalog', 'information_schema') AND trigger_schema NOT LIKE 'pg_toast%'`,
          ),
      ]);
      return this.buildSchemaResult(
        result,
        [
          [listTables, 'tables'],
          [listProcedures, 'procedures'],
          [listFunctions, 'functions'],
          [listViews, 'views'],
          [listTriggers, 'triggers'],
        ],
        res => res.rows,
      );
    }

    if (tableName) {
      const [columns, indexes] = await Promise.all([
        this.connection.query('SELECT * FROM information_schema.columns WHERE table_name = $1', [tableName]),
        this.connection.query('SELECT * FROM pg_indexes WHERE tablename = $1', [tableName]),
      ]);
      return { columns, indexes };
    } else {
      // get everything
      const [columns, indexes] = await Promise.all([
        this.connection.query('SELECT * FROM information_schema.columns'),
        this.connection.query('SELECT * FROM pg_indexes'),
      ]);
      return { columns, indexes };
    }
  }
  /** Close the client connection gracefully. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await this.connection.end(),
      () => (this.connection as any).destroy?.(),
      2000,
    );
  }
}
