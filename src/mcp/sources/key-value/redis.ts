import { createClient, RedisArgument, SetOptions } from 'redis';
import { z } from 'zod';
import { ActionReturnType, DataSource, PayloadDescription } from '../../database-source.js';

export interface RedisConfig {
  url?: string;
  socket?: {
    host?: string;
    port?: number;
    path?: string;
  };
  username?: string;
  password?: string;
}

/**
 * These methods can only be called on an 'insert' operation and will throw if used with a different method type.
 */
const REDIS_INSERT_METHODS = ['in', 'hIn', 'mSet'] as const;
/**
 * These methods can only be called on an 'update' operation and will throw if used with a different method type.
 */
const REDIS_UPDATE_METHODS = [
  'up',
  'incr',
  'incrBy',
  'decr',
  'decrBy',
  'append',
  'hIncr',
  'hDecr',
  'hIncrBy',
  'hDecrBy',
  'expire',
  'persist',
] as const;
/**
 * These methods can only be called on a 'select' operation and will throw if used with a different method type.
 */
const REDIS_SELECT_METHODS = ['get', 'hGet', 'hGetAll', 'exists', 'keys', 'hExists', 'mGet', 'type'] as const;
/**
 * These methods can only be called on a 'delete' operation and will throw if used with a different method type.
 */
const REDIS_DELETE_METHODS = ['del', 'hDel'] as const;

const REDIS_METHODS = [
  ...REDIS_INSERT_METHODS,
  ...REDIS_UPDATE_METHODS,
  ...REDIS_SELECT_METHODS,
  ...REDIS_DELETE_METHODS,
] as const;

type RedisMethod = (typeof REDIS_METHODS)[number];

export interface RedisPayload {
  key: string | string[];
  method?: RedisMethod;
  setOptions?: SetOptions;
  value?: RedisArgument | number | Record<string, RedisArgument>;
  hField?: RedisArgument; // For hash operations, the field name in the hash
  hValue?: RedisArgument; // For hash operations, the field value
  schemaSampleStartIndex?: number;
  maxKeysToShow?: number;
}

export class Redis<P extends RedisPayload> extends DataSource<P, RedisConfig> {
  private client!: ReturnType<typeof createClient>;

