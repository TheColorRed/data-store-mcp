# Data Store MCP

The Data Store MCP (Model Context Protocol) is an extension for Visual Studio Code that provides a seamless integration with various data storage solutions. It allows developers to interact with databases and other data sources directly from their code editor, streamlining the development process and improving productivity.

## Example

```md
In the sqlite database, do the following:

1. Create a table `letter_word` with two columns: `letter`, `word`.
2. Insert all letters from a-z and generate a word for it.
3. Show me the content of the new table.
```

The above will run the following tools:

1. First it will run the `connections` tool to get a list of connections.
2. Then it will run the `mutation` tool to create the table.
3. Next it will run the `insert` tool to populate the table.
4. Finally it will run the `select` tool to get the content of the table.

![Example Tool Execution](./images/example-tool-execution.png)

Next it will output the content of the table:

![Example Tool Output](./images/example-tool-output.png)

We can then run additional queries to modify the data.

```md
1. Capitalize each word in the word column.
2. Show me the first 10 rows from the updated table.
```

This will then do the following:

1. Run the `update` tool to capitalize each word in the `word` column.
2. Run the `select` tool to get the first 10 rows from the updated table.

![Example Tool Update Output](./images/example-tool-update-output.png)

## Setup a Data Store

To add connections to the data store, create a file in the `.vscode` folder called `connections.json`. It is recommended to add this file to your `.gitignore` to avoid committing sensitive information.

This file contains an array of connections, each with three properties: `id`, `type`, and `options`.

| Property  | Type   | Description                                           |
| --------- | ------ | ----------------------------------------------------- |
| `id`      | string | A unique identifier for the connection.               |
| `type`    | string | The type of the data store (e.g., `mysql`, `sqlite`). |
| `options` | object | Connection options specific to the data store type.   |

- [MySQL Options](https://github.com/mysqljs/mysql?tab=readme-ov-file#connection-options)
- [Postgres Options](https://node-postgres.com/apis/client)
- [MSSQL Options](https://www.npmjs.com/package/mssql)
- Sqlite Options
  - `filename: string`, which is the path to the SQLite database file
  - Optional `mode: number`, defaults to `sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE`

```json
[
  {
    "id": "my-mysql-connection",
    "type": "mysql",
    "options": {
      "host": "localhost",
      "user": "root",
      "password": "password",
      "database": "my_db"
    }
  }
]
```

## Available Tools

### `connections`

This tool will get all the connections defined in the `connections.json` file.

### `tables`

This tool will get all the tables in the current database connection.

### `schema`

This tool will get the schema of a specific table in the current database connection.

### Executable commands

**Note:** For SQL database, queries are validated using the [node-sql-parser](https://www.npmjs.com/package/node-sql-parser) package, which may not cover all edge cases. It is recommended to setup your database user with limited permissions to prevent any accidental data modification if the agent attempts to execute a database mutation query.

#### `select`

This tool can only execute `SELECT` statements on the current database connection. This is useful for restricting the agent from executing potentially harmful queries.

**Note:** This may not catch all queries, so it is recommended to setup your database user with read-only permissions to prevent any accidental data modification if the agent attempts to execute a mutation query.

#### `insert`

This tool can execute `INSERT` statements on the current database connection.

#### `update`

This tool can execute `UPDATE` statements on the current database connection.

### `delete`

This tool can execute `DELETE` statements on the current database connection.

#### `mutation`

This tool can execute any type of query without restriction. This is useful for creating tables or other schema changes.
