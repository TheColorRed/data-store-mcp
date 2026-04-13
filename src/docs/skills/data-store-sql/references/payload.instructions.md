# SQL Payload

The payload for making any SQL query is a JSON object with an `sql` key containing the SQL query string, and optionally a `params` key for prepared statement parameters. The payload is passed directly to the selected data store tool as a JSON body. All three fields (`sql`, `params`, and `tableName`) belong inside the `payload` object alongside the `connectionId`.

**IMPORTANT**: Always use prepared statements with the `params` field for any dynamic values (user input, variables, search terms, etc.) to prevent SQL injection vulnerabilities. Never interpolate values directly into the SQL string.

## Prepared Statement with Parameters (Required for Dynamic Values)

Use prepared statements whenever your query includes any dynamic or variable data. The `params` array contains values in the same order as the placeholders in the SQL string. The placeholder syntax differs per provider and is described in a dedicated section below.

This example searches for a user with an "active" status and a name of "John" for the first name and starts with "D" for the last name:

```json
{
  "connectionId": "<your-connection-id>",
  "payload": {
    "sql": "SELECT * FROM users WHERE status = ? AND first_name LIKE ? AND last_name LIKE ?;",
    "params": ["active", "%John%", "%D"]
  }
}
```

## Static Queries (No Parameters)

Static queries that contain no user-supplied or variable values may omit the `params` field entirely. Use this form only when every value in the SQL string is a hardcoded literal that cannot vary based on user input.

This example retrieves a count of all users in the database:

```json
{
  "connectionId": "<your-connection-id>",
  "payload": {
    "sql": "SELECT COUNT(*) FROM users;"
  }
}
```

## Optional: Table Name for Schema Context

The `tableName` field is optional and does not affect query execution. It provides a hint to the schema tool so it can return column metadata for the referenced table. Include it whenever the query targets a single table and you want schema inference to work accurately.

```json
{
  "connectionId": "<your-connection-id>",
  "payload": {
    "sql": "SELECT * FROM users WHERE email = ?;",
    "params": ["user@example.com"],
    "tableName": "users"
  }
}
```

## Database-Specific Identifier Quoting

Each SQL provider uses a different character to quote identifiers such as table names and column names. The examples in this document omit quoting for readability, but in practice you should always quote identifiers to avoid collisions with reserved words. Refer to the provider-specific formatting instructions for the exact quoting style required by your target database.

## Database-Specific Parameter Placeholders

The placeholder syntax inside the SQL string must match the driver used by the selected provider. Mixing placeholder styles will cause the query to fail or silently bind the wrong values. Use the guide below to choose the correct format when constructing `params`.

- MySQL/MariaDB: positional placeholders like `?`
- PostgreSQL: positional placeholders like `$1`, `$2`, `$3`
- SQLite: positional placeholders like `?` (named parameters are also supported by SQLite)
- MS SQL: named placeholders like `@p1`, `@p2` when passing an array, or named keys like `@status` when passing an object

## Example Assets

Provider-specific payload templates are available in the SQL skill assets folder and include `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `mutation` examples. Each file uses the correct placeholder syntax and identifier quoting for its provider. Use these as starting templates when constructing payloads for a new operation.

- MySQL/MariaDB assets: [assets/mysql-mariadb/](../assets/mysql-mariadb/)
- MS SQL assets: [assets/mssql/](../assets/mssql/)
- PostgreSQL assets: [assets/postgres/](../assets/postgres/)
- SQLite assets: [assets/sqlite/](../assets/sqlite/)
