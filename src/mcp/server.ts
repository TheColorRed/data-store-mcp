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
import { ResponseType, SqlDataSource, type ReturnType } from './database-source.js';
import { folders, getSource, isAllowed, isAllowedError, returnText, type Folder } from './utilities/connection.js';

const extensionRoot = process.argv[3];
const workspaceFolders = JSON.parse(process.argv[2]);
const foldersIn: string[] = workspaceFolders.map((f: string) => f.replace(/\\/g, '/'));

const isWindows = os.platform() === 'win32';
const getFolders = async (): Promise<Folder[]> => {
  const files = await glob(
    foldersIn
      .map(f => [`${f}/.vscode/**/{connections,stores}.json`, `${f}/.vscode/**/*.{connection,store}.json`])
      .flat(),
  );
  return files.map((file: string) => {
    file = isWindows ? file.replace(/\//g, '\\') : file;
    return { dbFile: file, connections: [] };
  });
};

const parameterInformation = '';

const server = new McpServer({
  name: 'MCP Server: Data Store',
  version: '1.0.0',
  capabilities: { tools: {} },
});

const toolActions = {
  connectionId: z.string(),
  payload: z.record(z.any()),
  // payload: z.union([z.record(z.any()), z.string()]),
};

// This tool lists all available data source connections.
server.tool(
  'connections',
  'Lists all available data source connections and their IDs. **Always call this tool first** before any other data tool, as all other tools require a valid `connectionId`. Returns the available connections for databases (mysql, postgres, sqlite, mssql), HTTP APIs (rest, graphql), and file servers (ftp, s3). Without calling this first, you will not know which `connectionId` to use.',

  async () => {
    const connections = await Promise.all(
      (await folders(await getFolders())).map<Promise<{ id: string; type: string }>>(async folder => {
        const data = JSON.parse(await fs.readFile(folder.dbFile, 'utf-8'));
        folder.connections = data ?? [];
        return data;
      }),
    );

    // Find duplicate connection ids and throw an error.
    // The error should list the id's and what files they were found in.
    // Show the message:
    // Duplicate connection ids found:
    //   - id-1: .vscode/example.store.json
    //   - id-2: .vscode/another.store.json
    const connectionIds = new Map<string, string[]>();
    const folders2 = await folders(await getFolders());
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

    const docs = await fs.readFile(`${extensionRoot}/docs/connection.md`, 'utf-8');
    return returnText(connections, docs); //, parameterInformation);
  },
);

server.tool(
  'payload',
  'Returns the expected payload structure (as a Zod schema) for a given connection. Call this after **#connections** and before making any query, to understand how to correctly format the `payload` parameter. If a SKILL is available for this connection, **always** read the SKILL file too, as it may provide additional payload requirements and examples.',

  {
    connectionId: z.string(),
  },
  async request => {
    let payload: string | ResponseType = '';
    try {
      const { source } = await getSource(request, await getFolders(), false);
      payload = source.describePayload() as ResponseType;
      source.close();
    } catch {}
    return returnText(
      `The following "zod" is the payload information for the data source, this is how it should be structured when making a request:\n`,
      payload,
    );
  },
);

// This tool lists the schema of a specific table in the data source.
server.tool(
  'schema',
  'Returns the column/field definitions and structure of a table or collection in the data source. Use this when you need to know what fields, types, or columns exist before writing a query. Provide a `tableName` in the payload to get the schema for a specific table, or omit it to retrieve schemas for all tables/collections. Run this after **#payload** when the data structure is unknown. Note: not all data sources support schemas.',

  {
    ...toolActions,
    payload: toolActions.payload.optional(),
  },
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'schema')) throw new Error(isAllowedError('schema'));

    let result: ReturnType;
    try {
      result = await source.showSchema();
    } catch (error) {
      return returnText('Failed to get schema from data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

// This tool runs a mutation query on the data source.
// If the query is not a mutation query, it returns an error message.
server.tool(
  'mutation',
  `Executes an unrestricted, arbitrary query or command against the data source. This is a **last resort** tool — only use it when **#insert**, **#update**, or **#delete** cannot accomplish the task (e.g. DDL statements like CREATE TABLE, DROP, ALTER, or complex multi-statement operations). This tool bypasses query-type validation and can be destructive if misused. Prefer the specific tools (**#select**, **#insert**, **#update**, **#delete**) for standard CRUD operations. **Note:** This tool can still be rejected by the data source.\n${parameterInformation}`,

  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'mutation')) throw new Error(isAllowedError('mutation'));

    let result: ReturnType;
    try {
      result = await source.mutation();
    } catch (error) {
      return returnText('Failed to run mutation on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

// This tool runs a select query on the data source.
// If the query is not a select, it returns an error message.
server.tool(
  'select',
  `Retrieves and returns data from the data source without modifying it. Use this tool when you need to READ, VIEW, FETCH, GET, QUERY, SHOW, LIST, or DISPLAY data. This is the primary tool for retrieving information from the data source. Common use cases include: viewing records, getting specific data, listing entries, querying information, displaying contents, or any read-only operation. This tool does NOT modify, insert, update, or delete data.\n${parameterInformation}`,
  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'select')) throw new Error(isAllowedError('select'));

    if (source instanceof SqlDataSource && !source.isSelect())
      return returnText('The provided SQL query is not a SELECT statement.');

    let result: ReturnType;
    try {
      result = await source.select();
    } catch (error) {
      return returnText('Failed to run select on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

// This tool runs an insert query on the data source.
// If the query is not an insert, it returns an error message.
server.tool(
  'insert',
  `Creates and adds new records to the data source. Use this tool when you need to ADD, CREATE, SAVE, or INSERT new data.\n${parameterInformation}`,

  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'insert')) throw new Error(isAllowedError('insert'));

    if (source instanceof SqlDataSource && !source.isInsert())
      return returnText('The provided SQL query is not an INSERT statement.');

    let result: ReturnType;
    try {
      result = await source.insert();
    } catch (error) {
      return returnText('Failed to run insert on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

// This tool runs an update query on the data source.
// If the query is not an update, it returns an error message.
server.tool(
  'update',
  `Modifies existing records in the data source. Use this tool when you need to CHANGE, EDIT, MODIFY, or UPDATE data that already exists.\n${parameterInformation}`,

  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'update')) throw new Error(isAllowedError('update'));

    if (source instanceof SqlDataSource && !source.isUpdate())
      return returnText('The provided SQL query is not an UPDATE statement.');

    let result: ReturnType;
    try {
      result = await source.update();
    } catch (error) {
      return returnText('Failed to run update on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

// This tool runs a delete query on the data source.
// If the query is not a delete, it returns an error message.
server.tool(
  'delete',
  `Permanently removes records from the data source. Use this tool ONLY when you need to REMOVE, DESTROY, or DELETE existing data. This tool does NOT read or return data — use **#select** if you want to READ or VIEW data. This tool only accepts DELETE operations and will reject SELECT, INSERT, or UPDATE queries.\n${parameterInformation}`,

  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'delete')) throw new Error(isAllowedError('delete'));

    if (source instanceof SqlDataSource && !source.isDelete())
      return returnText('The provided SQL query is not a DELETE statement.');

    let result: ReturnType;
    try {
      result = await source.delete();
    } catch (error) {
      return returnText('Failed to run delete on data source. ' + (error as Error).message);
    }
    source.close();
    return returnText(result);
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Data Source MCP Server is running on stdio.`);
