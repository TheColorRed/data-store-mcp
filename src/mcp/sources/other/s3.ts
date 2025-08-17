import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs/promises';
import z from 'zod';
import { UnknownDataSource, type PayloadDescription } from '../../database-source.js';

export interface S3Config {
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export interface S3Payload {
  method: 'GET' | 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  bucket: string;
  key?: string;
  sourceType?: 'path' | 'raw';
  sourceValue?: string;
  maxResults?: number;
}

export class S3Source<P extends S3Payload> extends UnknownDataSource<P> {
  client?: S3Client;
  #getS3Client() {
    const payload = this.connectionConfig.options.connection as S3Config;
    if (!payload.region || !payload.credentials)
      throw new Error('Invalid S3 connection payload. Ensure region and credentials are provided.');

    return new S3Client({
      region: payload.region,
      credentials: {
        accessKeyId: payload.credentials.accessKeyId,
        secretAccessKey: payload.credentials.secretAccessKey,
      },
    });
  }
  #getBucket() {
    const payloadObject = this.payload;
    return payloadObject.bucket ?? this.connectionConfig.options.bucket ?? '';
  }
  #validatePayload() {
    const bucket = this.#getBucket();
    const payloadObject = this.payload;
    if (bucket.length === 0) throw new Error(this.getPayloadMissingKeyError('bucket'));
    if (typeof payloadObject.key === 'undefined') throw new Error(this.getPayloadMissingKeyError('key'));
    if (typeof payloadObject.method === 'undefined') throw new Error(this.getPayloadMissingKeyError('method'));

    if (payloadObject.method === 'INSERT' || payloadObject.method === 'UPDATE') {
      if (!payloadObject.sourceType) throw new Error(this.getPayloadMissingKeyError('sourceType'));
      if (!payloadObject.sourceValue) throw new Error(this.getPayloadMissingKeyError('sourceValue'));
    }

    return {
      ...payloadObject,
      bucket,
    };
  }
  describePayload(): PayloadDescription<S3Payload> {
    return {
      method: z.enum(['GET', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']).describe(`The operation to perform.
        \`GET\` - Gets the objects information.
        \`SELECT\` - Selects objects from a bucket.
        \`INSERT\` - Inserts an item into a bucket.
        \`UPDATE\` - Updates an item in a bucket.
        \`DELETE\` - Deletes an item from a bucket.`),
      bucket: z.string().describe('The S3 bucket name.'),
      key: z.string().describe('The S3 object key or object prefix.'),
      sourceType: z.enum(['path', 'raw']).describe('The source type of the value for INSERT or UPDATE operations.'),
      sourceValue: z
        .string()
        .describe(
          'The value to be inserted or updated. If `sourceType` is `path`, this should be a file path. If `sourceType` is raw, this is the raw data.'
        ),
      maxResults: z.number().min(1).default(100).describe('The maximum number of results to return.'),
    };
  }
  connect(): Promise<void> {
    this.client = this.#getS3Client();
    return Promise.resolve();
  }
  async select(): Promise<object> {
    if (!this.client) await this.connect();
    if (!this.client) throw new Error('S3 client not initialized');
    const payloadObject = this.#validatePayload();

    if (payloadObject.method === 'SELECT') return this.showSchema();

    const command = new GetObjectCommand({
      Bucket: payloadObject.bucket,
      Key: payloadObject.key,
    });

    const signedUrl = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    const url = new URL(signedUrl);
    const result = await this.client.send(command);
    const body = await result?.Body?.transformToString();

    return {
      signedUrl,
      url: `${url.origin}${url.pathname}`,
      path: url.pathname,
      body,
      contentType: result?.ContentType,
      acceptRanges: result?.AcceptRanges,
      checksumSHA1: result?.ChecksumSHA1,
      checksumSHA256: result?.ChecksumSHA256,
      checksumType: result?.ChecksumType,
      contentDisposition: result?.ContentDisposition,
      contentEncoding: result?.ContentEncoding,
      contentLanguage: result?.ContentLanguage,
      contentLength: result?.ContentLength,
      eTag: result?.ETag,
      expiration: result?.Expiration,
      expiresString: result?.ExpiresString,
      lastModified: result?.LastModified,
      metadata: result?.Metadata,
      partsCount: result?.PartsCount,
      storageClass: result?.StorageClass,
      versionId: result?.VersionId,
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
      `Unsupported method: ${payloadObject.method} expected \`GET\`, \`SELECT\`, \`INSERT\`, \`UPDATE\`, or \`DELETE\`.`
    );
  }
  async insert(): Promise<object> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload();
    if (!['INSERT', 'UPDATE'].includes(payloadObject.method))
      throw new Error(this.getPayloadInvalidValueError('method'));

    let body = payloadObject.sourceValue ?? '';
    if (payloadObject.sourceType === 'path') {
      body = await fs.readFile(payloadObject.sourceValue!, 'utf-8');
    }

    const result = await this.client?.send(
      new PutObjectCommand({
        Bucket: payloadObject.bucket,
        Key: payloadObject.key,
        Body: body,
      })
    );
    return {
      eTag: result?.ETag,
      versionId: result?.VersionId,
      checksumSHA1: result?.ChecksumSHA1,
      checksumSHA256: result?.ChecksumSHA256,
      checksumType: result?.ChecksumType,
      expiration: result?.Expiration,
      size: result?.Size,
    };
  }
  update(): Promise<object> {
    return this.insert();
  }
  async delete(): Promise<object> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload();
    if (payloadObject.method !== 'DELETE') throw new Error(this.getPayloadInvalidValueError('method'));
    const result = await this.client?.send(
      new DeleteObjectCommand({
        Bucket: payloadObject.bucket,
        Key: payloadObject.key,
      })
    );
    return {
      deleteMarker: result?.DeleteMarker,
      versionId: result?.VersionId,
    };
  }
  async showSchema(): Promise<object> {
    if (!this.client) await this.connect();
    const bucket = this.#getBucket();
    const payloadObject = {
      ...this.payload,
      bucket,
    };

    return (
      this.client?.send(
        new ListObjectsV2Command({
          Bucket: payloadObject.bucket,
          Prefix: payloadObject.key ?? '',
          MaxKeys: payloadObject.maxResults ?? 100,
          // Delimiter: '/',
        })
      ) ?? {}
    );
  }
  async close(): Promise<void> {
    if (!this.client) return;
    await this.safeClose(
      () => this.client?.destroy(),
      () => this.client?.destroy(),
      2000
    );
    this.client = undefined;
  }
}
