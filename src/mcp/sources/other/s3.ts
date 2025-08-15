import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import z from 'zod';
import { UnknownDataSource, type ActionRequest, type PayloadDescription } from '../../database-source.js';

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

export class S3Source<P extends S3Payload> extends UnknownDataSource {
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
  #getPayloadError() {
    return `A valid \`payload\` key should be formatted as an object like this:
    {
      "method": "GET" | "SELECT" | "INSERT" | "UPDATE" | "DELETE", // Required
      "bucket": "your-bucket-name", // Required
      "key": "path/to/your/object", // Required for SELECT, INSERT, UPDATE, DELETE
      "sourceType": "path" | "raw", // Optional, used for INSERT, UPDATE
      "sourceValue": "path/to/your/file" // Optional, used for INSERT
    }`;
  }
  #getBucket(request: ActionRequest<P>) {
    const payloadObject = this.getPayloadObject(request);
    return payloadObject.bucket ?? this.connectionConfig.options.bucket ?? '';
  }
  #validatePayload(request: ActionRequest<P>) {
    const bucket = this.#getBucket(request);
    const payloadObject = this.getPayloadObject(request);
    if (!bucket) throw new Error(`Missing key \`bucket\`.\n${this.#getPayloadError()}`);
    if (!payloadObject.key) throw new Error(`Missing key \`key\`.\n${this.#getPayloadError()}`);
    if (!payloadObject.method) throw new Error(`Missing key \`method\`.\n${this.#getPayloadError()}`);

    if (payloadObject.method === 'INSERT' || payloadObject.method === 'UPDATE') {
      if (!payloadObject.sourceType) throw new Error(`Missing key \`sourceType\`.\n${this.#getPayloadError()}`);
      if (!payloadObject.sourceValue) throw new Error(`Missing key \`sourceValue\`.\n${this.#getPayloadError()}`);
    }

    return {
      ...payloadObject,
      bucket,
    };
  }
  describePayload(): PayloadDescription {
    return {
      method: z.enum(['GET', 'SELECT', 'INSERT', 'UPDATE', 'DELETE']),
      bucket: z.string(),
      key: z.string(),
      sourceType: z.enum(['path', 'raw']),
      sourceValue: z.string(),
      maxResults: z.number().min(1).default(100),
    };
  }
  connect(): Promise<void> {
    this.client = this.#getS3Client();
    return Promise.resolve();
  }
  async select(request: ActionRequest<P>): Promise<unknown> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload(request);

    if (payloadObject.method === 'SELECT') return this.showSchema(request);

    const result = await this.client?.send(
      new GetObjectCommand({
        Bucket: payloadObject.bucket,
        Key: payloadObject.key,
      })
    );

    return {
      bodyString: await result?.Body?.transformToString(),
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
  mutation(request: ActionRequest<P>): Promise<unknown> {
    const payloadObject = this.#validatePayload(request);
    if (payloadObject.method === 'SELECT') return this.select(request);
    else if (payloadObject.method === 'GET') return this.select(request);
    else if (payloadObject.method === 'INSERT') return this.insert(request);
    else if (payloadObject.method === 'UPDATE') return this.update(request);
    else if (payloadObject.method === 'DELETE') return this.delete(request);

    throw new Error(
      `Unsupported method: ${payloadObject.method} expected \`GET\`, \`SELECT\`, \`INSERT\`, \`UPDATE\`, or \`DELETE\`.`
    );
  }
  async insert(request: ActionRequest<P>): Promise<unknown> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload(request);
    if (!['INSERT', 'UPDATE'].includes(payloadObject.method))
      throw new Error(`Invalid method \`method\`.\n${this.#getPayloadError()}`);

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
  update(request: ActionRequest<P>): Promise<unknown> {
    return this.insert(request);
  }
  async delete(request: ActionRequest<P>): Promise<unknown> {
    if (!this.client) await this.connect();
    const payloadObject = this.#validatePayload(request);
    if (payloadObject.method !== 'DELETE') throw new Error(`Invalid method \`method\`.\n${this.#getPayloadError()}`);
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
  async showSchema(request: ActionRequest<P>): Promise<unknown> {
    if (!this.client) await this.connect();
    const bucket = this.#getBucket(request);
    const object = this.getPayloadObject(request);
    const payloadObject = {
      ...object,
      bucket,
    };

    return this.client?.send(
      new ListObjectsV2Command({
        Bucket: payloadObject.bucket,
        Prefix: payloadObject.key ?? '',
        MaxKeys: payloadObject.maxResults ?? 100,
        // Delimiter: '/',
      })
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
