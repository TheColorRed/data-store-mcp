# SQL Mutation Tool

The SQL Mutation tool allows you to perform operations that are not `SELECT`, `INSERT`, `UPDATE`, or `DELETE` on your connected SQL databases. It should only be used for anything that is not an `INSERT`, `UPDATE`, or `DELETE` statement, such as `CALL`, `EXECUTE`, `CREATE`, `ALTER`, `DROP`, etc, or queries that combine both read and write operations such as `INSERT INTO ... SELECT`, `UPDATE ... (SELECT ...)`.

> ✅ **Stored procedure calls (`CALL my_proc()`) MUST use this tool.** Do not send `CALL` statements to `select` — they will always fail validation because `CALL` is not a `SELECT` statement.

## Mutation Tool Payload

The payload for the `mutation` tool supports the following parameters:

- `sql`: The SQL query string to execute. This **MUST NOT** be a `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statement. The tool will validate that the query does not start with "SELECT", "INSERT", "UPDATE", or "DELETE" (case-insensitive) and will reject any queries that do not meet this requirement.
- `params`: An optional object containing parameter values for prepared statements. This allows you to use parameterized queries for improved security and performance. The keys in this object should correspond to the parameter placeholders used in the `sql` string.
- `timeout`: An optional query timeout in milliseconds. If not provided, the tool will use the driver's default timeout.

## Restrictions

Do not use this tool for metadata lookups such as `SHOW TABLES`, `SHOW CREATE TABLE`, `DESCRIBE`, `EXPLAIN`, `PRAGMA`, or metadata-catalog exploration. Use the `schema` tool for those operations instead.

## Provider-Specific Payload Assets

You **MUST** use the #tool:read/readFile on the linked path to view the provider-specific example before generating a mutation payload to ensure the query matches the target database dialect.

### MySQL and MariaDB

- [MySQL/MariaDB mutation payload](../../assets/mysql-mariadb/mutation.json)

### MS SQL

- [MS SQL mutation payload](../../assets/mssql/mutation.json)

### PostgreSQL

- [PostgreSQL mutation payload](../../assets/postgres/mutation.json)

### SQLite

- [SQLite mutation payload](../../assets/sqlite/mutation.json)
