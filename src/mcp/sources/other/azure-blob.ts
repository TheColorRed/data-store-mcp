import { DefaultAzureCredential } from '@azure/identity';
import { BlobServiceClient, BlockBlobClient, StorageSharedKeyCredential } from '@azure/storage-blob';
import fs from 'fs/promises';
import mime from 'mime-types';
import z from 'zod';
import { PayloadDescription, UnknownDataSource } from '../../database-source.js';

export interface AzureBlobPayload {
  method: 'GET' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  container?: string;
  blob?: string;
  sourceType?: 'path' | 'raw';
  sourceValue?: string;
  maxResults?: number;
}

export interface AzureBlobConfig {
  accountName?: string;
  accountKey?: string;
  connectionString?: string;
}

export class AzureBlobSource<P extends AzureBlobPayload> extends UnknownDataSource<P> {
  client?: BlobServiceClient;
  #getBlobServiceClient() {
    if (this.client) return this.client;

    const payload = this.connectionConfig.options.connection as AzureBlobConfig;
    if (payload?.connectionString) {
      this.client = BlobServiceClient.fromConnectionString(payload.connectionString);
      return this.client;
    }

    if (!payload?.accountName) {
      throw new Error('Invalid Azure Blob connection payload. Ensure accountName or connectionString is provided.');
    }

    if (payload.accountKey) {
      const credential = new StorageSharedKeyCredential(payload.accountName, payload.accountKey);
      this.client = new BlobServiceClient(`https://${payload.accountName}.blob.core.windows.net`, credential);
      return this.client;
    }

