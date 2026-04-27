# SQL Select Tool

The SQL Select tool allows you to perform `SELECT` queries on your connected SQL databases. It is designed to **ONLY** execute `SELECT` statements and will not allow any queries that modify data (e.g., `INSERT`, `UPDATE`, `DELETE`) or database structure (e.g., `CREATE`, `DROP`). This ensures that the tool can be safely used by agents without risking unintended changes to the database.

> ⚠️ **`CALL` statements are not `SELECT` statements.** Sending `CALL my_proc()` to this tool will always fail with a validation error. Stored procedure calls MUST use the `mutation` tool.

## SQL SELECT Tool Payload

The payload for the `SELECT` supports the following parameters:

- `sql`: The SQL query string to execute. This **MUST** be a `SELECT` statement. The tool will validate that the query starts with "SELECT" (case-insensitive) and will reject any queries that do not meet this requirement.
- `params`: An optional object containing parameter values for prepared statements. This allows you to use parameterized queries for improved security and performance. The keys in this object should correspond to the parameter placeholders used in the `sql` string.
- `page`: An optional page number for pagination. When provided, the tool will return results in a paginated format, including the current page number, total pages, and total rows.
- `pageSize`: An optional page size for pagination. This determines how many rows are returned per page when the `page` parameter is used. If not provided, a default page size of 20 will be used.

## Pagination Behavior

Select statements without any filtering or limiting conditions (e.g., no `WHERE`, `LIMIT`, or `OFFSET` clauses) will automatically trigger pagination with a default page size of 20. This is to prevent accidentally returning an overwhelming number of rows and to encourage more efficient data retrieval. When pagination is triggered, the tool will return results in the following format:

```json
{
  "rows": [
    /* array of result rows */
  ],
  "page": 1 /* current page number */,
  "totalPages": 5 /* total number of pages available */,
  "totalRows": 100 /* total number of rows matching the query */
}
```

Running the queries in parallel is feasible depending on the context. If you are not trying to find something specific and just want to explore the data, then running in parallel can be a good option. However, if you are trying to find something specific, then it is better to run sequentially and use the results of the query to decide if you want to run the next query or not.

## Provider-Specific Payload Assets

You **MUST** use the #tool:read/readFile on the linked path to view the provider-specific example before generating a SELECT payload to ensure the query matches the target database dialect.

### MySQL and MariaDB

- [MySQL/MariaDB SELECT payload](../../assets/mysql-mariadb/select.json)

### MS SQL

- [MS SQL SELECT payload](../../assets/mssql/select.json)

### PostgreSQL

- [PostgreSQL SELECT payload](../../assets/postgres/select.json)

### SQLite

- [SQLite SELECT payload](../../assets/sqlite/select.json)
