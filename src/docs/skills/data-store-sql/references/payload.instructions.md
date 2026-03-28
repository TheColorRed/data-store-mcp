# SQL Payload

The payload for making any SQL query is pretty simple, just pass a JSON object with an `sql` key and the value being the SQL query you want to execute as a string. For example:

```json
{
  "connectionId": "<your-connection-id>",
  "payload": {
    "sql": "SELECT * FROM `users` WHERE `id` = 1;"
  }
}
```
