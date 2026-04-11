import fs from 'fs/promises';
import path from 'path';
import {
  DataSource,
  type ActionRequest,
  type DatabasePayloadBase,
  type DataSourceConfig,
  type HttpPayloadBase,
} from '../database-source.js';
import * as sources from '../sources/index.js';

/** The type of tool being used. */
export type ToolType = 'select' | 'insert' | 'update' | 'delete' | 'schema' | 'mutation' | 'connections';
/** A folder containing database connection information. */
export interface Folder {
  // folder: string;
  /** The path to the connection file. */
  dbFile: string;
  connections: {
    id: string;
    type: string;
    options: {
      [key: string]: any;
    };
  }[];
}
/**
 * Reads the connection files and returns the folder information.
 * @param foldersInit The initial folder information.
 */
export const folders = async (foldersInit: Folder[]) =>
  await Promise.all(
    foldersInit.map(async folder => {
      try {
        const data = await fs.readFile(folder.dbFile, 'utf-8');
        const parsed = JSON.parse(data);
        // Handle both array and single object formats
        folder.connections = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch (error) {
        console.error(`Error reading file ${folder.dbFile}:`, error);
        folder.connections = [];
      }
      return folder;
    }),
  );
/**
 * Factory function to create a data source from a connection ID and returns the generated connection class and connection information.
 * @param connectionId The ID of the connection.
 * @param foldersInit The initial folder information.
 * @param shouldConnect Whether to connect to the data source immediately.
 */
export const getSource = async <P = unknown>(
  request: ActionRequest<P>,
  foldersInit: Folder[],
  shouldConnect = true,
): Promise<{ source: DataSource; connection: { id: string; type: string } }> => {
  const connectionId = request.connectionId;
  const allFolders = await folders(foldersInit);

  // Find the connection and track which folder it came from
  let connection: DataSourceConfig | undefined;
  let workspaceRoot: string | undefined;

  for (const folder of allFolders) {
    const found = folder.connections.find(conn => conn.id === connectionId);
    if (found) {
      connection = found as DataSourceConfig;
      // Extract workspace root from the connection file path
      // Connection files are in .vscode/ subdirectory of workspace
      const dbFilePath = folder.dbFile;
      const vscodeIndex = dbFilePath.lastIndexOf('.vscode');
      if (vscodeIndex !== -1) {
        workspaceRoot = dbFilePath.substring(0, vscodeIndex);
      }
      break;
    }
  }

  let source: DataSource;
  if (!connection || !connection.id)
    throw new Error(`Connection id not found: "${connectionId}". Try again using a different connection`);
  // Normalize the connection to a non-generic form to avoid TS generic mismatch
  const cfgAny = connection as DataSourceConfig<any>;

  // For SQLite, resolve relative paths against workspace root
  if (cfgAny.type === 'sqlite' && workspaceRoot && cfgAny.options.filename) {
    const filename = cfgAny.options.filename as string;
    // Check if it's a relative path (not absolute and not :memory:)
    if (filename !== ':memory:' && !path.isAbsolute(filename)) {
      cfgAny.options.filename = path.resolve(workspaceRoot, filename);
    }
  }

  // prettier-ignore
  switch (cfgAny.type) {
      // SQL Data Sources
      case 'mysql': source = new sources.MySQL(cfgAny, request as ActionRequest<DatabasePayloadBase>); break;
      case 'mariadb': source = new sources.MySQL(cfgAny, request as ActionRequest<DatabasePayloadBase>); break;
      case 'sqlite': source = new sources.SQLite(cfgAny, request as ActionRequest<DatabasePayloadBase>); break;
      case 'postgres': source = new sources.Postgres(cfgAny, request as ActionRequest<DatabasePayloadBase>); break;
      case 'mssql': source = new sources.MSSQL(cfgAny, request as ActionRequest<DatabasePayloadBase>); break;
      // HTTP Data Sources
      case 'rest': source = new sources.Rest(cfgAny, request as ActionRequest<HttpPayloadBase>); break;
      case 'graphql': source = new sources.GraphQL(cfgAny, request as ActionRequest<sources.GraphQLPayload>); break;
      case 'ftp': source = new sources.FTP(cfgAny, request as ActionRequest<sources.FTPPayload>); break;
      // Document Data Sources
      case 'mongodb': source = new sources.MongoDB(cfgAny, request as ActionRequest<sources.MongoPayload>); break;
      // Key-Value Data Sources
      case 'redis': source = new sources.Redis(cfgAny, request as ActionRequest<sources.RedisPayload>); break;
      // Other Data Sources
      case 's3': source = new sources.S3Source(cfgAny, request as ActionRequest<sources.S3Payload>); break;
      case 'azure-blob': source = new sources.AzureBlobSource(cfgAny, request as ActionRequest<sources.AzureBlobPayload>); break;
      default: throw new Error(`Unsupported data type: ${connection.type}`);
    }
  if (!source) throw new Error(`Failed to create data source for connection: ${connectionId}`);
  if (shouldConnect) await source.connect();
  return { source, connection };
};
/**
 * Tools that are disallowed to run for the connection.
 * Options: 'select', 'insert', 'update', 'delete', 'schema', 'mutation'
 * @param options The options for the data source connection.
 */
export const isAllowed = (options: DataSourceConfig, action: ToolType) => {
  const disallowed = options.disallowedTools ?? [];
  return !disallowed.includes(action);
};
/**
 * Error message for disallowed actions.
 * @param action The action that is not allowed.
 */
export const isAllowedError = (action: ToolType) =>
  `Running the ${action} tool is not allowed for this connection as it is added to the 'disallowedTools' configuration file. Either remove it from the list or use a different connection.`;
/**
 * The message(s) that are send back from the MCP.
 * @param messages The messages to send back.
 */
export const returnText = (...messages: unknown[]) => ({
  content: messages.map(msg => {
    let responseText = '';
    if (typeof msg === 'object' || Array.isArray(msg)) responseText = JSON.stringify(msg);
    else if (typeof msg === 'boolean') responseText = msg ? 'Success' : 'Failure';
    else if (typeof msg === 'string') responseText = msg;
    else responseText = String(msg);
    return { type: 'text', text: responseText };
  }) as { type: 'text'; text: string }[],
});
