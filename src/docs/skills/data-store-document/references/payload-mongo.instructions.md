# MongoDB Payload

The payload for making any MongoDB operation is a JSON object with the following structure:

```json
{
  "method": "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "CREATE_TABLE" | "DELETE_TABLE", // Required
  "tableName": "collection_name", // needed for all mutations and queries
  "filter": { "key": "value" }, // A filter for filtering the data, required for SELECT, UPDATE, DELETE
  "value": { "key": "value" }, // The value to insert or update, required for INSERT, UPDATE. For insert this can be any array of objects.
}
```

## Insert Operations

When doing an `INSERT`, if the table/collection doesn't exist MongoDB will create the table/collection automatically, so there is no need to create the table/collection beforehand.
