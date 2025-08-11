/*
 * This file is for connecting to a Data Store using different drivers.
 * It is used for a vscode MCP Server to interact with a Data Store.
 * It establishes a connection to the data source and logs a message upon successful connection.
 * This code is not meant to be executed directly but is part of a larger application.
 * Make sure to handle sensitive information like data source credentials securely.
 * Do not expose credentials in public repositories.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import glob from 'fast-glob';
import fs from 'fs/promises';
import os from 'os';
import { z } from 'zod';
import { DatabaseSourceConfig, DataSource, SqlDataSource } from './database.js';
import { Crud, type CrudConfigOptions } from './sources/crud.js';
import { GraphQL, type GraphQLConfigOptions } from './sources/graphql.js';
import { MSSQL } from './sources/mssql.js';
import { MySQL } from './sources/mysql.js';
import { Postgres } from './sources/postgres.js';
import { SQLite } from './sources/sqlite.js';

interface Folder {
  // folder: string;
  dbFile: string;
  connections: {
    id: string;
    type: string;
    options: {
      [key: string]: any;
    };
  }[];
}

const foldersIn: string[] = JSON.parse(process.argv[2]).map((f: string) => f.replace(/\\/g, '/'));
const globs = await glob(
  foldersIn.map(f => [`${f}/.vscode/{connections,stores}.json`, `${f}/.vscode/*.{connection,store}.json`]).flat()
);

console.error('connections:', globs);

const isWindows = os.platform() === 'win32';
const foldersInit: Folder[] = globs.map((file: string) => {
  file = isWindows ? file.replace(/\//g, '\\') : file;
  return {
    dbFile: file,
    connections: [],
  };
});

const folders: Folder[] = await Promise.all(
  foldersInit.map(async (folder: Folder) => {
    try {
      const data = await fs.readFile(folder.dbFile, 'utf-8');
      folder.connections = JSON.parse(data) ?? [];
    } catch (error) {
      console.error(`Error reading file ${folder.dbFile}:`, error);
      folder.connections = [];
    }
    return folder;
  })
);

const server = new McpServer({
  name: 'Data Source MCP Server',
  version: '1.0.0',
  capabilities: {
    tools: {},
  },
});

/**
 * Checks if the given SQL query is a mutation (INSERT, UPDATE, DELETE).
 * @param sql SQL query string
 * @returns true if the SQL query is a mutation (INSERT, UPDATE, DELETE), false otherwise
 */
const returnText = (...messages: (string | boolean)[]) => ({
  content: messages.map(msg => ({
    type: 'text',
    text: typeof msg === 'boolean' ? (msg ? 'Success' : 'Failure') : msg ?? '',
  })) as { type: 'text'; text: string }[],
});

const getSource = async (
  connectionId: string
): Promise<{ source: DataSource; connection: { id: string; type: string } }> => {
  const connection = folders
    .flatMap(folder => folder.connections)
    .find(conn => conn.id === connectionId) as DatabaseSourceConfig;
  let source: DataSource;
  // prettier-ignore
  switch (connection.type) {
    case 'mysql': source = new MySQL(connection); break;
    case 'sqlite': source = new SQLite(connection); break;
    case 'postgres': source = new Postgres(connection); break;
    case 'mssql': source = new MSSQL(connection); break;
    case 'crud': source = new Crud(connection as DatabaseSourceConfig<CrudConfigOptions>); break;
    case 'graphql': source = new GraphQL(connection as DatabaseSourceConfig<GraphQLConfigOptions>); break;
    default: throw new Error(`Unsupported data source: ${connection.type}`);
  }
  if (!source) throw new Error(`Failed to create data source for connection: ${connectionId}`);
  await source.connect(connection);
  return { source, connection };
};

const toolActions = {
  connectionId: z.string(),
  // Database related options
  sql: z.string().optional(),
  // HTTP related options
  payload: z.string().optional(),
  endpoint: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
};

const parameterInformation = `Parameters:
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
`;

