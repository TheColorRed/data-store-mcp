# SQL Payload

The payload for making any SQL query is a JSON object with an `sql` key containing the SQL query string, and optionally a `params` key for prepared statement parameters.

**IMPORTANT**: Always use prepared statements with the `params` field for any dynamic values (user input, variables, search terms, etc.) to prevent SQL injection vulnerabilities. Never interpolate values directly into the SQL string.

## Prepared Statement with Parameters (Required for Dynamic Values)

Use prepared statements whenever your query includes any dynamic or variable data:

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

Only for completely static queries with no dynamic values, you may omit the `params` field:

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

Different SQL databases use different quote styles for identifiers. For detailed formatting guidance including identifier quoting, reserved word handling, and best practices, refer to the database-specific formatting instructions. **Note:** The above examples do not include quoted identifiers for simplicity, but in practice you should always quote identifiers to avoid reserved word conflicts and ensure query success.
