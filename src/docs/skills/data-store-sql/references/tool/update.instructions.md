# SQL Update Tool

The SQL Update tool allows you to perform `UPDATE` queries on your connected SQL databases. It is designed to **ONLY** execute `UPDATE` statements and will not allow any queries that read data (e.g., `SELECT`) or modify database structure (e.g., `CREATE`, `DROP`).

## SQL UPDATE Tool Payload

The payload for the `UPDATE` supports the following parameters:

- `sql`: The SQL query string to execute. This **MUST** be an `UPDATE` statement. The tool will validate that the query starts with "UPDATE" (case-insensitive) and will reject any queries that do not meet this requirement.
- `params`: An optional array containing parameter values for prepared statements. This allows you to use parameterized queries for improved security and performance. The values should correspond positionally to the `?` (or provider-equivalent) placeholders used in the `sql` string.
- `tableName`: An optional name of the table being updated. When provided, the tool may use this for additional validation or result enrichment.

## Provider-Specific Payload Assets

You **MUST** use the #tool:read/readFile on the linked path to view the provider-specific example before generating an UPDATE payload to ensure the query matches the target database dialect.

### MySQL and MariaDB

- [MySQL/MariaDB UPDATE payload](../../assets/mysql-mariadb/update.json)

### MS SQL

- [MS SQL UPDATE payload](../../assets/mssql/update.json)

### PostgreSQL

- [PostgreSQL UPDATE payload](../../assets/postgres/update.json)

### SQLite

- [SQLite UPDATE payload](../../assets/sqlite/update.json)