// This tool lists all available data source connections.
server.tool(
  'connections',
  'Lists all available data source connections. This should almost always be the first tool you call when working with a data source.',
  async () => {
    const connections = await Promise.all(
      folders.map(async folder => {
        const data = JSON.parse(await fs.readFile(folder.dbFile, 'utf-8'));
        folder.connections = data ?? [];
        return data;
      })
    );

    return returnText(
      JSON.stringify(connections),
      `
# Connections
This document will explain how the subsequent tools need to interact with data store tools so you can make as few mistakes as possible and call the tools with the correct parameters the first time without guesswork.

1. Once the appropriate connection(s) are selected, you should output the connection ID(s) to the user.
2. After running this tool, you should always understand the schema by calling the \`#schema\` tool with the appropriate parameters if you don't already have the schema information.

# Workflow
1. Use the \`#connections\` tool to list all available data source connections.
2. Use the \`#schema\` tool to get the schema of the data source.
3. Do a search on the data source to get the specific data you need, as you do not know what is contained in the data source. Do not guess on what values are needed to make the next query/queries. Either use the input provided by the user or do a lookup on the data source using one or more \`#select\` tools.
4. Use the appropriate tool to run the desired operation(s) for the users request.

## GraphQL
When executing a graphql query, you should provide a \`payload\` key containing a JSON object with a \`query\` key and optionally a \`variables\` key. When a dynamic value is provided, you MUST add it to the variables property, and not pass it directly in the query string for security reasons.

## CRUD (Http API)
When executing a CRUD operation, you should provide the following keys:
- \`endpoint\` (required): The HTTP endpoint to call. Using the \`search\` object from the connections, create a \`?key=value\` query string when necessary.
- \`payload\` (optional): The payload to send in the request body.
- \`method\` (optional): The HTTP method to use (\`GET\`, \`POST\`, \`PUT\`, \`DELETE\`). Defaults to a \`GET\` request.
- \`headers\` (optional): The headers to include in the request.

### URL Parameters
Urls sometimes have parameters in them, which can be extracted and used in the tool calls. These should be replaced by values provided by the user.

## Databases
When executing a database query using the \`select\`, \`insert\`, \`update\`, or \`delete\` tools, you need to provide an \`sql\` key containing the SQL query string.

- \`SELECT\` queries MUST be used with the \`#select\` tool.
- \`INSERT\` queries MUST be used with the \`#insert\` tool.
- \`UPDATE\` queries MUST be used with the \`#update\` tool.
- \`DELETE\` queries MUST be used with the \`#delete\` tool.
- All other queries MUST be used with the \`#mutation\` tool.

Make sure you have all the information necessary to construct the SQL query and know the schema of the database before executing any queries.
`
    );
  }
);

// This tool lists all tables in the data source.
server.tool(
  'tables',
  'Lists all tables/collections in the data source.',
  {
    connectionId: z.string(),
  },
  async actions => {
    const { source } = await getSource(actions.connectionId);
    let result;
    try {
      result = await source.listCollections(actions);
    } catch (error) {
      return returnText('Failed to list collections from data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool lists the schema of a specific table in the data source.
server.tool(
  'schema',
  'Lists the schema of a specific table/collection if `tableName` is provided. Otherwise gets the schema of all tables/collections.',
  {
    connectionId: z.string(),
    tableName: z.string().optional(),
  },
  async actions => {
    const { source } = await getSource(actions.connectionId);
    let result;
    try {
      result = await source.showSchema(actions);
    } catch (error) {
      return returnText('Failed to get schema from data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs a mutation query on the data source.
// If the query is not a mutation query, it returns an error message.
server.tool(
  'mutation',
  `Allows for the ability to run any type of query, this is un-restrictive.\n${parameterInformation}`,
  toolActions,
  async actions => {
    const { source } = await getSource(actions.connectionId);
    let result;
    try {
      result = await source.mutation(actions);
    } catch (error) {
      return returnText('Failed to run mutation on data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs a select query on the data source.
// If the query is not a select, it returns an error message.
server.tool(
  'select',
  `Runs a select query on the data source selecting data from the data source.\n${parameterInformation}`,
  toolActions,
  async actions => {
    const { source } = await getSource(actions.connectionId);
    if (source instanceof SqlDataSource && !source.isSelect({ sql: actions.sql }))
      return returnText('The provided SQL query is not a SELECT statement.');

    let result;
    try {
      result = await source.select(actions);
    } catch (error) {
      return returnText('Failed to run select on data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs an insert query on the data source.
// If the query is not an insert, it returns an error message.
server.tool(
  'insert',
  `Runs an insert query on the data source inserting data into the data source.\n${parameterInformation}`,
  toolActions,
  async actions => {
    const { source } = await getSource(actions.connectionId);
    if (source instanceof SqlDataSource && !source.isInsert({ sql: actions.sql }))
      return returnText('The provided SQL query is not an INSERT statement.');

    let result;
    try {
      result = await source.insert(actions);
    } catch (error) {
      return returnText('Failed to run insert on data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs an update query on the data source.
// If the query is not an update, it returns an error message.
server.tool(
  'update',
  `Runs an update query on the data source updating data in the data source.\n${parameterInformation}`,
  toolActions,
  async actions => {
    const { source } = await getSource(actions.connectionId);
    if (source instanceof SqlDataSource && !source.isUpdate({ sql: actions.sql }))
      return returnText('The provided SQL query is not an UPDATE statement.');

    let result;
    try {
      result = await source.update(actions);
    } catch (error) {
      return returnText('Failed to run update on data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs a delete query on the data source.
// If the query is not a delete, it returns an error message.
server.tool(
  'delete',
  `Runs a delete query on the data source deleting data from the data source.\n${parameterInformation}`,
  toolActions,
  async actions => {
    const { source } = await getSource(actions.connectionId);
    if (source instanceof SqlDataSource && !source.isDelete({ sql: actions.sql }))
      return returnText('The provided SQL query is not a DELETE statement.');

    let result;
    try {
      result = await source.delete(actions);
    } catch (error) {
      return returnText('Failed to run delete on data source. ' + (error as Error).message);
    }
    await source.close(actions);
    return returnText(JSON.stringify(result));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Data Source MCP Server is running on stdio.`);
