import { Client } from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import Stream from 'stream';
import z from 'zod';
import { DataSource, PayloadDescription, ReturnType } from '../../database-source.js';

export interface FTPPayload {
  method: 'GET' | 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  path?: string;
  destinationPath?: string;
  sourceType?: 'path' | 'raw';
  sourceValue?: string;
  maxResults?: number;
  onlyDirectories?: boolean;
}

export interface FTPConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  /**
   * If true, use explicit FTPS (AUTH TLS). If set to "implicit", use implicit FTPS.
   * See `basic-ftp` `access` options for details.
   */
  secure?: boolean | 'implicit';
  /**
   * Optional TLS options passed through to the underlying tls.connect.
   */
  secureOptions?: Record<string, unknown>;
}

export class FTP<P extends FTPPayload> extends DataSource<P, FTPConfig> {
  private client!: Client;
  /**
   * Change the current working directory on the FTP server.
   * @param newPath The new path to change to. If not provided, it will use the `path` provided in the payload.
   */
  #cd(newPath?: string) {
    const target = (newPath ?? this.payload.path) as string | undefined;
    if (typeof target !== 'undefined') {
      // Ensure we're using POSIX-style paths for the remote server and handle
      // backslashes coming from Windows paths.
      const remote = String(target).replace(/\\/g, '/');
      const parsedPath = path.posix.parse(remote);
      // If there's a directory component, change into it. If it's empty, no-op.
      if (parsedPath.dir && parsedPath.dir !== '') return this.client.cd(parsedPath.dir);
      if (parsedPath.root && parsedPath.root !== '') return this.client.cd(parsedPath.root);
    }
    return Promise.resolve();
  }

  // Download a remote file into memory and return a Buffer.
  async #downloadToBuffer(remotePath: string): Promise<Buffer> {
    const chunks: Buffer[] = [];
    const pass = new Stream.PassThrough();

    pass.on('data', (chunk: Buffer) => {
      // Ensure chunk is a Buffer
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    // basic-ftp will write file data into the provided stream
    await this.client.downloadTo(pass, remotePath);

    return Buffer.concat(chunks);
  }
  async connect(): Promise<void> {
    this.client = new Client();
    try {
      await this.client.access({
        host: this.connectionConfig.options.host,
        port: this.connectionConfig.options.port,
        user: this.connectionConfig.options.user,
        password: this.connectionConfig.options.password,
        // forward optional secure settings so AUTH TLS can be used when required
        secure: this.connectionConfig.options.secure,
        secureOptions: this.connectionConfig.options.secureOptions,
      });
    } catch (error) {
      // rethrow with context
      throw new Error(`Failed to connect to FTP server: ${(error as Error).message}`);
    }
  }
  close(): Promise<void> {
    return this.safeClose(
      () => this.client.close(),
      () => this.client.close()
    );
  }
  describePayload(): PayloadDescription<FTPPayload> {
    return {
      method: z.enum(['GET', 'INSERT', 'UPDATE', 'DELETE', 'SELECT']).describe(`The method to perform on the FTP server.
        \`GET\` - Gets the objects information.
        \`SELECT\` - Selects objects from the FTP server.
        \`INSERT\` - Inserts an item onto the FTP server.
        \`UPDATE\` - Updates an item on the FTP server.
        \`DELETE\` - Deletes an item on the FTP server.`),
      path: z.string().default('/').optional().describe('The path or directory on the FTP server.'),
      destinationPath: z.string().optional().describe('The destination path of the file to upload.'),
      sourceType: z.enum(['path', 'raw']).optional().describe('The type of file that is being uploaded.'),
      sourceValue: z
        .string()
        .optional()
        .describe(
          'The value of the file that is being uploaded. When `sourceType` is `raw`, this should be a string containing the raw file contents. When `sourceType` is `path`, this should be a path to the file on the local filesystem.'
        ),
      maxResults: z
        .number()
        .default(100)
        .optional()
        .describe('The maximum number of results to return. Use `0` for no limit.'),
      onlyDirectories: z.boolean().default(false).optional().describe('Whether to only return directories.'),
    };
  }
  async select(): Promise<ReturnType> {
    // If the method is select, show the schema (list files)
    if (this.payload.method === 'SELECT') return this.showSchema();

    // If we have gotten this far, make sure the method is a "GET"
    if (this.payload.method !== 'GET') throw new Error(this.getPayloadInvalidValueError('method'));
    if (!this.payload.path) throw new Error(this.getPayloadMissingKeyError('path'));
    const results = [];

    const list = await this.client.list(this.payload.path ?? '/');

    for (const item of list) {
      // Process each item in the directory listing
      if (item.isFile) {
        const buf = await this.#downloadToBuffer(this.payload.path);
        results.push({
          ...item,
          contents: buf.toString(),
        });
      }
    }

    return results;
  }
  async insert(): Promise<ReturnType> {
    let data: string | Stream.Readable;

    if (this.payload.method !== 'INSERT') throw new Error(this.getPayloadInvalidValueError('method'));
    if (!this.payload.sourceType) throw new Error(this.getPayloadMissingKeyError('sourceType'));
    if (!this.payload.sourceValue) throw new Error(this.getPayloadMissingKeyError('sourceValue'));
    if (!this.payload.destinationPath) throw new Error(this.getPayloadMissingKeyError('destinationPath'));

    try {
      if (this.payload.sourceType === 'raw') {
        // Treat the raw value as file contents and stream it to the FTP server.
        data = Stream.Readable.from([this.payload.sourceValue ?? '']);
      } else {
        data = fs.createReadStream(this.payload.sourceValue as string);
      }

      return this.client.uploadFrom(data, String(this.payload.destinationPath));
    } catch (error) {
      throw new Error(`Failed to upload file: ${(error as Error).message}`);
    }
  }
  update(): Promise<ReturnType> {
    if (this.payload.method !== 'UPDATE') throw new Error(this.getPayloadInvalidValueError('method'));

    return this.insert();
  }
  async delete(): Promise<ReturnType> {
    if (this.payload.method !== 'DELETE') throw new Error(this.getPayloadInvalidValueError('method'));
    if (!this.payload.path) throw new Error(this.getPayloadMissingKeyError('path'));

    try {
      await this.#cd(this.payload.path);
      const basename = path.posix.basename(String(this.payload.path));
      return this.client.remove(basename);
    } catch (error) {
      throw new Error(`Failed to delete file: ${(error as Error).message}`);
    }
  }
  mutation(): Promise<ReturnType> {
    if (!this.payload.method) throw new Error(this.getPayloadMissingKeyError('method'));

    if (this.payload.method === 'SELECT') return this.select();
    if (this.payload.method === 'INSERT') return this.insert();
    if (this.payload.method === 'UPDATE') return this.update();
    if (this.payload.method === 'DELETE') return this.delete();

    throw new Error(this.getPayloadInvalidValueError('method'));
  }
  isMutation(): Promise<boolean> | boolean {
    return this.payload.method !== 'SELECT';
  }
  isSelect(): Promise<boolean> | boolean {
    return this.payload.method === 'SELECT';
  }
  isInsert(): Promise<boolean> | boolean {
    return this.payload.method === 'INSERT';
  }
  isUpdate(): Promise<boolean> | boolean {
    return this.payload.method === 'UPDATE';
  }
  isDelete(): Promise<boolean> | boolean {
    return this.payload.method === 'DELETE';
  }
  async showSchema(): Promise<ReturnType> {
    let maxResults = this.payload.maxResults ?? 100;
    if (maxResults === 0) maxResults = Infinity;
    const payloadPath = this.payload.path ?? '/';
    const onlyDirectories = this.payload.onlyDirectories ?? false;
    // Use a simple stack of paths to traverse; stop when we've collected maxResults files.
    const pathsToVisit: string[] = [payloadPath];
    const files = new Set<string>();

    try {
      while (pathsToVisit.length > 0 && files.size < maxResults) {
        const currentPath = pathsToVisit.pop()!;
        // Normalize incoming path to POSIX and use it directly with list()
        const normalizedPath = path.posix.normalize(currentPath);

        // List the explicit remote path instead of relying on changing the cwd.
        // This avoids incorrect cd() behavior (which previously used parsed.dir)
        // that could leave the client in the wrong directory and produce 550 errors.
        // Attempt to list the path. If the path is a file, some servers return a 550
        // error when attempting to list it. In that case, treat the path as a file
        // and add it to the results instead of failing the whole operation.
        let contents;
        try {
          contents = await this.client.list(normalizedPath);
        } catch (err) {
          const msg = (err as Error).message || '';
          if (/^550\b|not a directory|No such file/i.test(msg)) {
            // Treat the normalizedPath as a file entry
            files.add(normalizedPath);
            // If we've hit the limit, break out of the outer loop
            if (files.size >= maxResults) break;
            // Otherwise continue with other paths
            continue;
          }
          // Unknown error, rethrow to be handled by outer catch
          throw err;
        }

        for (const item of contents) {
          const itemPath = path.posix.join(normalizedPath, item.name);
          if (item.isDirectory) {
            // enqueue the full path for the directory so nested listings preserve the
            // remote path and returned file entries include the full path
            pathsToVisit.push(itemPath);
            if (onlyDirectories) files.add(itemPath);
          } else if (item.isFile) {
            if (!onlyDirectories) files.add(itemPath);
            if (files.size >= maxResults) break;
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to show schema: ${(error as Error).message}`);
    }

    return [...files];
  }
}
