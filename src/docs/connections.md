# Connections

This document will explain how the subsequent tools need to interact with data store tools so you can make as few mistakes as possible and call the tools with the correct parameters the first time without guesswork.

1. Once the appropriate connection(s) are selected, you should output the connection ID(s) to the user.
2. After running this tool, you should always understand the schema by calling the `#schema` tool with the appropriate parameters if you don't already have the schema information.

# Workflow

1. Use the `#connections` tool to list all available data source connections.
2. Find the best connection without guessing.
3. If you have to guess, ask the user for clarification.
   1. List all of the connections that might be relevant to the user, while hiding any sensitive information.
   2. Ask the user to select the connection they want to use.
4. Use the `#schema` tool to get the schema of the data source.
5. Do a search on the data source to get the specific data you need, as you do not know what is contained in the data source. Do not guess on what values are needed to make the next query/queries. Either use the input provided by the user or do a lookup on the data source using one or more `#select` tools.
6. Use the appropriate tool to run the desired operation(s) for the users request.

## GraphQL

When executing a graphql query, you should provide a `payload` key containing a JSON object with a `query` key and optionally a `variables` key. When a dynamic value is provided, you MUST add it to the variables property, and not pass it directly in the query string for security reasons.

## CRUD (Http API)

When executing a CRUD operation, you should provide the following keys:

- `endpoint` (required): The HTTP endpoint to call. Using the `search` object from the connections, create a `?key=value` query string when necessary.
- `payload` (optional): The payload to send in the request body.
- `method` (optional): The HTTP method to use (`GET`, `POST`, `PUT`, `DELETE`). Defaults to a `GET` request.
- `headers` (optional): The headers to include in the request.

### URL Parameters

Urls sometimes have parameters in them, which can be extracted and used in the tool calls. These should be replaced by values provided by the user.

## SQL Databases

When executing a database query using the `select`, `insert`, `update`, or `delete` tools, you need to provide an `sql` key containing the SQL query string.

- `SELECT` queries MUST be used with the `#select` tool.
- `INSERT` queries MUST be used with the `#insert` tool.
- `UPDATE` queries MUST be used with the `#update` tool.
- `DELETE` queries MUST be used with the `#delete` tool.
- All other queries MUST be used with the `#mutation` tool.

Make sure you have all the information necessary to construct the SQL query and know the schema of the database before executing any queries.

## NoSQL Databases

### MongoDB

When executing a MongoDB query, you should provide a payload key containing an object with the following structure:

```json
{
  "method": "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "CREATE_TABLE" | "DELETE_TABLE", // Required
  "tableName": "collection_name", // needed for all mutations and queries
  "filter": { "key": "value" }, // A filter for filtering the data, required for SELECT, UPDATE, DELETE
  "value": { "key": "value" }, // The value to insert or update, required for INSERT, UPDATE. For insert this can be any array of objects.
}
```

#### insert

When doing an insert, if the table/collection doesn't exist mongodb will create the table/collection automatically.
