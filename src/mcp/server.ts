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
import { SqlDataSource, type ActionReturnType } from './database-source.js';
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

const server = new McpServer({
  name: 'MCP Server: Data Store',
  version: '1.0.0',
  capabilities: { tools: {} },
});

const payloadSchema = z.record(z.any());

const executionToolActions = {
  connectionId: z.string().describe('ID of the connection to use, obtained from the connections tool.'),
  payload: payloadSchema
    .optional()
    .describe(
      'An object payload containing the data to be processed. Each data store may have different requirements for the shape of this payload. Use the #payload tool to understand the expected structure for the specific connection you are targeting.',
    ),
};

const schemaToolActions = {
  connectionId: z.string().describe('ID of the connection to use, obtained from the connections tool.'),
  payload: payloadSchema.optional().describe('An object payload containing the data to be processed.'),
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

const normalizePayloadRequest = <T extends { payload?: unknown }>(
  request: T,
): T & { payload: Record<string, unknown> } => {
  const payload =
    request.payload && typeof request.payload === 'object' && !Array.isArray(request.payload)
      ? { ...(request.payload as Record<string, unknown>) }
      : {};

  return { ...request, payload };
};

// This tool lists all available data source connections.
server.tool(
  'connections',
  'List available connection IDs and types. Use when connectionId is unknown, invalid, or stale. Reuse known connectionId for follow-up calls. Optional typeFilter narrows results by provider type.',
  {
    typeFilter: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .describe(
        'Optional filter to return only connections of a specific type (e.g., "mysql", "rest", "ftp"). If omitted, returns all connections.',
      ),
  },
  async request => {
    const connections = await Promise.all(
      (await folders(await getFolders())).map<
        Promise<{ id: string; type: string; description?: string; metadata?: any; options?: any }>
      >(async folder => {
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

    const filtered = connections.filter(conn => {
      if (!conn) return false;
      if (!request.typeFilter) return true;
      const types = Array.isArray(request.typeFilter) ? request.typeFilter : [request.typeFilter];
      return types.includes(conn.type);
    });

    const returnData = filtered.map(conn => ({
      id: conn.id,
      type: conn.type,
      description: conn.description,
      ...(conn.metadata ? { metadata: conn.metadata } : {}),
      ...(['rest', 'graphql'].includes(conn.type) ? { url: conn.options } : {}),
    }));

    return returnText(returnData);
  },
);

server.tool(
  'payload',
  'Returns the expected payload structure (as a Zod schema) for a given connection. Call this only when payload shape is unknown, provider context changed, or validation indicates payload assumptions are stale. Reuse known payload shape for repeated operations against the same provider and pattern. **Do not call this repeatedly if you simply made a mistake and are switching execution tools (e.g., from mutation to select).** Do not call this repeatedly with the same inputs in the same turn. After a successful payload lookup, proceed to the execution tool rather than repeating discovery. If a SKILL is available for this connection, read the SKILL file for additional payload requirements and examples.',
  {
    connectionId: z.string().describe('ID of the connection to use, obtained from the connections tool.'),
  },
  async request => {
    let payload: unknown = '';
    try {
      const { source } = await getSource(request, await getFolders(), false);
      payload = source.describePayload();
      source.close();
    } catch {}
    return returnText(toAgentPayloadSchema(payload));
  },
);

// This tool lists the schema of a specific table in the data source.
server.tool(
  'schema',
  'Get schema metadata for tables, collections, or keys. Use only when structure is unknown or stale. Pass tableName inside payload when needed.',

  schemaToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
  'Execute unrestricted commands as a last resort, such as DDL or procedure calls. Do not use for read queries; use select instead. Use payload.sql and payload.params.',

  executionToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
  'Run read-only queries and return results. Use for fetch, list, and search operations. Use payload.sql and payload.params.',
  executionToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
  'Create new records. Use payload.sql and payload.params.',

  executionToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
  'Modify existing records. Use payload.sql and payload.params.',

  executionToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
  'Delete existing records. Use only for delete operations; read queries must use select. Use payload.sql and payload.params.',

  executionToolActions,
  async request => {
    const normalizedRequest = normalizePayloadRequest(request);
    const { source } = await getSource(normalizedRequest as any, await getFolders());

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