    const credential = new DefaultAzureCredential();
    this.client = new BlobServiceClient(`https://${payload.accountName}.blob.core.windows.net`, credential);
    return this.client;
  }

  #getContainer() {
    const { container } = this.payload as AzureBlobPayload;
    return container ?? (this.connectionConfig.options.container as string) ?? '';
  }

  #validatePayload() {
    const container = this.#getContainer();
    const payloadObject = this.payload as AzureBlobPayload;
    if (!container || container.length === 0) throw new Error(this.getPayloadMissingKeyError('container'));
    if (typeof payloadObject.method === 'undefined') throw new Error(this.getPayloadMissingKeyError('method'));

    if (payloadObject.method === 'INSERT' || payloadObject.method === 'UPDATE') {
      if (!payloadObject.sourceType) throw new Error(this.getPayloadMissingKeyError('sourceType'));
      if (!payloadObject.sourceValue) throw new Error(this.getPayloadMissingKeyError('sourceValue'));
    }

    return {
      ...payloadObject,
      container,
    } as AzureBlobPayload & { container: string };
  }

  describePayload(): PayloadDescription<AzureBlobPayload> {
    return {
      method: z.enum(['GET', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']).describe(`The operation to perform.
        \`GET\` - Gets the blob content and metadata.
        \`SELECT\` - Lists blobs in a container.
        \`INSERT\` - Uploads a blob into a container.
        \`UPDATE\` - Overwrites an existing blob.
        \`DELETE\` - Deletes a blob.`),
      container: z
        .string()
        .optional()
        .describe(
          'The Azure Blob container name. If not provided, the container specified in the connection configuration will be used.',
        ),
      blob: z
        .string()
        .optional()
        .describe(
          'The blob name or prefix. Required for GET, INSERT, UPDATE, and DELETE. For SELECT this can be used as a prefix to list multiple blobs.',
        ),
      sourceType: z
        .enum(['path', 'raw'])
        .optional()
        .describe('The source type of the value for INSERT or UPDATE operations.'),
      sourceValue: z
        .string()
        .optional()
        .describe(
          'The value to be inserted or updated. If `sourceType` is `path`, this should be a file path. If `raw`, this is the raw data.',
        ),
      maxResults: z
        .number()
        .min(1)
        .default(100)
        .describe('The maximum number of results to return when listing blobs.'),
    };
  }

  connect(): Promise<void> {
    this.client = this.#getBlobServiceClient();
    return Promise.resolve();
  }

  async select(): Promise<object> {
    if (!this.client) await this.connect();
    if (!this.client) throw new Error('Azure Blob client not initialized');

    const payloadObject = this.#validatePayload();
    if (payloadObject.method === 'SELECT') return this.showSchema();

    if (!payloadObject.blob) throw new Error(this.getPayloadMissingKeyError('blob'));

    const client = this.client!;
    const container = this.#getContainer();
    const containerClient = client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(payloadObject.blob);

    const downloadResponse = await blobClient.download();
    const body = await this._streamToString(downloadResponse.readableStreamBody);

    return {
      url: blobClient.url,
      body,
      contentType: downloadResponse.contentType,
      contentLength: downloadResponse.contentLength,
      lastModified: downloadResponse.lastModified,
      metadata: downloadResponse.metadata,
      blobName: payloadObject.blob,
      container,
    };
  }

  mutation(): Promise<object | boolean> {
    const payloadObject = this.#validatePayload();
    if (payloadObject.method === 'SELECT') return this.select();
    else if (payloadObject.method === 'GET') return this.select();
    else if (payloadObject.method === 'INSERT') return this.insert();
    else if (payloadObject.method === 'UPDATE') return this.update();
    else if (payloadObject.method === 'DELETE') return this.delete();

    throw new Error(
      `Unsupported method: ${payloadObject.method} expected ` + '`GET`, `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.',
    );
  }

  async insert(): Promise<object> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload();
    if (!['INSERT', 'UPDATE'].includes(payloadObject.method))
      throw new Error(this.getPayloadInvalidValueError('method'));

    if (!payloadObject.blob) throw new Error(this.getPayloadMissingKeyError('blob'));

    const client = this.client!;
    const container = this.#getContainer();
    const containerClient = client.getContainerClient(container);
    const blobClient: BlockBlobClient = containerClient.getBlockBlobClient(payloadObject.blob);

    let body: string | Buffer = payloadObject.sourceValue ?? '';
    let mimeType: string | undefined = undefined;
    if (payloadObject.sourceType === 'path') {
      body = await fs.readFile(payloadObject.sourceValue!);
      mimeType = mime.lookup(payloadObject.sourceValue!) || undefined;
    }

    const uploadBody = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;

    const result = await blobClient.uploadData(uploadBody, {
      blobHTTPHeaders: mimeType ? { blobContentType: mimeType } : undefined,
    });

    return {
      etag: result.etag,
      lastModified: result.lastModified,
      requestId: result.requestId,
      versionId: (result as any).versionId,
      blobName: payloadObject.blob,
      container: this.#getContainer(),
    };
  }

  update(): Promise<object> {
    return this.insert();
  }

  async delete(): Promise<object> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload();
    if (payloadObject.method !== 'DELETE') throw new Error(this.getPayloadInvalidValueError('method'));
    if (!payloadObject.blob) throw new Error(this.getPayloadMissingKeyError('blob'));

    const client = this.client!;
    const container = this.#getContainer();
    const containerClient = client.getContainerClient(container);
    const blobClient = containerClient.getBlobClient(payloadObject.blob);
    const result = await blobClient.deleteIfExists();
    return {
      succeeded: result.succeeded,
      errorCode: result.errorCode,
      blobName: payloadObject.blob,
      container,
    };
  }

  async showSchema(): Promise<object> {
    if (!this.client) await this.connect();
    const container = this.#getContainer();
    const payloadObject = {
      ...(this.payload as AzureBlobPayload),
      container,
    } as AzureBlobPayload & { container: string };

    const client = this.client!;
    const containerClient = client.getContainerClient(container);
    const prefix = payloadObject.blob ?? '';
    const maxResults = payloadObject.maxResults ?? 100;

    const results: Array<object> = [];
    let count = 0;
    for await (const item of containerClient.listBlobsFlat({ prefix })) {
      results.push({ name: item.name, properties: item.properties, metadata: item.metadata });
      count++;
      if (count >= maxResults) break;
    }

    return {
      container,
      prefix,
      items: results,
      count: results.length,
    };
  }

  async close(): Promise<void> {
    if (!this.client) return;
    this.client = undefined;
  }

  private async _streamToString(stream: NodeJS.ReadableStream | undefined): Promise<string | undefined> {
    if (!stream) return undefined;
    return new Promise((resolve, reject) => {
      const chunks: Array<Buffer> = [];
      stream.on('data', (data: Buffer) => chunks.push(data));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', err => reject(err));
    });
  }
}
