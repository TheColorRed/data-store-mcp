# SQL Delete Tool

The SQL Delete tool allows you to perform `DELETE` queries on your connected SQL databases. It is designed to **ONLY** execute `DELETE` statements and will not allow any queries that read data (e.g., `SELECT`) or modify database structure (e.g., `CREATE`, `DROP`).

## SQL DELETE Tool Payload

The payload for the `DELETE` supports the following parameters:

- `sql`: The SQL query string to execute. This **MUST** be a `DELETE` statement. The tool will validate that the query starts with "DELETE" (case-insensitive) and will reject any queries that do not meet this requirement.
- `params`: An optional array containing parameter values for prepared statements. This allows you to use parameterized queries for improved security and performance. The values should correspond positionally to the `?` (or provider-equivalent) placeholders used in the `sql` string.
- `tableName`: An optional name of the table being deleted from. When provided, the tool may use this for additional validation or result enrichment.

## Provider-Specific Payload Assets

You **MUST** use the #tool:read/readFile on the linked path to view the provider-specific example before generating a DELETE payload to ensure the query matches the target database dialect.

### MySQL and MariaDB

- [MySQL/MariaDB DELETE payload](../../assets/mysql-mariadb/delete.json)

### MS SQL

- [MS SQL DELETE payload](../../assets/mssql/delete.json)

### PostgreSQL

- [PostgreSQL DELETE payload](../../assets/postgres/delete.json)

### SQLite

- [SQLite DELETE payload](../../assets/sqlite/delete.json)
