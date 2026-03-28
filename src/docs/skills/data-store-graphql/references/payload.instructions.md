# GraphQL Payload

The payload for making any GraphQL operation is a JSON object with the following structure:

```json
{
  "query": "query or mutation string here",
  "variables": {
    "limit": 10
  },
  "headers": {
    "Authorization": "Bearer <token>"
  }
}
```

- `query`: GraphQL query or mutation string.
- `variables`: Optional variables object for the query or mutation.
- `headers`: Optional request headers merged with connection config headers.
