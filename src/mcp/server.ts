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
import fs from 'fs/promises';
import { z } from 'zod';
import { DatabaseSourceConfig, DataSource } from './database.js';
import { MSSQL } from './sources/mssql.js';
import { MySQL } from './sources/mysql.js';
import { Postgres } from './sources/postsgres.js';
import { SQLite } from './sources/sqlite.js';

interface Folder {
  folder: string;
  dbFile: string;
  connections: {
    id: string;
    type: string;
    options: {
      [key: string]: any;
    };
  }[];
}

const foldersInit: Folder[] = JSON.parse(process.argv[2]).map((folder: string) => ({
  folder,
  dbFile: `${folder}/.vscode/connections.json`,
  connections: [],
}));
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
const returnText = (message?: string | boolean) =>
  ({
    content: [
      {
        type: 'text',
        text: typeof message === 'boolean' ? (message ? 'Success' : 'Failure') : message ?? '',
      },
    ],
  } as { content: { type: 'text'; text: string }[] });

const getSource = async (
  connectionId: string
): Promise<{ source: DataSource; connection: { id: string; type: string } }> => {
  const connection = folders
    .flatMap(folder => folder.connections)
    .find(conn => conn.id === connectionId) as DatabaseSourceConfig;
  let source: DataSource;
  // prettier-ignore
  switch (connection.type) {
    case 'mysql': source = new MySQL(); break;
    case 'sqlite': source = new SQLite(); break;
    case 'postgres': source = new Postgres(); break;
    case 'mssql': source = new MSSQL(); break;
    default: throw new Error(`Unsupported data source: ${connection.type}`);
  }
  if (!source) throw new Error(`Failed to create data source for connection: ${connectionId}`);
  await source.connect(connection);
  return { source, connection };
};

// This tool lists all available data source connections.
server.tool('connections', 'Lists all available data source connections.', async () => {
  const connections = await Promise.all(
    folders.map(async folder => {
      const data = JSON.parse(await fs.readFile(folder.dbFile, 'utf-8'));
      folder.connections = data ?? [];
      return data;
    })
  );

  return returnText(JSON.stringify(connections));
});

// This tool lists all tables in the data source.
server.tool(
  'tables',
  'Lists all tables in the data source.',
  {
    connectionId: z.string(),
  },
  async ({ connectionId }) => {
    const { source } = await getSource(connectionId);
    const rows = await source.listCollections();
    await source.close();

    return returnText(JSON.stringify(rows));
  }
);

// This tool lists the schema of a specific table in the data source.
server.tool(
  'schema',
  'Lists the schema of a specific table in the data source.',
  {
    connectionId: z.string(),
    tableName: z.string(),
  },
  async ({ connectionId, tableName }) => {
    const { source } = await getSource(connectionId);
    const rows = await source.showCollectionSchema(tableName);
    await source.close();

    return returnText(JSON.stringify(rows));
  }
);

// This tool runs a mutation query on the data source.
// If the query is not a mutation query, it returns an error message.
server.tool(
  'mutation',
  'Allows for the ability to run any type of query, this is un-restrictive.',
  {
    connectionId: z.string(),
    sql: z.string(),
    params: z.array(z.string()).optional(),
  },
  async ({ sql, params, connectionId }) => {
    const { source } = await getSource(connectionId);
    const result = await source.mutation(sql, params);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs a select query on the data source.
// If the query is not a select, it returns an error message.
server.tool(
  'select',
  'Runs a select query on the data source selecting data from the data source.',
  {
    connectionId: z.string(),
    sql: z.string(),
    params: z.array(z.string()).optional(),
  },
  async ({ sql, params, connectionId }) => {
    const { source } = await getSource(connectionId);
    if (!source.isSelect(sql)) return returnText('The provided SQL query is not a SELECT statement.');

    const result = await source.select(sql, params);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs an insert query on the data source.
// If the query is not an insert, it returns an error message.
server.tool(
  'insert',
  'Runs an insert query on the data source inserting data into the data source.',
  {
    connectionId: z.string(),
    sql: z.string(),
    params: z.array(z.string()).optional(),
  },
  async ({ sql, connectionId, params }) => {
    const { source } = await getSource(connectionId);
    if (!source.isInsert(sql)) return returnText('The provided SQL query is not an INSERT statement.');

    const result = await source.insert(sql, params);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs an update query on the data source.
// If the query is not an update, it returns an error message.
server.tool(
  'update',
  'Runs an update query on the data source updating data in the data source.',
  {
    connectionId: z.string(),
    sql: z.string(),
    params: z.array(z.string()).optional(),
  },
  async ({ sql, connectionId, params }) => {
    const { source } = await getSource(connectionId);
    if (!source.isUpdate(sql)) return returnText('The provided SQL query is not an UPDATE statement.');

    const result = await source.update(sql, params);
    return returnText(JSON.stringify(result));
  }
);

// This tool runs a delete query on the data source.
// If the query is not a delete, it returns an error message.
server.tool(
  'delete',
  'Runs a delete query on the data source deleting data from the data source.',
  {
    connectionId: z.string(),
    sql: z.string(),
    params: z.array(z.string()).optional(),
  },
  async ({ sql, connectionId, params }) => {
    const { source } = await getSource(connectionId);
    if (!source.isDelete(sql)) return returnText('The provided SQL query is not a DELETE statement.');

    const result = await source.delete(sql, params);
    return returnText(JSON.stringify(result));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Data Source MCP Server is running on stdio.`);
