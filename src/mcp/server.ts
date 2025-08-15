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
import { SqlDataSource } from './database-source.js';
import { folders, getSource, isAllowed, isAllowedError, returnText, type Folder } from './utilities/connection.js';

const extensionRoot = process.argv[3];
const workspaceFolders = JSON.parse(process.argv[2]);
const foldersIn: string[] = workspaceFolders.map((f: string) => f.replace(/\\/g, '/'));
const globs = await glob(
  foldersIn.map(f => [`${f}/.vscode/{connections,stores}.json`, `${f}/.vscode/*.{connection,store}.json`]).flat()
);

console.error('extension root:', extensionRoot);
console.error('connections:', globs);

const isWindows = os.platform() === 'win32';
const foldersInit: Folder[] = globs.map((file: string) => {
  file = isWindows ? file.replace(/\//g, '\\') : file;
  return { dbFile: file, connections: [] };
});

const parameterInformation = await fs.readFile(`${extensionRoot}/docs/parameter-information.md`, 'utf-8');

const server = new McpServer({
  name: 'Data Source MCP Server',
  version: '1.0.0',
  capabilities: { tools: {} },
});

const toolActions = {
  connectionId: z.string(),
  // Database related options
  // sql: z.string().optional(),
  // HTTP related options
  // payload is either a string or object
  payload: z.union([z.record(z.any()), z.string()]).optional(),
  // endpoint: z.string().optional(),
  // method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  // headers: z.record(z.string()).optional(),
};

// This tool lists all available data source connections.
server.tool(
  'connections',
  'Lists all available data source connections. This should almost always be the first tool you call when working with a data source.',
  async () => {
    const connections = await Promise.all(
      (
        await folders(foldersInit)
      ).map<Promise<{ id: string; type: string }>>(async folder => {
        const data = JSON.parse(await fs.readFile(folder.dbFile, 'utf-8'));
        folder.connections = data ?? [];
        return data;
      })
    );

    // Find duplicate connection ids and throw an error.
    // The error should list the id's and what files they were found in.
    // Show the message:
    // Duplicate connection ids found:
    //   - id-1: .vscode/example.store.json
    //   - id-2: .vscode/another.store.json
    const connectionIds = new Map<string, string[]>();
    const folders2 = await folders(foldersInit);
    connections.forEach((conn, index) => {
      const id = Array.isArray(conn) ? conn[0].id : conn.id;
      if (!connectionIds.has(id)) connectionIds.set(id, []);
      connectionIds.get(id)!.push(folders2[index].dbFile);
    });
    const duplicates = Array.from(connectionIds.entries()).filter(([_, files]) => files.length > 1);
    if (duplicates.length > 0) {
      const errorMessage = `Duplicate connection ids found (These must be resolved):\n${duplicates
        .map(([id, files]) => `  - ${id}: ${files.join(', ')}`)
        .join('\n')}`;
      throw new Error(errorMessage);
    }

    const docs = await fs.readFile(`${extensionRoot}/docs/connections.md`, 'utf-8');
    return returnText(JSON.stringify(connections), docs);
  }
);

server.tool(
  'payload',
  'The payload for the data source. This is used to provide additional information so the source knows how to understand the payload that should be sent.',
  {
    connectionId: z.string(),
  },
  async actions => {
    const { source } = await getSource(actions.connectionId, foldersInit);
    const payload = source.describePayload();
    return returnText(parameterInformation);
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'schema')) throw new Error(isAllowedError('schema'));

    let result;
    try {
      result = await source.showSchema(actions);
    } catch (error) {
      return returnText('Failed to get schema from data source. ' + (error as Error).message);
    }
    source.close();
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'mutation')) throw new Error(isAllowedError('mutation'));

    let result;
    try {
      result = await source.mutation(actions);
    } catch (error) {
      return returnText('Failed to run mutation on data source. ' + (error as Error).message);
    }
    source.close();
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'select')) throw new Error(isAllowedError('select'));

    if (source instanceof SqlDataSource && !source.isSelect(actions))
      return returnText('The provided SQL query is not a SELECT statement.');

    let result;
    try {
      result = await source.select(actions);
    } catch (error) {
      return returnText('Failed to run select on data source. ' + (error as Error).message);
    }
    source.close();
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'insert')) throw new Error(isAllowedError('insert'));

    if (source instanceof SqlDataSource && !source.isInsert(actions))
      return returnText('The provided SQL query is not an INSERT statement.');

    let result;
    try {
      result = await source.insert(actions);
    } catch (error) {
      return returnText('Failed to run insert on data source. ' + (error as Error).message);
    }
    source.close();
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'update')) throw new Error(isAllowedError('update'));

    if (source instanceof SqlDataSource && !source.isUpdate(actions))
      return returnText('The provided SQL query is not an UPDATE statement.');

    let result;
    try {
      result = await source.update(actions);
    } catch (error) {
      return returnText('Failed to run update on data source. ' + (error as Error).message);
    }
    source.close();
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
    const { source } = await getSource(actions.connectionId, foldersInit);

    if (!isAllowed(source.connectionConfig, 'delete')) throw new Error(isAllowedError('delete'));

    if (source instanceof SqlDataSource && !source.isDelete(actions))
      return returnText('The provided SQL query is not a DELETE statement.');

    let result;
    try {
      result = await source.delete(actions);
    } catch (error) {
      return returnText('Failed to run delete on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(JSON.stringify(result));
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Data Source MCP Server is running on stdio.`);