  async connect(): Promise<void> {
    this.client = createClient({
      ...this.connectionConfig.options,
      socket: {
        timeout: 5000, // Set a timeout for socket operations
        connectTimeout: 5000,
        ...this.connectionConfig.options?.socket,
      },
    });

    const cleanup = () => {
      this.client.off('error', onError);
    };

    const onError = (err: any) => {
      console.error('Redis client error:', err?.message ?? err);
    };

    this.client.on('error', onError);

    const connectPromise = this.client.connect();
    const timeoutPromise = new Promise<void>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Redis connection timed out after 5000ms'));
      }, 5000);
      if (typeof (timer as any).unref === 'function') (timer as any).unref();
    });

    try {
      await Promise.race([connectPromise, timeoutPromise]);
    } catch (error) {
      try {
        await this.client.disconnect();
      } catch {
        this.client.destroy();
      }
      throw new Error(`Redis connection failed: ${(error as Error).message}`);
    } finally {
      cleanup();
    }
  }

  async close(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.disconnect();
    } catch {
      this.client.destroy();
    }
  }
  describePayload(): PayloadDescription<RedisPayload> {
    return {
      key: z.union([z.string(), z.array(z.string())]).describe('The key or keys to operate on.'),
      method: z
        .enum(REDIS_METHODS)
        .optional()
        .describe(
          [
            'The Redis command to execute. Supported methods:',
            '',
            '- Insert:',
            "  - 'in' (set a key)",
            "  - 'hIn' (set a hash field)",
            "  - 'mSet' (set multiple keys)",
            '- Update:',
            "  - 'up' (update a key)",
            "  - 'incr' (increment a key)",
            "  - 'incrBy' (increment a key by a value)",
            "  - 'decr' (decrement a key)",
            "  - 'decrBy' (decrement a key by a value)",
            "  - 'append' (append to a key)",
            "  - 'hIncr' (increment a hash field)",
            "  - 'hDecr' (decrement a hash field)",
            "  - 'hIncrBy' (increment a hash field by a value)",
            "  - 'hDecrBy' (decrement a hash field by a value)",
            "  - 'expire' (set key expiration)",
            "  - 'persist' (remove key expiration)",
            '- Select:',
            "  - 'get' (get a key)",
            "  - 'hGet' (get a hash field)",
            "  - 'hGetAll' (get all fields in a hash)",
            "  - 'exists' (check if a key exists)",
            "  - 'keys' (list keys by pattern)",
            "  - 'hExists' (check if a hash field exists)",
            "  - 'mGet' (get multiple keys)",
            "  - 'type' (get the type of a key)",
            '- Delete:',
            "  - 'del' (delete a key)",
            "  - 'hDel' (delete a hash field)",
          ].join('\n'),
        ),
      hValue: z
        .string()
        .optional()
        .describe(
          'The value for hash field operations (hIncr, hDecr, hIncrBy, hDecrBy). Represents the field name in the hash.',
        ),
      hField: z.string().optional().describe('The field name in the hash for hash operations.'),
      setOptions: z
        .object({
          EX: z.number().optional().describe('Set the specified expire time, in seconds.'),
          PX: z.number().optional().describe('Set the specified expire time, in milliseconds.'),
          EXAT: z.number().optional().describe('Set the specified absolute expire time, in seconds since Unix epoch.'),
          PXAT: z
            .number()
            .optional()
            .describe('Set the specified absolute expire time, in milliseconds since Unix epoch.'),
          KEEPTTL: z.boolean().optional().describe('Retain the time to live associated with the key.'),
          condition: z
            .enum(['NX', 'XX', 'IFEQ', 'IFNE', 'IFDEQ', 'IFDNE'])
            .optional()
            .describe(
              'Condition for setting the key: NX (set if key does not exist), XX (set if key already exists), IFEQ (set if current value equals match-value), IFNE (set if current value does not equal match-value), IFDEQ (set if current value digest equals match-digest), IFDNE (set if current value digest does not equal match-digest).',
            ),
          matchValue: z
            .string()
            .optional()
            .describe(
              'Value or digest to compare against. Required when using IFEQ, IFNE, IFDEQ, or IFDNE conditions.',
            ),
        })
        .optional()
        .describe('Optional settings for the SET command.'),
      value: z
        .union([z.string(), z.record(z.string(), z.any())])
        .optional()
        .describe('The value to set for the key (required for SET/mset command).'),
      schemaSampleStartIndex: z
        .number()
        .optional()
        .describe('The starting index for sampling keys when inspecting the schema. Default is 0.'),
      maxKeysToShow: z
        .number()
        .optional()
        .describe('The maximum number of keys to show when inspecting the schema. Default is 100.'),
    };
  }
  async select(): Promise<ActionReturnType> {
    if (!this.isSelect())
      throw new Error(
        this.getPayloadInvalidValueError({
          key: 'method',
          message: 'This is the incorrect method for a select operation.',
        }),
      );
    const { method, key, value, hField } = this.payload;
    // Make sure key is provided
    if (typeof key === 'undefined')
      throw new Error(
        this.getPayloadMissingKeyError({ key: 'key', message: 'Key is required for select operations.' }),
      );
    // Make sure key is the correct type for the method
    if (
      typeof key !== 'string' ||
      (method === 'mGet' && (!Array.isArray(key) || !key.every(k => typeof k === 'string')))
    )
      throw new Error(
        this.getPayloadInvalidValueError({
          key: 'key',
          message: 'Key must be a string or an array of strings for select operations.',
        }),
      );
    switch (method) {
      case 'get':
        return (await this.client.get(key)) ?? '';
      case 'exists':
        return (await this.client.exists(key)) === 1;
      case 'keys':
        return await this.client.keys(key);
      case 'hGet':
        if (typeof hField !== 'string')
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'hField',
              message: 'hField is required for hGet method as the field name to retrieve.',
            }),
          );
        return await this.client.hGet(key, hField);
      case 'hGetAll':
        return await this.client.hGetAll(key);
      case 'hExists':
        if (typeof hField !== 'string')
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'hField',
              message: 'hField is required for hExists method as the field name to check.',
            }),
          );
        return (await this.client.hExists(key, hField)) === 1;
      case 'mGet':
        if (!Array.isArray(key) || !key.every(k => typeof k === 'string'))
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'key',
              message: 'Key must be an array of strings for mGet method.',
            }),
          );
        return await this.client.mGet(key);
      case 'type':
        return await this.client.type(key);
      default:
        throw new Error(`Unsupported method for select: ${method}`);
    }
  }
  async insert(): Promise<ActionReturnType> {
    const { key, value, hValue, setOptions } = this.payload;

    if (!this.isInsert())
      throw new Error(
        this.getPayloadInvalidValueError({
          key: 'method',
          message: 'This is the incorrect method for an insert operation.',
        }),
      );
    if (typeof key === 'undefined')
      throw new Error(
        this.getPayloadMissingKeyError({ key: 'key', message: 'Key is required for insert operations.' }),
      );
    if (typeof key !== 'string')
      throw new Error(
        this.getPayloadInvalidValueError({ key: 'key', message: 'Key must be a string for insert operations.' }),
      );
    if (this.payload.method === 'hIn') {
      if (typeof hValue === 'undefined')
        throw new Error(
          this.getPayloadMissingKeyError({
            key: 'hValue',
            message: 'hValue is required for hIn method as the field name in the hash.',
          }),
        );
      if (typeof value === 'undefined' || (typeof value !== 'string' && !Buffer.isBuffer(value)))
        throw new Error(
          this.getPayloadInvalidValueError({
            key: 'value',
            message: 'Value must be a string or buffer for hIn method as the field value in the hash.',
          }),
        );
      await this.client.hSet(key, hValue, value);
      return true;
    } else if (this.payload.method === 'mSet') {
      if (typeof value !== 'object' || Array.isArray(value) || value === null || Buffer.isBuffer(value))
        throw new Error(
          this.getPayloadInvalidValueError({
            key: 'value',
            message: 'Value must be a plain object for mSet method.',
          }),
        );
      await this.client.mSet(value);
      return true;
    } else {
      if (typeof value === 'undefined' || (typeof value !== 'string' && !Buffer.isBuffer(value)))
        throw new Error(
          this.getPayloadInvalidValueError({
            key: 'value',
            message: 'Value must be a string or buffer for in method',
          }),
        );
      await this.client.set(key, value, setOptions);
      return true;
    }
  }
  async update(): Promise<ActionReturnType> {
    const { method, key, value, hValue, setOptions } = this.payload;

    if (!this.isUpdate())
      throw new Error(
        this.getPayloadInvalidValueError({
          key: 'method',
          message: 'This is the incorrect method for an update operation.',
        }),
      );

    if (typeof key === 'undefined')
      throw new Error(
        this.getPayloadMissingKeyError({ key: 'key', message: 'Key is required for update operations.' }),
      );

    if (typeof key !== 'string')
      throw new Error(
        this.getPayloadInvalidValueError({ key: 'key', message: 'Key must be a string for update operations.' }),
      );

    switch (method) {
      case 'up':
        if (typeof value === 'undefined' || (typeof value !== 'string' && !Buffer.isBuffer(value)))
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'value',
              message: 'Value must be a string or buffer for up method.',
            }),
          );
        await this.client.set(key, value, setOptions);
        return true;
      case 'incr':
        await this.client.incr(key);
        return true;
      case 'incrBy':
        if (typeof value !== 'number')
          throw new Error(
            this.getPayloadInvalidValueError({ key: 'value', message: 'Value must be a number for incrBy method.' }),
          );
        await this.client.incrBy(key, value);
        return true;
      case 'decr':
        await this.client.decr(key);
        return true;
      case 'decrBy':
        if (typeof value !== 'number')
          throw new Error(
            this.getPayloadInvalidValueError({ key: 'value', message: 'Value must be a number for decrBy method.' }),
          );
        await this.client.decrBy(key, value);
        return true;
      case 'append':
        if (typeof value !== 'string')
          throw new Error(
            this.getPayloadInvalidValueError({ key: 'value', message: 'Value must be a string for append method.' }),
          );
        await this.client.append(key, value);
        return true;
      case 'hIncr':
        if (typeof hValue === 'undefined')
          throw new Error(
            this.getPayloadMissingKeyError({ key: 'hValue', message: 'hValue is required for hIncr method.' }),
          );
        await this.client.hIncrBy(key, hValue, 1);
        return true;
      case 'hDecr':
        if (typeof hValue === 'undefined')
          throw new Error(
            this.getPayloadMissingKeyError({ key: 'hValue', message: 'hValue is required for hDecr method.' }),
          );
        await this.client.hIncrBy(key, hValue, -1);
        return true;
      case 'hIncrBy':
        if (typeof hValue === 'undefined' || typeof value !== 'number')
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'value',
              message: 'hValue and numeric value are required for hIncrBy.',
            }),
          );
        await this.client.hIncrBy(key, hValue, value);
        return true;
      case 'hDecrBy':
        if (typeof hValue === 'undefined' || typeof value !== 'number')
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'value',
              message: 'hValue and numeric value are required for hDecrBy.',
            }),
          );
        await this.client.hIncrBy(key, hValue, -value);
        return true;
      case 'expire':
        if (typeof value !== 'number')
          throw new Error(
            this.getPayloadInvalidValueError({
              key: 'value',
              message: 'Value must be a number (seconds) for expire method.',
            }),
          );
        await this.client.expire(key, value);
        return true;
      case 'persist':
        await this.client.persist(key);
        return true;
      default:
        throw new Error(`Unsupported update method: ${method}`);
    }
  }
  async delete(): Promise<ActionReturnType> {
    const { key, hField } = this.payload;

    if (!this.isDelete())
      throw new Error(
        this.getPayloadInvalidValueError({
          key: 'method',
          message: 'This is the incorrect method for a delete operation.',
        }),
      );

    if (typeof key === 'undefined')
      throw new Error(
        this.getPayloadMissingKeyError({ key: 'key', message: 'Key is required for delete operations.' }),
      );
    if (typeof key !== 'string')
      throw new Error(
        this.getPayloadInvalidValueError({ key: 'key', message: 'Key must be a string for delete operations.' }),
      );

    const exists = await this.client.exists(key);
    if (!exists) throw new Error(`Key "${key}" does not exist for delete.`);
    if (this.payload.method === 'hDel') {
      if (typeof hField === 'undefined')
        throw new Error(
          this.getPayloadMissingKeyError({ key: 'hField', message: 'hField is required for hDel operations.' }),
        );
      if (typeof hField !== 'string')
        throw new Error(
          this.getPayloadInvalidValueError({ key: 'hField', message: 'hField must be a string for hDel operations.' }),
        );
      if (!(await this.client.hExists(key, hField)))
        throw new Error(`Field "${hField}" does not exist in hash "${key}" for delete.`);
      await this.client.hDel(key, hField);
    } else {
      await this.client.del(key);
    }
    return true;
  }
  async mutation(): Promise<ActionReturnType> {
    if (this.isSelect()) return this.select();
    if (this.isInsert()) return this.insert();
    if (this.isDelete()) return this.delete();
    if (this.isUpdate()) return this.update();

    throw new Error(this.getPayloadInvalidValueError({ key: 'method', message: 'Invalid method for mutation.' }));
  }
  isMutation(): boolean {
    return this.isInsert() || this.isDelete() || this.isUpdate();
  }
  isSelect(): boolean {
    const method = this.payload.method;
    return typeof method === 'string' && (REDIS_SELECT_METHODS as readonly string[]).includes(method);
  }
  isInsert(): boolean {
    const method = this.payload.method;
    return typeof method === 'string' && (REDIS_INSERT_METHODS as readonly string[]).includes(method);
  }
  isUpdate(): boolean {
    const method = this.payload.method;
    return typeof method === 'string' && (REDIS_UPDATE_METHODS as readonly string[]).includes(method);
  }
  isDelete(): boolean {
    const method = this.payload.method;
    return typeof method === 'string' && (REDIS_DELETE_METHODS as readonly string[]).includes(method);
  }
  async showSchema(): Promise<ActionReturnType> {
    // Redis is a key-value store and does not have a schema in the traditional sense, but we can return some basic information about the keys.
    const keys = await this.client.keys('*');
    const start = this.payload.schemaSampleStartIndex ?? 0;
    const keyCount = this.payload.maxKeysToShow ?? 100;
    return {
      totalKeys: keys.length,
      sampleKeys: keys.slice(start, start + keyCount), // Return a sample of keys
    };
  }
}
