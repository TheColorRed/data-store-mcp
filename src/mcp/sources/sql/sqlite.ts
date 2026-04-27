import { DatabaseSync, type DatabaseSyncOptions, type StatementResultingChanges } from 'node:sqlite';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

const SQLITE_OPEN_MODES: Record<number, DatabaseSyncOptions> = {
  0: { readOnly: true },
  1: { readOnly: false },
  2: { readOnly: false },
};

export class SQLite<P extends DatabasePayloadBase> extends SqlDataSource<P> {
  private connection?: DatabaseSync;

  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }

  async connect(): Promise<void> {
    const filename = this.connectionConfig.options.filename;
    const modeNumber = Number(this.connectionConfig.options.mode ?? 2);
    const options = SQLITE_OPEN_MODES[modeNumber] ?? SQLITE_OPEN_MODES[2];

    this.connection = new DatabaseSync(filename, {
      ...options,
      allowBareNamedParameters: true,
    });
  }

  /**
   * Prepare a statement for execution.
   * @param sql SQL string to prepare.
   */
  private getPreparedStatement(sql: string) {
    if (!this.connection) throw new Error('SQLite connection is not initialized.');
    return this.connection.prepare(sql);
  }

  /**
   * Execute a SELECT query and return all rows.
   * @param sql SQL string to execute.
   * @param params Optional bound parameters.
   */
  private all(sql: string, params?: any): any[] {
    const stmt = this.getPreparedStatement(sql);
    if (params === undefined) {
      return stmt.all();
    }
    return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
  }

  /**
   * Execute a mutation statement and return the result metadata.
   * @param sql SQL string to execute.
   * @param params Optional bound parameters.
   */
  private run(sql: string, params?: any): StatementResultingChanges {
    const stmt = this.getPreparedStatement(sql);
    if (params === undefined) {
      return stmt.run();
    }
    return Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
  }

  /**
   * Execute a statement that mutates the database.
   * @param payload action payload containing `sql`
   */
  async mutation(): Promise<any> {
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return this.run(this.payload.sql, this.payload.params);
  }

  /**
   * Run a SELECT query and return rows as an array.
   * @param payload action payload containing `sql`
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const baseSql = this.payload.sql.trimEnd().replace(/;$/, '');
    if (this.shouldPaginate(baseSql)) {
      const { pagedSql, countSql, currentPage, pageSize } = this.buildPaginationSql(baseSql);
      const rows = this.all(pagedSql, this.payload.params);
      const countRows = this.all(countSql, this.payload.params);
      const totalRows = Number((countRows as any[])[0]?.total ?? 0);
      return this.assemblePaginationResult(rows, totalRows, currentPage, pageSize);
    }
    return this.all(baseSql, this.payload.params);
  }

  /**
   * Execute an INSERT statement and return the driver result.
   * @param payload action payload containing `sql`
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return this.run(this.payload.sql, this.payload.params);
  }

  /**
   * Execute an UPDATE statement and return the driver result.
   * @param payload action payload containing `sql`
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return this.run(this.payload.sql, this.payload.params);
  }

  /**
   * Execute a DELETE statement and return the driver result.
   * @param payload action payload containing `sql`
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    return this.run(this.payload.sql, this.payload.params);
  }

  /**
   * Return the schema of the database or a specific table if `tableName` is provided in the payload.
   * @param payload action payload with optional `tableName`
   */
  async showSchema(): Promise<any> {
    const tableName = this.payload.tableName ?? '';
    const listTables = this.payload.listTables;
    const listViews = this.payload.listViews;
    const listTriggers = this.payload.listTriggers;

    if (listTables || listViews || listTriggers) {
      return {
        ...(listTables
          ? { tables: this.all(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`) }
          : {}),
        ...(listViews ? { views: this.all(`SELECT name, sql FROM sqlite_master WHERE type='view'`) } : {}),
        ...(listTriggers
          ? {
              triggers: this.all(
                `SELECT name, tbl_name AS table_name, sql FROM sqlite_master WHERE type='trigger' AND name NOT LIKE 'sqlite_%'`,
              ),
            }
          : {}),
      };
    }

    if (tableName)
      return this.all(`SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name=?`, [
        tableName,
      ]);
    return this.all(`SELECT * FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
  }

  /** Close the sqlite database handle cleanly. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      () => this.connection?.close(),
      () => this.connection?.close(),
      2000,
    );
  }
}
