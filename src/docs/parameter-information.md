Parameters:

1. For database data sources

- sql: The SQL query to run for SQL data sources.

2. For HTTP data sources (CRUD/GraphQL)

- endpoint: The HTTP endpoint to call.
  - Should try to use the most restrictive endpoint available.
  - Should use the "search" object from the connections tool to create \`?key=value\` query strings.
- payload: The payload to send in the request body.
  - for graphql this takes a JSON object containing \`query\` and optionally \`variables\`.
- method: The HTTP method to use (GET, POST, PUT, DELETE).
- headers: The headers to include in the request.
