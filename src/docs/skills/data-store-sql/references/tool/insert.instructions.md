# SQL Insert Tool

The SQL Insert tool allows you to perform `INSERT` queries on your connected SQL databases. It is designed to **ONLY** execute `INSERT` statements and will not allow any queries that read or modify existing data (e.g., `SELECT`, `UPDATE`, `DELETE`) or database structure (e.g., `CREATE`, `DROP`).

## SQL INSERT Tool Payload

The payload for the `INSERT` supports the following parameters:

- `sql`: The SQL query string to execute. This **MUST** be an `INSERT` statement. The tool will validate that the query starts with "INSERT" (case-insensitive) and will reject any queries that do not meet this requirement.
- `params`: An optional array containing parameter values for prepared statements. This allows you to use parameterized queries for improved security and performance. The values should correspond positionally to the `?` (or provider-equivalent) placeholders used in the `sql` string.
- `tableName`: An optional name of the table being inserted into. When provided, the tool may use this for additional validation or result enrichment.

## Provider-Specific Payload Assets

You **MUST** use the #tool:read/readFile on the linked path to view the provider-specific example before generating an INSERT payload to ensure the query matches the target database dialect.

### MySQL and MariaDB

- [MySQL/MariaDB INSERT payload](../../assets/mysql-mariadb/insert.json)

### MS SQL

- [MS SQL INSERT payload](../../assets/mssql/insert.json)

### PostgreSQL

- [PostgreSQL INSERT payload](../../assets/postgres/insert.json)

### SQLite

- [SQLite INSERT payload](../../assets/sqlite/insert.json)
