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
import { ResponseType, SqlDataSource, type ActionReturnType } from './database-source.js';
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

type AgentPayloadField = {
  type: string;
  required: boolean;
  description?: string;
  valueType?: string;
  itemType?: string;
  options?: string[];
};

const zodTypeName = (schema: any): string => schema?._def?.typeName ?? '';

const unwrapOptional = (schema: any): { schema: any; required: boolean } => {
  let current = schema;
  let required = true;

  while (zodTypeName(current) === 'ZodOptional' || zodTypeName(current) === 'ZodDefault') {
    required = false;
    current = current?._def?.innerType;
  }

  return { schema: current, required };
};

const mapZodType = (schema: any): string => {
  switch (zodTypeName(schema)) {
    case 'ZodString':
      return 'string';
    case 'ZodNumber':
      return 'number';
    case 'ZodBoolean':
      return 'boolean';
    case 'ZodArray':
      return 'array';
    case 'ZodObject':
      return 'object';
    case 'ZodRecord':
      return 'record';
    case 'ZodEnum':
      return 'enum';
    case 'ZodUnion':
      return 'union';
    case 'ZodAny':
      return 'any';
    case 'ZodUnknown':
      return 'unknown';
    case 'ZodNull':
      return 'null';
    default:
      return 'unknown';
  }
};

const toAgentPayloadSchema = (payload: unknown): Record<string, AgentPayloadField> => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return {};

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, schema]) => {
      const { schema: innerSchema, required } = unwrapOptional(schema);
      const field: AgentPayloadField = {
        type: mapZodType(innerSchema),
        required,
      };

      const description = innerSchema?._def?.description;
      if (description) field.description = description;

      if (field.type === 'record') {
        field.valueType = mapZodType(innerSchema?._def?.valueType);
      }

      if (field.type === 'array') {
        field.itemType = mapZodType(innerSchema?._def?.type);
      }

      if (field.type === 'enum') {
        const values = innerSchema?._def?.values;
        if (Array.isArray(values)) field.options = values;
      }

      if (field.type === 'union') {
        const options = innerSchema?._def?.options;
        if (Array.isArray(options)) field.options = options.map((option: any) => mapZodType(option));
      }

      return [key, field];
    }),
  );
};

// This tool lists all available data source connections.
server.tool(
  'connections',
  'Lists all available data source connections and their IDs. Call this tool only when `connectionId` is unknown, ambiguous, invalid, or stale. For a new user request, use this tool before other data-store tools unless the current request explicitly provides the exact `connectionId`. Reuse a known valid `connectionId` for subsequent operations instead of calling this tool before every query. **If you are switching to a different execution tool (e.g., changing from mutation to select), do NOT call this tool again.** After this tool identifies the target connection, move on to the execution tool unless payload or schema context is actually missing. Returns connections for databases (mysql, mariadb, postgres, sqlite, mssql), HTTP APIs (rest, graphql), and file servers (ftp, s3). This information rarely changes.',

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

    // const docs = await fs.readFile(`${extensionRoot}/docs/connection.md`, 'utf-8');
    return returnText(connections); //, parameterInformation);
  },
);

server.tool(
  'payload',
  'Returns the expected payload structure (as a Zod schema) for a given connection. Call this only when payload shape is unknown, provider context changed, or validation indicates payload assumptions are stale. Reuse known payload shape for repeated operations against the same provider and pattern. **Do not call this repeatedly if you simply made a mistake and are switching execution tools (e.g., from mutation to select).** Do not call this repeatedly with the same inputs in the same turn. After a successful payload lookup, proceed to the execution tool rather than repeating discovery. If a SKILL is available for this connection, read the SKILL file for additional payload requirements and examples.',

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
    return returnText(toAgentPayloadSchema(payload));
  },
);

// This tool lists the schema of a specific table in the data source.
server.tool(
  'schema',
  'Returns the column/field definitions and structure of a table or collection in the data source. Use this only when field/column/key structure is unknown or stale, or when a schema mismatch error suggests drift. Provide a `tableName` in the payload to get schema for a specific table, or omit it to retrieve schemas for all tables/collections. Reuse known schema context when it is still valid. Do not call this repeatedly with the same inputs in the same turn. If you already have the needed tables, columns, join path, or fields from a prior result, do not call schema again; proceed to select, insert, update, delete, or mutation. Repeating the same schema call without new inputs is a mistake. Note: not all data sources support schemas.',

  {
    ...toolActions,
    payload: toolActions.payload.optional(),
  },
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'schema')) throw new Error(isAllowedError('schema'));

    let result: ActionReturnType;
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
  `Executes an unrestricted, arbitrary query or command against the data source. This is a **last resort** tool — only use it when **#insert**, **#update**, or **#delete** cannot accomplish the task (e.g. DDL statements like CREATE TABLE, DROP, ALTER, or complex multi-statement operations). **Do not use this tool for read/list/search/filter requests**; use **#select** for all read-only retrieval. **Do not use this tool for metadata discovery commands such as SHOW TABLES, SHOW CREATE TABLE, DESCRIBE, EXPLAIN, PRAGMA, or similar schema-inspection requests**; use **#connections** to resolve the source and **#schema** for structure discovery. This tool bypasses query-type validation and can be destructive if misused. Prefer the specific tools (**#select**, **#insert**, **#update**, **#delete**) for standard CRUD operations. **Note:** This tool can still be rejected by the data source.\n${parameterInformation}`,

  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'mutation')) throw new Error(isAllowedError('mutation'));

    let result: ActionReturnType;
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
  `Retrieves and returns data from the data source without modifying it. Use this tool when you need to READ, VIEW, FETCH, GET, QUERY, SHOW, LIST, or DISPLAY data. This is the primary tool for retrieving information from the data source. Common use cases include: viewing records, getting specific data, listing entries, querying information, displaying contents, or any read-only operation. For follow-up reads in the same provider or database context, prefer this tool directly instead of repeating discovery tools unless an actual validation or schema mismatch error occurs. This tool does NOT modify, insert, update, or delete data.\n${parameterInformation}`,
  toolActions,
  async request => {
    const { source } = await getSource(request, await getFolders());

    if (!isAllowed(source.connectionConfig, 'select')) throw new Error(isAllowedError('select'));

    if (source instanceof SqlDataSource && !source.isSelect())
      return returnText('The provided SQL query is not a SELECT statement.');

    let result: ActionReturnType;
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

    let result: ActionReturnType;
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

    let result: ActionReturnType;
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

    let result: ActionReturnType;
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
