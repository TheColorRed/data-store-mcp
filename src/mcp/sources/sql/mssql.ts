import sql, { type ConnectionPool, type config as MSSQLConfig } from 'mssql';
import { SqlDataSource, type DatabasePayloadBase, type PayloadDescription } from '../../database-source.js';

/**
 * Microsoft SQL Server (mssql) data source implementation.
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config database configuration passed from the connection layer
   */
export class MSSQL<P extends DatabasePayloadBase> extends SqlDataSource<P> {
  /** Active connection pool instance */
  private connection!: ConnectionPool;
  private createRequest() {
    const request = this.connection.request();
    const params = this.payload.params as any[] | Record<string, any> | undefined;
    if (!params) return request;

    if (Array.isArray(params)) {
      params.forEach((value, index) => {
        request.input(`p${index + 1}`, value);
      });
      return request;
    }

    Object.entries(params).forEach(([key, value]) => {
      request.input(key, value);
    });

    return request;
  }
  describePayload(): PayloadDescription<DatabasePayloadBase> {
    return this.sqlPayloadInformation();
  }
  /**
   * Establish a connection pool to the target MSSQL server.
   * @param config - database configuration passed from the connection layer
   */
  async connect(): Promise<void> {
    this.connection = await sql.connect(this.connectionConfig.options as unknown as MSSQLConfig);
  }
  /**
   * Execute a raw SQL mutation and return the recordset.
   */
  async mutation(): Promise<any> {
    const sqlRequest = this.createRequest();
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  protected override buildPaginationSql(baseSql: string): {
    pagedSql: string;
    countSql: string;
    currentPage: number;
    pageSize: number;
  } {
    const payload = this.payload as DatabasePayloadBase;
    const size = typeof payload.pageSize === 'number' ? Math.max(1, Math.trunc(Math.abs(payload.pageSize))) : 20;
    const currentPage = typeof payload.page === 'number' ? Math.max(1, Math.trunc(Math.abs(payload.page))) : 1;
    const rowOffset = (currentPage - 1) * size;
    return {
      pagedSql: `${baseSql} ORDER BY (SELECT NULL) OFFSET ${rowOffset} ROWS FETCH NEXT ${size} ROWS ONLY`,
      countSql: `SELECT COUNT(*) AS total FROM (${baseSql}) AS _pagination_count`,
      currentPage,
      pageSize: size,
    };
  }
  /**
   * Run a SELECT query and return rows.
   */
  async select(): Promise<any> {
    if (!this.isSelect()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const baseSql = this.payload.sql.trimEnd().replace(/;$/, '');
    if (this.shouldPaginate(baseSql)) {
      const { pagedSql, countSql, currentPage, pageSize } = this.buildPaginationSql(baseSql);
      const [pagedResult, countResult] = await Promise.all([
        this.connection.request().query(pagedSql),
        this.connection.request().query(countSql),
      ]);
      const totalRows = Number(countResult.recordset[0]?.total ?? 0);
      return this.assemblePaginationResult(pagedResult.recordset, totalRows, currentPage, pageSize);
    }
    const sqlRequest = this.createRequest();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute an INSERT statement and return the resulting recordset.
   */
  async insert(): Promise<any> {
    if (!this.isInsert()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.createRequest();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute an UPDATE statement and return the resulting recordset.
   */
  async update(): Promise<any> {
    if (!this.isUpdate()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.createRequest();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Execute a DELETE statement and return the resulting recordset.
   */
  async delete(): Promise<any> {
    if (!this.isDelete()) throw new Error(this.getPayloadInvalidValueError('sql'));
    if (!this.payload.sql) throw new Error(this.getPayloadMissingKeyError('sql'));
    const sqlRequest = this.createRequest();
    const result = await sqlRequest.query(this.payload.sql);
    return result.recordset;
  }
  /**
   * Return column information for a table using INFORMATION_SCHEMA.
   */
  async showSchema(): Promise<any> {
    const listTables = this.payload.listTables;
    const listProcedures = this.payload.listProcedures;
    const listFunctions = this.payload.listFunctions;
    const listViews = this.payload.listViews;
    const listTriggers = this.payload.listTriggers;

    if (listTables || listProcedures || listFunctions || listViews || listTriggers) {
      const result = await Promise.all([
        listTables &&
          this.connection.query(
            `SELECT t.TABLE_SCHEMA, t.TABLE_NAME, ep.value AS table_comment FROM INFORMATION_SCHEMA.TABLES t JOIN sys.objects o ON o.object_id = OBJECT_ID(t.TABLE_SCHEMA + '.' + t.TABLE_NAME) AND o.is_ms_shipped = 0 LEFT JOIN sys.extended_properties ep ON ep.major_id = o.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' WHERE t.TABLE_TYPE = 'BASE TABLE' AND t.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`,
          ),
        listProcedures &&
          this.connection.query(
            `SELECT r.ROUTINE_SCHEMA, r.ROUTINE_NAME, ep.value AS routine_comment FROM INFORMATION_SCHEMA.ROUTINES r JOIN sys.objects o ON o.object_id = OBJECT_ID(r.ROUTINE_SCHEMA + '.' + r.ROUTINE_NAME) AND o.is_ms_shipped = 0 LEFT JOIN sys.extended_properties ep ON ep.major_id = o.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' WHERE r.ROUTINE_TYPE = 'PROCEDURE' AND r.ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`,
          ),
        listFunctions &&
          this.connection.query(
            `SELECT r.ROUTINE_SCHEMA, r.ROUTINE_NAME, ep.value AS routine_comment FROM INFORMATION_SCHEMA.ROUTINES r JOIN sys.objects o ON o.object_id = OBJECT_ID(r.ROUTINE_SCHEMA + '.' + r.ROUTINE_NAME) AND o.is_ms_shipped = 0 LEFT JOIN sys.extended_properties ep ON ep.major_id = o.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' WHERE r.ROUTINE_TYPE = 'FUNCTION' AND r.ROUTINE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`,
          ),
        listViews &&
          this.connection.query(
            `SELECT v.TABLE_SCHEMA, v.TABLE_NAME, ep.value AS view_comment, v.IS_UPDATABLE FROM INFORMATION_SCHEMA.VIEWS v JOIN sys.objects o ON o.object_id = OBJECT_ID(v.TABLE_SCHEMA + '.' + v.TABLE_NAME) AND o.is_ms_shipped = 0 LEFT JOIN sys.extended_properties ep ON ep.major_id = o.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' WHERE v.TABLE_SCHEMA NOT IN ('sys', 'INFORMATION_SCHEMA')`,
          ),
        listTriggers &&
          this.connection.query(
            `SELECT t.name AS trigger_name, OBJECT_SCHEMA_NAME(t.parent_id) AS table_schema, OBJECT_NAME(t.parent_id) AS table_name, ep.value AS trigger_comment FROM sys.triggers t JOIN sys.objects o ON o.object_id = t.object_id AND o.is_ms_shipped = 0 LEFT JOIN sys.extended_properties ep ON ep.major_id = t.object_id AND ep.minor_id = 0 AND ep.name = 'MS_Description' WHERE t.parent_class = 1`,
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
        res => res.recordset,
      );
    }

    const result = await this.connection
      .request()
      .input('table', sql.VarChar, this.payload.tableName ?? '')
      .query(`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @table`);
    return result.recordset;
  }
  /** Close the connection pool gracefully. */
  async close(): Promise<void> {
    if (!this.connection) return;
    await this.safeClose(
      async () => await this.connection.close(),
      () => (this.connection as any).close?.(),
      2000,
    );
  }
}
